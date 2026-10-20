import { describe, expect, it } from "vitest";
import { selectDepositNotice } from "../src/lib/crypto/deposit-notice";
import { selectWithdrawalNotice } from "../src/lib/crypto/withdraw-notice";

const now = Date.parse("2026-10-18T19:06:00Z");

function row(status: string, usd = 96) {
  return {
    id: "efe102db-b4fb-40f9-9a5c-1a063ca0fb52",
    status,
    usd_cents: usd,
    asset_key: "ETH",
    at: "2026-10-18T18:59:01.383Z",
    networkMode: "mainnet",
  };
}

describe("deposit notice", () => {
  it("does not send an under-minimum ETH deposit to review", () => {
    const notice = selectDepositNotice({
      deposits: [row("REJECTED")],
      baselineCredited: new Set(),
      dismissed: new Set(),
      submitted: null,
      now,
    });
    expect(notice?.title).toBe("Under the minimum");
    expect(notice?.body).toContain("not added");
    expect(notice?.body).not.toContain("review");
    expect(notice?.amount).toBe("$0.96 ETH");
  });

  it("still asks for a review when the sender cannot be matched", () => {
    const notice = selectDepositNotice({
      deposits: [row("UNMATCHED", 150)],
      baselineCredited: new Set(),
      dismissed: new Set(),
      submitted: null,
      now,
    });
    expect(notice?.title).toBe("Deposit needs review");
  });

  it("uses the same confirmed wording once the deposit is in the balance", () => {
    const notice = selectDepositNotice({
      deposits: [row("CREDITED", 219)],
      baselineCredited: new Set(),
      dismissed: new Set(),
      submitted: null,
      now,
    });
    expect(notice?.phase).toBe("confirmed");
    expect(notice?.title).toBe("Deposit confirmed");
    expect(notice?.body).toBe("Added to your balance.");
    expect(notice?.amount).toBe("$2.19 ETH");
  });
});

describe("cash out notice", () => {
  const cashout = {
    id: "cashout-1",
    status: "CONFIRMED",
    usd_cents: 200,
    asset: "ETH",
    network: "base" as const,
    at: "2026-10-18T19:00:00Z",
  };

  it("says the cash out confirmed in the same shape as a deposit", () => {
    const notice = selectWithdrawalNotice({
      withdrawals: [cashout],
      baselineSent: new Set(),
      baselineProblem: new Set(),
      dismissed: new Set(),
      submitted: null,
      now,
    });
    expect(notice?.phase).toBe("confirmed");
    expect(notice?.title).toBe("Cash out confirmed");
    expect(notice?.body).toBe("Sent to your linked wallet.");
    expect(notice?.amount).toBe("$2.00 ETH");
  });
});
