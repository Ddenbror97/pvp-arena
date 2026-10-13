import type { WalletErrorCode } from "@/lib/web3/errors";
import type { WalletKind } from "@/lib/web3/metamask";

/** How long the buttons stay locked. The extension prompt may stay open longer. */
export const CONNECT_UI_TIMEOUT_MS = 12_000;

export type KindPhase = "idle" | "requesting" | "prompt" | "ready";

export type KindConnect = {
  phase: KindPhase;
  attempt: number;
  error: WalletErrorCode | null;
};

export type ConnectUi = Record<WalletKind, KindConnect>;

export function idleKind(): KindConnect {
  return { phase: "idle", attempt: 0, error: null };
}

export function idleConnectUi(): ConnectUi {
  return { metamask: idleKind(), coinbase: idleKind() };
}

/** A click while this wallet is already requesting is ignored. The other wallet is never locked. */
export function clickKind(
  current: KindConnect,
  providerPending: boolean,
): "ignore" | "recover" | "start" {
  if (current.phase === "requesting") return "ignore";
  if (providerPending) return "recover";
  return "start";
}

export function startKind(current: KindConnect): {
  ignored: boolean;
  attempt: number;
  next: KindConnect;
} {
  if (current.phase === "requesting") {
    return { ignored: true, attempt: current.attempt, next: current };
  }
  const attempt = current.attempt + 1;
  return {
    ignored: false,
    attempt,
    next: { phase: "requesting", attempt, error: null },
  };
}

/** Unlock the button. Do not start another provider request. */
export function timeoutKind(current: KindConnect, attempt: number): KindConnect {
  if (current.attempt !== attempt || current.phase !== "requesting") return current;
  return { phase: "prompt", attempt, error: "CONNECT_PENDING" };
}

export function finishKind(
  current: KindConnect,
  attempt: number,
  error: WalletErrorCode | null,
): KindConnect {
  if (current.attempt !== attempt) return current;
  if (error === "CONNECT_PENDING") return { phase: "prompt", attempt, error };
  if (error) return { phase: "idle", attempt, error };
  return { phase: "ready", attempt, error: null };
}

export function clearKind(current: KindConnect): KindConnect {
  return { phase: "idle", attempt: current.attempt, error: null };
}

export function walletButtonLocked(current: KindConnect): boolean {
  return current.phase === "requesting";
}
