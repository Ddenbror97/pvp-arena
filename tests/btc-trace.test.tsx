import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BitcoinTxTrace } from "../src/components/wallet/BitcoinTxTrace";
import { DepositAddress } from "../src/components/wallet/DepositAddress";
import { fundingEvents } from "../src/components/wallet/WalletActivity";
import { parseCryptoActivity } from "../src/components/wallet/RailPreference";
import {
  bitcoinTxid,
  fundingExplorerHref,
  mempoolTxUrl,
  traceablePaymentTxid,
} from "../src/lib/crypto/btc-trace";
import type { BtcPayment } from "../src/lib/crypto/btcpay/policy";

const TX = "ab".repeat(32);
const OTHER = "cd".repeat(32);

function payment(overrides: Partial<BtcPayment> = {}): BtcPayment {
  return { method: "BTC", status: "Settled", txid: TX, vout: 0, sats: 1n, ...overrides };
}

describe("bitcoin transaction trace", () => {
  it("accepts only a 64-hex mainnet id and builds a mempool.space url", () => {
    expect(bitcoinTxid(`  ${TX.toUpperCase()} `)).toBe(TX);
    expect(bitcoinTxid(`0x${TX}`)).toBeNull();
    expect(bitcoinTxid(`${TX}00`)).toBeNull();
    expect(bitcoinTxid("not-a-txid")).toBeNull();
    expect(mempoolTxUrl(TX)).toBe(`https://mempool.space/tx/${TX}`);
    expect(mempoolTxUrl("javascript:alert(1)")).toBeNull();
    expect(mempoolTxUrl(`https://mempool.space/tx/${TX}`)).toBeNull();
  });

  it("follows a confirming on-chain payment and skips lightning or invalid outputs", () => {
    expect(
      traceablePaymentTxid(
        [payment(), payment({ status: "Processing", txid: OTHER, vout: 1 })],
        "BTC",
      ),
    ).toBe(OTHER);
    expect(traceablePaymentTxid([payment({ status: "Invalid" })], "BTC")).toBeNull();
    expect(traceablePaymentTxid([payment({ method: "BTC-LN" })], "BTC")).toBeNull();
    expect(traceablePaymentTxid([payment({ txid: "zz".repeat(32) })], "BTC")).toBeNull();
    expect(traceablePaymentTxid(null, "BTC")).toBeNull();
  });

  it("sends bitcoin rows to mempool and evm rows to their chain explorer", () => {
    expect(fundingExplorerHref(TX, null)).toBe(`https://mempool.space/tx/${TX}`);
    expect(fundingExplorerHref(`0x${TX}`, 8453)).toBe(`https://basescan.org/tx/0x${TX}`);
    expect(fundingExplorerHref(`0x${TX}`, 1)).toBe(`https://etherscan.io/tx/0x${TX}`);
    expect(fundingExplorerHref(`0x${TX}`, null)).toBe(`https://basescan.org/tx/0x${TX}`);
    expect(fundingExplorerHref("nope", null)).toBeNull();
  });

  it("keeps a bad id off the activity row and links a real one", () => {
    const activity = parseCryptoActivity({
      bitcoin: [
        {
          id: "inv",
          usd_cents: 1000,
          status: "CREDITED",
          created_at: "2026-10-21T00:00:00.000Z",
          btc_due: "0.0001",
          required_confirmations: 2,
          txid: TX,
        },
      ],
      bitcoin_payouts: [
        {
          id: "pay",
          usd_cents: 2500,
          status: "COMPLETED",
          created_at: "2026-10-21T01:00:00.000Z",
          address: "bc1qexampleaddress",
          payout_txid: OTHER,
        },
      ],
    });
    expect(activity.bitcoin[0]?.txid).toBe(TX);
    expect(activity.bitcoinPayouts[0]?.txid).toBe(OTHER);
    const dropped = parseCryptoActivity({
      bitcoin: [
        {
          id: "inv",
          usd_cents: 1000,
          status: "PROCESSING",
          created_at: "2026-10-21T00:00:00.000Z",
          txid: "nope",
        },
      ],
      bitcoin_payouts: [
        {
          id: "pay",
          usd_cents: 2500,
          status: "PROCESSING",
          created_at: "2026-10-21T01:00:00.000Z",
          address: "bc1qexampleaddress",
          payout_txid: `0x${TX}`,
        },
      ],
    });
    expect(dropped.bitcoin[0]?.txid).toBeNull();
    expect(dropped.bitcoinPayouts[0]?.txid).toBeNull();
    const events = fundingEvents(activity);
    expect(events.find((event) => event.title === "BTC deposit")?.txHash).toBe(TX);
    expect(events.find((event) => event.title === "BTC cashout")?.txHash).toBe(OTHER);
  });

  it("adds one sentence under the existing deposit card", () => {
    const link = renderToStaticMarkup(<BitcoinTxTrace txid={TX} />);
    expect(link).toContain("Trace your transaction");
    expect(link).toContain(`href="https://mempool.space/tx/${TX}"`);
    expect(link).toContain(">here<");
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noreferrer"');
    expect(renderToStaticMarkup(<BitcoinTxTrace txid={null} />)).toBe("");
    expect(renderToStaticMarkup(<BitcoinTxTrace txid={`0x${TX}`} />)).toBe("");

    const card = renderToStaticMarkup(
      <DepositAddress
        network="Bitcoin network"
        address="bc1qexampleaddress"
        qr=""
        note=""
        copiedLabel="Bitcoin address copied"
        extra={<BitcoinTxTrace txid={TX} />}
      >
        <span>Amount</span>
      </DepositAddress>,
    );
    expect(card).toContain("bc1qexampleaddress");
    expect(card).toContain("Amount");
    expect(card).toContain("Trace your transaction");
    const plain = renderToStaticMarkup(
      <DepositAddress
        network="Bitcoin network"
        address="bc1qexampleaddress"
        qr=""
        note="Send exactly 0.001 BTC to this address."
        copiedLabel="Bitcoin address copied"
      />,
    );
    expect(plain).toContain("Send exactly 0.001 BTC");
    expect(plain).not.toContain("Trace your transaction");
  });

  it("exposes txids from the read-only activity function", () => {
    const sql = readFileSync("supabase/migrations/20261021154208_btc_tx_trace.sql", "utf8");
    expect(sql.toLowerCase()).toContain("stable");
    expect(sql).toContain("security definer");
    expect(sql).toContain("_withdraw_basis_peek");
    expect(sql).toContain("p.payout_txid");
    expect(sql).toContain("btcpay_deposit_outputs");
    expect(sql).toContain("bitcoin_payouts");
    expect(sql).not.toMatch(/_withdraw_basis\s*\(/);
    expect(sql).not.toContain("btcpay_credit_received");
  });
});
