import { WALLET_CONFIG } from "./config";

/** Messages with `{wallet}` are filled in by `walletMessage` with the extension's name. */
const TEMPLATES = {
  CONNECT_REJECTED: "Wallet connection cancelled.",
  CONNECT_PENDING:
    "A {wallet} request is waiting. Open {wallet} from your browser toolbar, then approve or reject it.",
  PICKER_UNAVAILABLE:
    "{wallet} is already connected. Switch the account in the {wallet} extension. This page updates when you do.",
  WALLET_LOCKED: "Unlock {wallet} and select an account, then try again.",
  SIGN_REJECTED: "Wallet verification cancelled.",
  TRANSACTION_REJECTED: "Deposit cancelled in {wallet}.",
  INVALID_SIGNATURE: "Could not verify ownership of this wallet.",
  EXPIRED: "The request expired. Please try again.",
  ALREADY_LINKED: "This wallet is already linked to another account.",
  RESERVED_ADDRESS: "This address belongs to PVPspinArena and can't be linked as a player wallet.",
  ADDRESS_MISMATCH: "Select your verified wallet address in {wallet} before depositing.",
  UNSUPPORTED_NETWORK: `Unsupported network. Switch your wallet to the network PVPspinArena supports (${WALLET_CONFIG.requiredChainName}).`,
  UNAVAILABLE:
    "{wallet} isn't available on this device. Install the browser extension and try again.",
  TIMEOUT: "The wallet didn't respond in time. Please try again.",
  UNSUPPORTED_ENV: "This browser doesn't support connecting to {wallet}.",
  RATE_LIMITED: "Too many attempts. Please wait a few minutes.",
  GENERIC: "Something went wrong with the wallet. Please try again.",
} as const;
export type WalletErrorCode = keyof typeof TEMPLATES;
export const WALLET_ERROR_CODES = Object.keys(TEMPLATES) as [WalletErrorCode, ...WalletErrorCode[]];

export type WalletName = "MetaMask" | "Coinbase Wallet";
const DEFAULT_WALLET: WalletName = "MetaMask";

/** User-facing text for a code, naming the wallet the player is actually using. */
export function walletMessage(code: WalletErrorCode, wallet: WalletName = DEFAULT_WALLET): string {
  if (code === "UNAVAILABLE" && wallet === "MetaMask") {
    return "MetaMask isn't available on this device. Install the extension or use the MetaMask app.";
  }
  return TEMPLATES[code].replaceAll("{wallet}", wallet);
}

/** MetaMask-worded defaults, kept for callers that have no wallet context. */
export const WALLET_MESSAGES = Object.fromEntries(
  WALLET_ERROR_CODES.map((code) => [code, walletMessage(code)]),
) as Record<WalletErrorCode, string>;

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
      phase === "sign"
        ? "SIGN_REJECTED"
        : phase === "send"
          ? "TRANSACTION_REJECTED"
          : "CONNECT_REJECTED",
    );
  if (
    code === 4900 ||
    code === 4901 ||
    /not detected|no extension|not installed|no provider|ethereum provider|is not available|install the/.test(
      msg,
    )
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
    case "RESERVED_ADDRESS":
      return "RESERVED_ADDRESS";
    case "RATE_LIMITED":
      return "RATE_LIMITED";
    case "INVALID_SIGNATURE":
    case "ADDRESS_MISMATCH":
      return "INVALID_SIGNATURE";
    default:
      return "GENERIC";
  }
}
