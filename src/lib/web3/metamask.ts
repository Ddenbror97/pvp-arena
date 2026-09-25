import { ALLOWED_WALLET_METHODS, WALLET_CONFIG } from "./config";
import { WalletError, toWalletError } from "./errors";
import { buildDepositTransaction, type DepositInstruction } from "@/lib/crypto/deposit";

/** Minimal EIP-1193 surface this app uses. */
export interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isMetaMask?: boolean;
  providers?: Eip1193[];
  on?(event: string, fn: (...a: unknown[]) => void): void;
  removeListener?(event: string, fn: (...a: unknown[]) => void): void;
}

export interface WalletSession {
  connect(): Promise<{ address: string; chainId: string }>;
  checkConnection(): Promise<{ address: string; chainId: string } | null>;
  resetConnection(): Promise<void>;
  chainId(): Promise<string>;
  sign(message: string, address: string): Promise<string>;
  switchToRequiredNetwork(): Promise<void>;
  sendTestDeposit(instruction: DepositInstruction, expectedAddress: string): Promise<string>;
  disconnect(): Promise<void>;
  onAccountsChanged(fn: (accounts: string[]) => void): () => void;
  onChainChanged(fn: (chainId: string) => void): () => void;
  onDisconnect(fn: () => void): () => void;
}

const SIGN_TIMEOUT_MS = 180_000;
const PROVIDER_DISCOVERY_MS = 750;

type ConnectedAccount = { accounts: string[]; chainId: string };

// MetaMask owns the lifetime of eth_requestAccounts and offers no cancellation API.
// Keep its promise alive across React remounts/session resets so this origin never
// creates a second request while the first is still waiting in the extension.
const pendingInjectedConnections = new WeakMap<Eip1193, Promise<ConnectedAccount>>();

interface ProviderHost {
  ethereum?: Eip1193;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  dispatchEvent(event: Event): boolean;
}

interface Eip6963Detail {
  info?: { rdns?: string };
  provider?: Eip1193;
}

function metaMaskFromLegacyProvider(provider?: Eip1193) {
  if (!provider) return null;
  const candidates = provider.providers ?? [provider];
  return candidates.find((candidate) => candidate.isMetaMask === true) ?? null;
}

/** Discover the installed MetaMask provider without relying on the SDK's one-shot timer. */
export async function discoverInjectedMetaMask(
  host: ProviderHost,
  waitMs = PROVIDER_DISCOVERY_MS,
): Promise<Eip1193 | null> {
  const legacy = metaMaskFromLegacyProvider(host.ethereum);
  if (legacy) return legacy;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (provider: Eip1193 | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      host.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(provider);
    };
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963Detail>).detail;
      if (detail?.provider && (detail.info?.rdns === "io.metamask" || detail.provider.isMetaMask === true)) {
        finish(detail.provider);
      }
    };
    const timer = setTimeout(() => finish(metaMaskFromLegacyProvider(host.ethereum)), waitMs);
    host.addEventListener("eip6963:announceProvider", onAnnounce);
    host.dispatchEvent(new Event("eip6963:requestProvider"));
  });
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new WalletError("TIMEOUT")), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

/** Hard guard: transaction/approval methods can never be sent. */
export function guardedRequest(provider: Eip1193, method: string, params?: unknown[]) {
  if (!ALLOWED_WALLET_METHODS.has(method)) return Promise.reject(new WalletError("GENERIC"));
  return provider.request(params ? { method, params } : { method });
}

async function readAuthorizedConnection(provider: Eip1193): Promise<ConnectedAccount | null> {
  const accounts = (await guardedRequest(provider, "eth_accounts")) as string[];
  if (!accounts?.[0]) return null;
  return {
    accounts,
    chainId: String(await guardedRequest(provider, "eth_chainId")),
  };
}

/** Reuse one permission request per injected provider, including across remounts. */
export async function connectInjectedProvider(provider: Eip1193): Promise<ConnectedAccount> {
  const authorized = await readAuthorizedConnection(provider);
  if (authorized) return authorized;

  const existing = pendingInjectedConnections.get(provider);
  if (existing) return existing;

  const request = (async () => {
    try {
      const accounts = (await guardedRequest(provider, "eth_requestAccounts")) as string[];
      return {
        accounts,
        chainId: String(await guardedRequest(provider, "eth_chainId")),
      };
    } catch (error) {
      const mapped = toWalletError(error, "connect");
      if (mapped.code === "CONNECT_PENDING") {
        // The wallet can finish an older request just before reporting -32002.
        const recovered = await readAuthorizedConnection(provider);
        if (recovered) return recovered;
      }
      throw mapped;
    }
  })();
  pendingInjectedConnections.set(provider, request);
  void request.finally(() => {
    if (pendingInjectedConnections.get(provider) === request) {
      pendingInjectedConnections.delete(provider);
    }
  }).catch(() => {});
  return request;
}

/**
 * Ask the extension to forget this origin's account permission. This is the
 * only provider-supported reset for a stale account request; it never touches
 * keys, accounts, transactions, or permissions granted to other sites.
 */
export async function resetInjectedProviderConnection(provider: Eip1193): Promise<void> {
  try {
    await guardedRequest(provider, "wallet_revokePermissions", [{ eth_accounts: {} }]);
  } catch (error) {
    const mapped = toWalletError(error, "connect");
    // There may be no existing permission to revoke. The reset is still safe
    // to continue unless MetaMask explicitly says another request is pending.
    if (mapped.code === "CONNECT_PENDING") throw mapped;
  }
  pendingInjectedConnections.delete(provider);
}

function sub(p: Eip1193, ev: string, fn: (...a: unknown[]) => void) {
  p.on?.(ev, fn);
  return () => p.removeListener?.(ev, fn);
}

export function sessionFor(
  provider: Eip1193,
  connectFn: () => Promise<{ accounts: string[]; chainId: string }>,
  disconnectFn: () => Promise<void>,
): WalletSession {
  return {
    async connect() {
      const attempt = async () => {
        // MetaMask does not provide cancellation for eth_requestAccounts. Do
        // not abandon it behind an app timeout and then accidentally create a
        // second request that the extension rejects as already pending.
        const { accounts, chainId } = await connectFn();
        const address = accounts?.[0];
        if (!address) throw new WalletError("WALLET_LOCKED");
        return { address, chainId: String(chainId).toLowerCase() };
      };
      try {
        return await attempt();
      } catch (e) {
        const first = toWalletError(e, "connect");
        // A connection left over from an earlier session — typically another site
        // account in the same browser — can block the first request. Dropping it
        // and retrying once clears that state. Never retried when the user
        // themselves dismissed or ignored the prompt.
        if (
          first.code === "CONNECT_REJECTED" ||
          first.code === "CONNECT_PENDING" ||
          first.code === "WALLET_LOCKED" ||
          first.code === "TIMEOUT"
        )
          throw first;
        try {
          await disconnectFn();
        } catch {
          /* stale state may already be gone */
        }
        await new Promise((r) => setTimeout(r, 250));
        try {
          return await attempt();
        } catch (e2) {
          throw toWalletError(e2, "connect");
        }
      }
    },
    async checkConnection() {
      const connected = await readAuthorizedConnection(provider);
      if (!connected) return null;
      const address = connected.accounts[0];
      if (!address) return null;
      return {
        address,
        chainId: connected.chainId.toLowerCase(),
      };
    },
    async resetConnection() {
      await resetInjectedProviderConnection(provider);
      try {
        await disconnectFn();
      } catch {
        /* injected providers have no local session to disconnect */
      }
    },
    async chainId() {
      return String(await guardedRequest(provider, "eth_chainId")).toLowerCase();
    },
    async sign(message, address) {
      try {
        const sig = await withTimeout(
          guardedRequest(provider, "personal_sign", [message, address]),
          SIGN_TIMEOUT_MS,
        );
        if (typeof sig !== "string") throw new WalletError("INVALID_SIGNATURE");
        return sig;
      } catch (e) {
        throw toWalletError(e, "sign");
      }
    },
    async switchToRequiredNetwork() {
      try {
        await guardedRequest(provider, "wallet_switchEthereumChain", [
          { chainId: WALLET_CONFIG.requiredChainId },
        ]);
      } catch (e) {
        const code = (e as { code?: unknown })?.code;
        if (code !== 4902) throw toWalletError(e, "connect");
        await guardedRequest(provider, "wallet_addEthereumChain", [
          {
            chainId: WALLET_CONFIG.requiredChainId,
            chainName: WALLET_CONFIG.requiredChainName,
            nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
            rpcUrls: [WALLET_CONFIG.rpcUrls[WALLET_CONFIG.requiredChainId]],
            blockExplorerUrls: ["https://sepolia.basescan.org"],
          },
        ]);
      }
    },
    async sendTestDeposit(instruction, expectedAddress) {
      const chainId = String(await guardedRequest(provider, "eth_chainId")).toLowerCase();
      if (chainId !== WALLET_CONFIG.requiredChainId) throw new WalletError("UNSUPPORTED_NETWORK");
      const accounts = (await guardedRequest(provider, "eth_accounts")) as string[];
      const from = accounts[0];
      if (!from || from.toLowerCase() !== expectedAddress.toLowerCase()) {
        throw new WalletError("ADDRESS_MISMATCH");
      }
      const transaction = buildDepositTransaction(instruction);
      try {
        const hash = await guardedRequest(provider, "eth_sendTransaction", [
          { from, ...transaction },
        ]);
        if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
          throw new WalletError("GENERIC");
        }
        return hash;
      } catch (e) {
        throw toWalletError(e, "send");
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
    const test = import.meta.env.DEV
      ? (window as unknown as { __PVP_TEST_WALLET__?: Eip1193 }).__PVP_TEST_WALLET__
      : undefined;
    if (test) {
      return sessionFor(
        test,
        () => connectInjectedProvider(test),
        async () => {},
      );
    }
    const injected = await discoverInjectedMetaMask(window);
    if (injected) {
      return sessionFor(
        injected,
        () => connectInjectedProvider(injected),
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
          // forceRequest: always let the user pick the account, instead of silently
          // reusing a stale session from another site account / MetaMask account.
          const r = await client.connect({
            chainIds: [WALLET_CONFIG.requiredChainId],
            forceRequest: true,
          });
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

/** Clear a failed connector so the next click starts from a clean session. */
export function resetWalletSession() {
  cached = null;
}
