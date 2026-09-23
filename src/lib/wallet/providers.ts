/**
 * Wallet provider abstraction. The jackpot engine only ever moves funds between
 * internal ledger accounts; external value enters/leaves only through these
 * interfaces. No provider is connected in this release, and real money is
 * disabled — every external operation refuses to run.
 */
import { COMPLIANCE } from "@/lib/config";

export interface BalanceSnapshot {
  available: number;
  locked: number;
  asset: string;
  accountType: "test_credit" | "real";
}

export interface DepositIntent {
  asset: string;
  network: string;
  address: string;
  minimum: number;
}

export interface WalletProvider {
  readonly id: string;
  readonly supportsRealMoney: boolean;
}
export interface DepositProvider extends WalletProvider {
  createDepositIntent(userId: string, asset: string): Promise<DepositIntent>;
}
export interface WithdrawalProvider extends WalletProvider {
  requestWithdrawal(userId: string, asset: string, amount: number, destination: string): Promise<{ requestId: string }>;
}
export interface BalanceProvider {
  getBalance(userId: string): Promise<BalanceSnapshot>;
}

export class RealMoneyDisabledError extends Error {
  constructor() {
    super("Real-money deposits and withdrawals are disabled. Test credits have no cash value.");
  }
}

class DisabledProvider implements DepositProvider, WithdrawalProvider {
  readonly id = "disabled";
  readonly supportsRealMoney = false;
  async createDepositIntent(): Promise<DepositIntent> {
    throw new RealMoneyDisabledError();
  }
  async requestWithdrawal(): Promise<{ requestId: string }> {
    throw new RealMoneyDisabledError();
  }
}

export function getDepositProvider(): DepositProvider {
  if (!COMPLIANCE.realMoneyEnabled) return new DisabledProvider();
  throw new Error("No deposit provider configured");
}

export function getWithdrawalProvider(): WithdrawalProvider {
  if (!COMPLIANCE.realMoneyEnabled) return new DisabledProvider();
  throw new Error("No withdrawal provider configured");
}
