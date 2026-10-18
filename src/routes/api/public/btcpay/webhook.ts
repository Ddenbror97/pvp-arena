import { createFileRoute } from "@tanstack/react-router";

const MAX_BODY = 32_768;

export const Route = createFileRoute("/api/public/btcpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > MAX_BODY) return new Response("Payload too large", { status: 413 });
        const { readBtcpayConfig, readBtcpayPayoutConfig } =
          await import("@/lib/crypto/btcpay/config.server");
        const { verifyBtcpaySignature } = await import("@/lib/crypto/btcpay/hmac");
        const deposit = readBtcpayConfig();
        const payout = readBtcpayPayoutConfig();
        const depositOn = deposit.ok && deposit.enabled;
        const payoutOn = payout.ok && payout.enabled;
        if (!depositOn && !payoutOn) return new Response("Unavailable", { status: 503 });
        const header = request.headers.get("BTCPay-Sig");
        const depositSigned = depositOn
          ? await verifyBtcpaySignature(deposit.webhookSecret, raw, header)
          : false;
        const payoutSigned = payoutOn
          ? await verifyBtcpaySignature(payout.webhookSecret, raw, header)
          : false;
        if (!depositSigned && !payoutSigned) return new Response("Unauthorized", { status: 401 });
        let body: { type?: unknown; invoiceId?: unknown; payoutId?: unknown; storeId?: unknown };
        try {
          body = JSON.parse(raw) as {
            type?: unknown;
            invoiceId?: unknown;
            payoutId?: unknown;
            storeId?: unknown;
          };
        } catch {
          return new Response("Bad payload", { status: 400 });
        }
        const stores = new Set<string>();
        if (depositOn) stores.add(deposit.storeId);
        if (payoutOn) stores.add(payout.storeId);
        const storeId = typeof body.storeId === "string" ? body.storeId : "";
        if (storeId && !stores.has(storeId)) return new Response("Unauthorized", { status: 401 });
        if (storeId && depositOn && storeId === deposit.storeId && !depositSigned) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (storeId && payoutOn && storeId === payout.storeId && !payoutSigned) {
          return new Response("Unauthorized", { status: 401 });
        }
        const type = typeof body.type === "string" ? body.type : "";
        const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
        const payoutId = typeof body.payoutId === "string" ? body.payoutId : "";
        // Greenfield retries 5xx, 408, and 429, and a failed delivery holds that
        // store's webhook queue. 4xx other than those is not retried. Acknowledge
        // only after reconcile returns. A throw means nothing durable happened,
        // so ask BTCPay to retry. Credit and settlement stay idempotent.
        let retry = false;
        if (
          depositOn &&
          depositSigned &&
          invoiceId &&
          [
            "InvoiceSettled",
            "InvoiceProcessing",
            "InvoiceExpired",
            "InvoiceInvalid",
            "InvoiceReceivedPayment",
            "InvoicePaymentSettled",
          ].includes(type)
        ) {
          const { reconcileByBtcpayId } = await import("@/lib/crypto/btcpay/reconcile.server");
          try {
            await reconcileByBtcpayId(invoiceId, deposit.storeId);
          } catch {
            console.error("[btcpay] WEBHOOK_RECONCILE_FAILED", { kind: "invoice" });
            retry = true;
          }
        }
        if (payoutOn && payoutSigned && payoutId && /Payout/i.test(type)) {
          const { reconcileByPayoutId } = await import("@/lib/crypto/btcpay/payout.server");
          try {
            await reconcileByPayoutId(payoutId, payout.storeId);
          } catch {
            console.error("[btcpay] WEBHOOK_RECONCILE_FAILED", { kind: "payout" });
            retry = true;
          }
        }
        if (retry) return new Response("Retry", { status: 503 });
        return Response.json({ ok: true });
      },
    },
  },
});
