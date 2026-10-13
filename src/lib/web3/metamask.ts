import { ALLOWED_WALLET_METHODS, WALLET_CONFIG } from "./config";
import { WalletError, toWalletError, type WalletName } from "./errors";
import { buildDepositTransaction, type DepositInstruction } from "@/lib/crypto/deposit";

/** Minimal EIP-1193 surface this app uses. */
export interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: Eip1193[];
  on?(event: string, fn: (...a: unknown[]) => void): void;
  removeListener?(event: string, fn: (...a: unknown[]) => void): void;
}

/**
 * Browser wallets this app can drive. Both are EVM extensions speaking EIP-1193,
 * so verification, Base switching and deposits share one code path; only
 * discovery and the fallback when nothing is installed differ.
 */
export type WalletKind = "metamask" | "coinbase";
export const WALLET_KINDS: readonly WalletKind[] = ["metamask", "coinbase"];
export const WALLET_LABEL: Record<WalletKind, WalletName> = {
  metamask: "MetaMask",
  coinbase: "Coinbase Wallet",
};
const WALLET_RDNS: Record<WalletKind, string> = {
  metamask: "io.metamask",
  coinbase: "com.coinbase.wallet",
};
const KIND_STORAGE_PREFIX = "pvp-wallet-kind:";

export function isWalletKind(value: unknown): value is WalletKind {
  return value === "metamask" || value === "coinbase";
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Remember which extension verified an address so Deposit opens that wallet, not another one. */
export function rememberWalletKind(address: string, kind: WalletKind) {
  try {
    safeStorage()?.setItem(KIND_STORAGE_PREFIX + address.toLowerCase(), kind);
  } catch {
    /* storage may be full or blocked; the picker still works */
  }
}
export function recallWalletKind(address: string | null | undefined): WalletKind | null {
  if (!address) return null;
  try {
    const value = safeStorage()?.getItem(KIND_STORAGE_PREFIX + address.toLowerCase());
    return isWalletKind(value) ? value : null;
  } catch {
    return null;
  }
}

export interface WalletSession {
  connect(): Promise<{ address: string; chainId: string }>;
  /**
   * Open the wallet's account list. `picker: "unavailable"` means the extension
   * cannot show that list from the page, so the player switches inside the extension.
   */
  chooseAccount(): Promise<{ address: string; chainId: string; picker: "shown" | "unavailable" }>;
  checkConnection(): Promise<{ address: string; chainId: string } | null>;
  /** True while this provider still owns an account request. Never true after a reload. */
  hasPendingRequest(): boolean;
  resetConnection(): Promise<void>;
  chainId(): Promise<string>;
  sign(message: string, address: string): Promise<string>;
  switchToRequiredNetwork(): Promise<void>;
  sendTestDeposit(instruction: DepositInstruction, expectedAddress: string): Promise<string>;
  disconnect(): Promise<void>;
  onAccountsChanged(fn: (accounts: string[]) => void): () => void;
  onChainChanged(fn: (chainId: string) => void): () => void;
  onDisconnect(fn: () => void): () => void;
  onConnect(fn: (chainId: string) => void): () => void;
}

const SIGN_TIMEOUT_MS = 180_000;
const PROVIDER_DISCOVERY_MS = 750;

type ConnectedAccount = { accounts: string[]; chainId: string };

// MetaMask owns the lifetime of eth_requestAccounts and offers no cancellation API.
// Keep its promise alive across React remounts/session resets so this origin never
// creates a second request while the first is still waiting in the extension.
const pendingInjectedConnections = new WeakMap<Eip1193, Promise<ConnectedAccount>>();
// A -32002 response means the extension, not this page, owns an older request.
// Remember that across every caller so Deposit/Profile cannot repeatedly poke it.
const externallyPendingConnections = new WeakSet<Eip1193>();

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

/**
 * Legacy flag check. Coinbase Wallet sets `isMetaMask` on some builds to pass
 * old dapp checks, so MetaMask is only matched when the Coinbase flag is absent.
 */
function matchesKind(provider: Eip1193, kind: WalletKind) {
  if (kind === "coinbase") return provider.isCoinbaseWallet === true;
  return provider.isMetaMask === true && provider.isCoinbaseWallet !== true;
}

function fromLegacyProvider(provider: Eip1193 | undefined, kind: WalletKind) {
  if (!provider) return null;
  const candidates = provider.providers ?? [provider];
  return candidates.find((candidate) => matchesKind(candidate, kind)) ?? null;
}

function matchesAnnouncement(detail: Eip6963Detail | undefined, kind: WalletKind) {
  if (!detail?.provider) return false;
  if (detail.info?.rdns) return detail.info.rdns === WALLET_RDNS[kind];
  return matchesKind(detail.provider, kind);
}

/** Discover one installed wallet extension by kind, via EIP-6963 or the legacy `window.ethereum` flags. */
export async function discoverInjectedWallet(
  host: ProviderHost,
  kind: WalletKind,
  waitMs = PROVIDER_DISCOVERY_MS,
): Promise<Eip1193 | null> {
  const legacy = fromLegacyProvider(host.ethereum, kind);
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
      if (matchesAnnouncement(detail, kind)) finish(detail.provider!);
    };
    const timer = setTimeout(() => finish(fromLegacyProvider(host.ethereum, kind)), waitMs);
    host.addEventListener("eip6963:announceProvider", onAnnounce);
    host.dispatchEvent(new Event("eip6963:requestProvider"));
  });
}

/** Discover the installed MetaMask provider without relying on the SDK's one-shot timer. */
export function discoverInjectedMetaMask(host: ProviderHost, waitMs = PROVIDER_DISCOVERY_MS) {
  return discoverInjectedWallet(host, "metamask", waitMs);
}

/** Which wallet extensions are installed right now. Used only to label the picker. */
export async function discoverInstalledWallets(
  host: ProviderHost,
  waitMs = PROVIDER_DISCOVERY_MS,
): Promise<Set<WalletKind>> {
  const found = new Set<WalletKind>();
  await Promise.all(
    WALLET_KINDS.map(async (kind) => {
      if (await discoverInjectedWallet(host, kind, waitMs)) found.add(kind);
    }),
  );
  return found;
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

const ACCOUNT_PERMISSION = JSON.stringify([{ eth_accounts: {} }]);

/** Hard guard: transaction methods can never be sent. Account permission is the only extra shape. */
export function guardedRequest(provider: Eip1193, method: string, params?: unknown[]) {
  if (!ALLOWED_WALLET_METHODS.has(method)) return Promise.reject(new WalletError("GENERIC"));
  if (method === "wallet_requestPermissions" && JSON.stringify(params) !== ACCOUNT_PERMISSION) {
    return Promise.reject(new WalletError("GENERIC"));
  }
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
  if (authorized) {
    externallyPendingConnections.delete(provider);
    return authorized;
  }

  const existing = pendingInjectedConnections.get(provider);
  if (existing) return existing;
  if (externallyPendingConnections.has(provider)) throw new WalletError("CONNECT_PENDING");

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
        externallyPendingConnections.add(provider);
        // The wallet can finish an older request just before reporting -32002.
        const recovered = await readAuthorizedConnection(provider);
        if (recovered) {
          externallyPendingConnections.delete(provider);
          return recovered;
        }
      }
      throw mapped;
    }
  })();
  pendingInjectedConnections.set(provider, request);
  void request
    .finally(() => {
      if (pendingInjectedConnections.get(provider) === request) {
        pendingInjectedConnections.delete(provider);
      }
    })
    .catch(() => {});
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
  externallyPendingConnections.delete(provider);
}

function permissionsUnsupported(error: unknown) {
  const code = (error as { code?: unknown })?.code;
  const msg = String((error as { message?: unknown })?.message ?? error).toLowerCase();
  return (
    code === 4200 ||
    code === -32601 ||
    /not support|unsupported method|does not exist|method not found/.test(msg)
  );
}

/**
 * Ask the wallet to show its account list. eth_requestAccounts returns the
 * current account without a picker once this site is already permitted.
 */
export type AccountChoice = ConnectedAccount & { picker: "shown" | "unavailable" };

export async function chooseInjectedAccount(provider: Eip1193): Promise<AccountChoice> {
  if (pendingInjectedConnections.has(provider) || externallyPendingConnections.has(provider)) {
    throw new WalletError("CONNECT_PENDING");
  }
  try {
    await guardedRequest(provider, "wallet_requestPermissions", [{ eth_accounts: {} }]);
  } catch (error) {
    if (permissionsUnsupported(error)) {
      const current = await readAuthorizedConnection(provider);
      if (current) return { ...current, picker: "unavailable" };
      const next = await connectInjectedProvider(provider);
      return { ...next, picker: "shown" };
    }
    const mapped = error instanceof WalletError ? error : toWalletError(error, "connect");
    if (mapped.code === "CONNECT_PENDING") {
      externallyPendingConnections.add(provider);
      const recovered = await readAuthorizedConnection(provider);
      if (recovered) {
        externallyPendingConnections.delete(provider);
        return { ...recovered, picker: "shown" };
      }
    }
    throw mapped;
  }
  const chosen = await readAuthorizedConnection(provider);
  if (!chosen) throw new WalletError("CONNECT_REJECTED");
  externallyPendingConnections.delete(provider);
  return { ...chosen, picker: "shown" };
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
    async chooseAccount() {
      try {
        const { accounts, chainId, picker } = await chooseInjectedAccount(provider);
        const address = accounts?.[0];
        if (!address) throw new WalletError("WALLET_LOCKED");
        return { address, chainId: String(chainId).toLowerCase(), picker };
      } catch (e) {
        throw e instanceof WalletError ? e : toWalletError(e, "connect");
      }
    },
    hasPendingRequest() {
      return (
        pendingInjectedConnections.has(provider) || externallyPendingConnections.has(provider)
      );
    },
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
            blockExplorerUrls: ["https://basescan.org"],
          },
        ]);
      }
    },
    async sendTestDeposit(instruction, expectedAddress) {
      const requiredChain = Number.parseInt(WALLET_CONFIG.requiredChainId, 16);
      if (instruction.chainId !== requiredChain) throw new WalletError("UNSUPPORTED_NETWORK");
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
    onConnect: (fn) =>
      sub(provider, "connect", (info) => {
        const chainId =
          typeof info === "string" ? info : String((info as { chainId?: unknown })?.chainId ?? "");
        if (chainId) fn(chainId.toLowerCase());
      }),
  };
}

const cached = new Map<WalletKind, Promise<WalletSession>>();

function injectedSession(provider: Eip1193): WalletSession {
  return sessionFor(
    provider,
    () => connectInjectedProvider(provider),
    async () => {},
  );
}

/**
 * Lazily create the session for one wallet kind (browser only). MetaMask falls
 * back to MetaMask Connect (QR / mobile deep link) when no extension is present;
 * Coinbase Wallet is extension-only here, so a missing extension is UNAVAILABLE.
 */
export function getWalletSession(kind: WalletKind = "metamask"): Promise<WalletSession> {
  if (typeof window === "undefined") return Promise.reject(new WalletError("UNSUPPORTED_ENV"));
  const existing = cached.get(kind);
  if (existing) return existing;
  const created = (async () => {
    // Automated tests only (dev builds): a mocked EIP-1193 provider.
    const test = import.meta.env.DEV
      ? (window as unknown as { __PVP_TEST_WALLET__?: Eip1193 }).__PVP_TEST_WALLET__
      : undefined;
    if (test) return injectedSession(test);
    const injected = await discoverInjectedWallet(window, kind);
    if (injected) return injectedSession(injected);
    if (kind === "coinbase") throw new WalletError("UNAVAILABLE");
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
      throw e instanceof WalletError ? e : new WalletError("UNAVAILABLE");
    }
  })();
  cached.set(kind, created);
  created.catch(() => {
    if (cached.get(kind) === created) cached.delete(kind);
  });
  return created;
}

/** Clear a failed connector so the next click starts from a clean session. */
export function resetWalletSession(kind?: WalletKind) {
  if (kind) cached.delete(kind);
  else cached.clear();
}
