import { WALLET_CONFIG } from "./config";

export const WALLET_MESSAGES = {
  CONNECT_REJECTED: "Wallet connection cancelled.",
  SIGN_REJECTED: "Wallet verification cancelled.",
  INVALID_SIGNATURE: "Could not verify ownership of this wallet.",
  EXPIRED: "The request expired. Please try again.",
  ALREADY_LINKED: "This wallet is already linked to another account.",
  UNSUPPORTED_NETWORK: `Unsupported network. Switch your wallet to the network PVPspinArena supports (${WALLET_CONFIG.requiredChainName}).`,
  UNAVAILABLE:
    "MetaMask isn't available on this device. Install the extension or use the MetaMask app.",
  TIMEOUT: "The wallet didn't respond in time. Please try again.",
  UNSUPPORTED_ENV: "This browser doesn't support connecting to MetaMask.",
  RATE_LIMITED: "Too many attempts. Please wait a few minutes.",
  GENERIC: "Something went wrong with the wallet. Please try again.",
} as const;
export type WalletErrorCode = keyof typeof WALLET_MESSAGES;

export class WalletError extends Error {
  constructor(public code: WalletErrorCode) {
    super(WALLET_MESSAGES[code]);
  }
}

/** Map any provider/server error to a safe code. Never surfaces raw text. */
export function toWalletError(e: unknown, phase: "connect" | "sign"): WalletError {
  if (e instanceof WalletError) return e;
  const code = (e as { code?: unknown })?.code;
  const msg = String((e as { message?: unknown })?.message ?? "").toLowerCase();
  if (
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    msg.includes("user rejected") ||
    msg.includes("user denied")
  )
    return new WalletError(phase === "sign" ? "SIGN_REJECTED" : "CONNECT_REJECTED");
  if (code === 4900 || code === 4901) return new WalletError("UNAVAILABLE");
  if (msg.includes("timeout") || msg.includes("timed out")) return new WalletError("TIMEOUT");
  return new WalletError("GENERIC");
}

/** Server result codes -> user message code. */
export function serverCodeToError(code: string): WalletErrorCode {
  switch (code) {
    case "EXPIRED":
    case "CONSUMED":
    case "NOT_FOUND":
      return "EXPIRED";
    case "ALREADY_LINKED":
      return "ALREADY_LINKED";
    case "RATE_LIMITED":
      return "RATE_LIMITED";
    case "INVALID_SIGNATURE":
    case "ADDRESS_MISMATCH":
      return "INVALID_SIGNATURE";
    default:
      return "GENERIC";
  }
}
