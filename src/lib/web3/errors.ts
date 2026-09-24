import { WALLET_CONFIG } from "./config";

export const WALLET_MESSAGES = {
  CONNECT_REJECTED: "Conexão com a carteira cancelada.",
  SIGN_REJECTED: "Verificação da carteira cancelada.",
  INVALID_SIGNATURE: "Não foi possível verificar a propriedade desta carteira.",
  EXPIRED: "A solicitação expirou. Tente novamente.",
  ALREADY_LINKED: "Esta carteira já está vinculada a outra conta.",
  UNSUPPORTED_NETWORK: `Rede não suportada. Conecte sua carteira à rede compatível com o PVPspinArena (${WALLET_CONFIG.requiredChainName}).`,
  UNAVAILABLE:
    "MetaMask não está disponível neste dispositivo. Instale a extensão ou use o app MetaMask.",
  TIMEOUT: "A carteira não respondeu a tempo. Tente novamente.",
  UNSUPPORTED_ENV: "Este navegador não suporta a conexão com a MetaMask.",
  RATE_LIMITED: "Muitas tentativas. Aguarde alguns minutos.",
  GENERIC: "Algo deu errado com a carteira. Tente novamente.",
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
