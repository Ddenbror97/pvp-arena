/**
 * Single source of truth for wallet-identity network settings (Phase 1).
 * Identity only: the app reads `eth_chainId` from the connected wallet and
 * requests `personal_sign`. It never sends transactions.
 */
export const WALLET_CONFIG = {
  /** Ethereum Mainnet is the initial supported network. */
  requiredChainId: "0x1" as const,
  requiredChainName: "Ethereum Mainnet",
  /**
   * MetaMask Connect requires a chain -> RPC map at construction time. The app
   * never makes RPC calls through it (no reads, no transactions); network
   * detection uses `eth_chainId` from the wallet itself. Public, keyless.
   */
  rpcUrls: { "0x1": "https://ethereum-rpc.publicnode.com" } as Record<`0x${string}`, string>,
  domain: "pvpspinarena.com",
  dappName: "PVPspinArena",
  messageVersion: 1,
  challengeTtlMinutes: 10,
} as const;

/** The only provider methods this app may call. Everything else is blocked. */
export const ALLOWED_WALLET_METHODS = new Set([
  "eth_requestAccounts",
  "eth_accounts",
  "eth_chainId",
  "personal_sign",
]);
