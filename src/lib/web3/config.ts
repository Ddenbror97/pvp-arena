/**
 * Single source of truth for wallet-identity network settings (Phase 1).
 * Identity only: the app reads `eth_chainId` from the connected wallet and
 * requests `personal_sign`. It never sends transactions.
 */
export const WALLET_CONFIG = {
  /** Base Sepolia testnet — the same network as the test deposit/withdrawal rails. */
  requiredChainId: "0x14a34" as const,
  requiredChainName: "Base Sepolia",
  /**
   * MetaMask Connect requires a chain -> RPC map at construction time. The app
   * never makes RPC calls through it (no reads, no transactions); network
   * detection uses `eth_chainId` from the wallet itself. Public, keyless.
   */
  rpcUrls: { "0x14a34": "https://sepolia.base.org" } as Record<`0x${string}`, string>,
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
