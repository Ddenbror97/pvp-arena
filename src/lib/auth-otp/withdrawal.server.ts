// Email step-up for withdrawals. Every withdrawal needs a fresh code sent to the account email,
// and the code is bound to the exact amount and destination it was issued for.
import { accountEmail } from "./account.server";
import { issueCode, rpc, sendNotice } from "./issue.server";
import {
  WITHDRAWAL_PURPOSE,
  isOtpFormat,
  otpDigest,
  withdrawalBinding,
  withdrawalScope,
  type WithdrawalTarget,
} from "./otp";
import { verifyFailure } from "./signup.server";
import { workerEnv } from "@/lib/worker-env";

export type CodeStart =
  { ok: true; challengeId: string; maskedEmail: string } | { ok: false; error: string };

const NETWORKS: Record<number, string> = { 1: "Ethereum", 8453: "Base", 84532: "Base Sepolia" };
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export const PARTNER_BLOCKED =
  "You cant withdraw right now, try again later";

function describe(_userId: string, t: WithdrawalTarget): string[] {
  if (t.rail === "btc") return [`Amount: ${usd(t.usdCents)} in BTC`, `To: ${t.address.trim()}`];
  return [
    `Amount: ${usd(t.usdCents)} in ${t.asset.toUpperCase()}`,
    `Network: ${NETWORKS[t.chainId] ?? `chain ${t.chainId}`}`,
    `To: ${t.address.trim()}`,
  ];
}

export async function startWithdrawalCode(input: {
  userId: string;
  target: WithdrawalTarget;
  ip: string | null;
  ua: string | null;
}): Promise<CodeStart> {
  if (await rpc<boolean>("partner_withdrawal_check", { p_user: input.userId })) {
    return { ok: false, error: PARTNER_BLOCKED };
  }
  const account = await accountEmail(input.userId);
  if (!account?.confirmed) {
    return {
      ok: false,
      error: "Confirm an email on your account before withdrawing. Codes are sent there.",
    };
  }
  const scope = withdrawalScope(input.target);
  return issueCode({
    userId: input.userId,
    email: account.email,
    purpose: WITHDRAWAL_PURPOSE,
    kind: "withdrawal_code",
    ip: input.ip,
    ua: input.ua,
    requestId: crypto.randomUUID(),
    bind: (id) => withdrawalBinding(id, scope),
    detail: describe(input.userId, input.target),
  });
}

/** Consumes the code. It must belong to this user and match this exact withdrawal. */
export async function verifyWithdrawalCode(input: {
  userId: string;
  challengeId: string;
  code: string;
  target: WithdrawalTarget;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isOtpFormat(input.code))
    return { ok: false, error: "Enter the 6-digit code from your email." };
  const pepper = workerEnv("OTP_PEPPER");
  if (!pepper) throw new Error("Missing server configuration: OTP_PEPPER");
  const binding = withdrawalBinding(input.challengeId, withdrawalScope(input.target));
  const r = await rpc<{ ok: boolean; reason?: string; user_id?: string }>("otp_verify", {
    p_id: input.challengeId,
    p_purpose: WITHDRAWAL_PURPOSE,
    p_digest: await otpDigest(pepper, WITHDRAWAL_PURPOSE, binding, input.code),
    p_request: crypto.randomUUID(),
  });
  if (!r.ok || r.user_id !== input.userId) return verifyFailure(r.reason);
  return { ok: true };
}

export async function noticeWithdrawal(
  userId: string,
  withdrawalId: string,
  target: WithdrawalTarget,
) {
  const account = await accountEmail(userId).catch(() => null);
  if (!account) return;
  await sendNotice(
    account.email,
    "withdrawal_requested",
    `withdrawal-notice:${withdrawalId}`,
    await describe(userId, target),
  );
}

export async function noticeWalletLinked(userId: string, address: string, key: string) {
  const account = await accountEmail(userId).catch(() => null);
  if (!account?.confirmed) return;
  await sendNotice(account.email, "wallet_linked", `wallet-linked:${key}`, [`Wallet: ${address}`]);
}
