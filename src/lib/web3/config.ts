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
   * MetaMask Connect refuses *every* request (even eth_chainId / personal_sign)
   * while the wallet's active chain is missing from this map, and it always
   * adds Ethereum mainnet to the permission request. So mainnet must be listed
   * too, purely so a wallet sitting on Ethereum can connect, sign and then be
   * switched. Deposits still hard-check chainId === requiredChainId, and the
   * server never uses these RPCs. Public, keyless.
   */
  rpcUrls: {
    "0x14a34": "https://sepolia.base.org",
    "0x1": "https://ethereum-rpc.publicnode.com",
  } as Record<`0x${string}`, string>,
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
  "wallet_revokePermissions",
  "personal_sign",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
  "eth_sendTransaction",
]);
