/**
 * Bitcoin conditions an operator has to look at. Each is written to the Worker log, as before,
 * and recorded as an incident so it shows under Alerts in the admin wallet panel (which lists
 * incidents named `crypto…`). One incident a subject: a repeat only counts up.
 *
 * Recording is best effort and never throws: an alert that cannot be stored must not change
 * what happens to the payment it is about.
 */
export type BtcAlert =
  | "BTC_PAYOUT_UNRESOLVED"
  | "BTC_PAYOUT_HOLD_AGED"
  | "BTC_PAYOUT_AMOUNT_MISMATCH"
  | "BTC_PAYOUT_PROOF_MISSING"
  | "BTC_PAYOUT_WAITING"
  | "BTC_DEPOSIT_REVIEW"
  | "BTC_SWEEP_UNRESOLVED"
  | "BTC_TREASURY_UNREAD"
  | "BTC_INVOICE_FAILED";

type Fields = Record<string, string | number | null>;

export async function btcAlert(code: BtcAlert, subject: string, fields: Fields): Promise<void> {
  console.error("[btcpay]", code, { subject, ...fields });
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (
      supabaseAdmin as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ error: { message: string } | null }>;
      }
    ).rpc("crypto_raise_incident", {
      p_check: `crypto_${code.toLowerCase()}`,
      p_fp: `crypto_${code.toLowerCase()}:${subject}`,
      p_details: { subject, ...fields },
    });
    if (error) console.error("[btcpay] ALERT_NOT_RECORDED", code);
  } catch {
    console.error("[btcpay] ALERT_NOT_RECORDED", code);
  }
}

/** Today's date (UTC): the subject of an alert that should count up through a day, not a minute. */
export function alertDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** What a failed BTCPay call was, without its URL or key: an HTTP status, or no answer at all. */
export function btcpayFailure(error: unknown): string {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number") return `http_${status}`;
  return error instanceof Error && error.message === "BTCPAY_UNREACHABLE" ? "no_answer" : "error";
}
