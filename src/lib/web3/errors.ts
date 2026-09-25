import { WALLET_CONFIG } from "./config";

export const WALLET_MESSAGES = {
  CONNECT_REJECTED: "Wallet connection cancelled.",
  CONNECT_PENDING:
    "A MetaMask request is waiting. Open MetaMask from your browser toolbar, then approve or reject it.",
  WALLET_LOCKED: "Unlock MetaMask and select an account, then try again.",
  SIGN_REJECTED: "Wallet verification cancelled.",
  TRANSACTION_REJECTED: "Deposit cancelled in MetaMask.",
  INVALID_SIGNATURE: "Could not verify ownership of this wallet.",
  EXPIRED: "The request expired. Please try again.",
  ALREADY_LINKED: "This wallet is already linked to another account.",
  ADDRESS_MISMATCH: "Select your verified wallet address in MetaMask before depositing.",
  UNSUPPORTED_NETWORK: `Unsupported network. Switch your wallet to the network PVPspinArena supports (${WALLET_CONFIG.requiredChainName}).`,
  UNAVAILABLE:
    "MetaMask isn't available on this device. Install the extension or use the MetaMask app.",
  TIMEOUT: "The wallet didn't respond in time. Please try again.",
  UNSUPPORTED_ENV: "This browser doesn't support connecting to MetaMask.",
  RATE_LIMITED: "Too many attempts. Please wait a few minutes.",
  GENERIC: "Something went wrong with the wallet. Please try again.",
} as const;
export type WalletErrorCode = keyof typeof WALLET_MESSAGES;
export const WALLET_ERROR_CODES = Object.keys(WALLET_MESSAGES) as [
  WalletErrorCode,
  ...WalletErrorCode[],
];

export class WalletError extends Error {
  constructor(public code: WalletErrorCode) {
    super(WALLET_MESSAGES[code]);
  }
}

/** Map any provider/server error to a safe code. Never surfaces raw text. */
export function toWalletError(e: unknown, phase: "connect" | "sign" | "send"): WalletError {
  if (e instanceof WalletError) return e;
  const code = (e as { code?: unknown })?.code;
  const dataCode = (e as { data?: { code?: unknown } })?.data?.code;
  const causeCode = (e as { cause?: { code?: unknown } })?.cause?.code;
  const msg = String((e as { message?: unknown })?.message ?? e).toLowerCase();
  // Diagnostic only: safe phase and provider code. Raw provider messages can
  // include extension internals, so they never leave this mapper.
  console.warn("[wallet]", phase, code ?? dataCode ?? causeCode ?? "unclassified");
  if (
    code === -32002 ||
    dataCode === -32002 ||
    causeCode === -32002 ||
    /request already pending|already processing|already pending/.test(msg)
  )
    return new WalletError("CONNECT_PENDING");
  if (
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    dataCode === 4001 ||
    /user rejected|user denied|rejected the request|action rejected|cancelled|canceled|dismissed|closed popup/.test(
      msg,
    )
  )
    return new WalletError(
      phase === "sign" ? "SIGN_REJECTED" : phase === "send" ? "TRANSACTION_REJECTED" : "CONNECT_REJECTED",
    );
  if (
    code === 4900 ||
    code === 4901 ||
    /not detected|no extension|not installed|no provider|ethereum provider|is not available|install the/.test(msg)
  )
    return new WalletError("UNAVAILABLE");
  if (/timeout|timed out/.test(msg)) return new WalletError("TIMEOUT");
  if (/wallet.*locked|unlock.*wallet|no accounts? (?:available|selected)/.test(msg))
    return new WalletError("WALLET_LOCKED");
  if (/unsupported network|unsupported chain|unrecognized chain|chain not supported/.test(msg))
    return new WalletError("UNSUPPORTED_NETWORK");
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
