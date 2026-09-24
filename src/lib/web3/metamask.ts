import { ALLOWED_WALLET_METHODS, WALLET_CONFIG } from "./config";
import { WalletError, toWalletError } from "./errors";

/** Minimal EIP-1193 surface this app uses. */
interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, fn: (...a: unknown[]) => void): void;
  removeListener?(event: string, fn: (...a: unknown[]) => void): void;
}

export interface WalletSession {
  connect(): Promise<{ address: string; chainId: string }>;
  chainId(): Promise<string>;
  sign(message: string, address: string): Promise<string>;
  disconnect(): Promise<void>;
  onAccountsChanged(fn: (accounts: string[]) => void): () => void;
  onChainChanged(fn: (chainId: string) => void): () => void;
  onDisconnect(fn: () => void): () => void;
}

const CONNECT_TIMEOUT_MS = 120_000;
const SIGN_TIMEOUT_MS = 180_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new WalletError("TIMEOUT")), ms);
    p.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)));
  });
}

/** Hard guard: transaction/approval methods can never be sent. */
export function guardedRequest(provider: Eip1193, method: string, params?: unknown[]) {
  if (!ALLOWED_WALLET_METHODS.has(method)) return Promise.reject(new WalletError("GENERIC"));
  return provider.request({ method, params });
}

function sub(p: Eip1193, ev: string, fn: (...a: unknown[]) => void) {
  p.on?.(ev, fn);
  return () => p.removeListener?.(ev, fn);
}

function sessionFor(provider: Eip1193, connectFn: () => Promise<{ accounts: string[]; chainId: string }>, disconnectFn: () => Promise<void>): WalletSession {
  return {
    async connect() {
      try {
        const { accounts, chainId } = await withTimeout(connectFn(), CONNECT_TIMEOUT_MS);
        const address = accounts?.[0];
        if (!address) throw new WalletError("CONNECT_REJECTED");
        return { address, chainId: String(chainId).toLowerCase() };
      } catch (e) {
        throw toWalletError(e, "connect");
      }
    },
    async chainId() {
      return String(await guardedRequest(provider, "eth_chainId")).toLowerCase();
    },
    async sign(message, address) {
      try {
        const sig = await withTimeout(guardedRequest(provider, "personal_sign", [message, address]), SIGN_TIMEOUT_MS);
        if (typeof sig !== "string") throw new WalletError("INVALID_SIGNATURE");
        return sig;
      } catch (e) {
        throw toWalletError(e, "sign");
      }
    },
    disconnect: async () => {
      try {
        await disconnectFn();
      } catch {
        /* ignore: local disconnect only */
      }
    },
    onAccountsChanged: (fn) => sub(provider, "accountsChanged", (a) => fn((a as string[]) ?? [])),
    onChainChanged: (fn) => sub(provider, "chainChanged", (c) => fn(String(c).toLowerCase())),
    onDisconnect: (fn) => sub(provider, "disconnect", () => fn()),
  };
}

let cached: Promise<WalletSession> | null = null;

/** Lazily create the MetaMask Connect EVM client (browser only). */
export function getWalletSession(): Promise<WalletSession> {
  if (typeof window === "undefined") return Promise.reject(new WalletError("UNSUPPORTED_ENV"));
  if (cached) return cached;
  cached = (async () => {
    // Automated tests only (dev builds): a mocked EIP-1193 provider.
    const test = import.meta.env.DEV ? (window as unknown as { __PVP_TEST_WALLET__?: Eip1193 }).__PVP_TEST_WALLET__ : undefined;
    if (test) {
      return sessionFor(
        test,
        async () => ({
          accounts: (await guardedRequest(test, "eth_requestAccounts")) as string[],
          chainId: String(await guardedRequest(test, "eth_chainId")),
        }),
        async () => {},
      );
    }
    try {
      const { createEVMClient } = await import("@metamask/connect-evm");
      const client = await createEVMClient({
        dapp: { name: WALLET_CONFIG.dappName, url: window.location.origin },
        api: { supportedNetworks: WALLET_CONFIG.rpcUrls },
      });
      const provider = client.getProvider() as unknown as Eip1193;
      return sessionFor(
        provider,
        async () => {
          const r = await client.connect({ chainIds: [WALLET_CONFIG.requiredChainId] });
          return { accounts: [...r.accounts], chainId: r.chainId };
        },
        () => client.disconnect(),
      );
    } catch (e) {
      cached = null;
      throw e instanceof WalletError ? e : new WalletError("UNAVAILABLE");
    }
  })();
  cached.catch(() => (cached = null));
  return cached;
}
