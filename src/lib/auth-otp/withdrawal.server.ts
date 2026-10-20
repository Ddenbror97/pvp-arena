// Cash-out notices. The emailed approval code is no longer part of a withdrawal.
import { accountEmail } from "./account.server";
import { rpc, sendNotice } from "./issue.server";
import { type WithdrawalTarget } from "./otp";

const NETWORKS: Record<number, string> = { 1: "Ethereum", 8453: "Base", 84532: "Base Sepolia" };
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export const PARTNER_BLOCKED = "You cant withdraw right now, try again later";

function describe(_userId: string, t: WithdrawalTarget): string[] {
  if (t.rail === "btc") return [`Amount: ${usd(t.usdCents)} in BTC`, `To: ${t.address.trim()}`];
  return [
    `Amount: ${usd(t.usdCents)} in ${t.asset.toUpperCase()}`,
    `Network: ${NETWORKS[t.chainId] ?? `chain ${t.chainId}`}`,
    `To: ${t.address.trim()}`,
  ];
}

/** Partners cannot cash out. This used to run when the email code was sent. */
export async function withdrawalBlocked(userId: string): Promise<string | null> {
  if (await rpc<boolean>("partner_withdrawal_check", { p_user: userId })) return PARTNER_BLOCKED;
  return null;
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
