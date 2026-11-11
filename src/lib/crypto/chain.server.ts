import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  getAddress,
  http,
  keccak256,
  parseAbi,
  parseAbiItem,
  type Chain,
  type Hex,
  type PublicClient,
} from "viem";
import { base, mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { decidePayout, applyPayoutDecision } from "./payout-finality";
import {
  BASE_MAINNET,
  belowDepositMinimum,
  checkRpcUrl,
  checkMainnetRegistry,
  ethPayoutFunded,
  resolveChainEnvAssets,
  type ChainAssetConfig,
  weiToCents,
  usdcUnitsToCents,
  BASE_PAYOUT_GAS_RESERVE_WEI,
} from "./allowlist";
import {
  BASE_ETH_USD_DECIMALS,
  BASE_SEQUENCER_UPTIME_FEED,
  assessEthUsdRound,
  assessSequencerRound,
  type ChainlinkRound,
} from "./eth-price";
import { workerEnv } from "@/lib/worker-env";
import { logCryptoOps } from "./ops-log";
import { rpcFailure } from "./rpc-failure";
import { freshWithdrawalNonce, inflightWithdrawalKeepsStoredRaw } from "./payout-nonce";
import { erc20LogMatches, nativeTransfersAgree } from "./transfer-match";
import {
  agreement,
  anotherCouldHelp,
  readEvidence,
  type Agreement,
  type ProviderEvidence,
  type Reading,
} from "./provider-agreement";
import {
  ALCHEMY_MAX_PAGES,
  ALCHEMY_MAX_TARGETS,
  alchemyEthWindow,
  alchemyIndexFromUrls,
  alchemyNativeTransfers,
  alchemyTransfersBody,
  alchemyUsdcCandidates,
  ETH_EXTERNAL_LOG_INDEX,
  scanGapOf,
  type AlchemyTransferPage,
} from "./alchemy-index";
import {
  usdcIndexWindow,
  usdcTransfersInReceipt,
  USDC_INDEX_MAX_RECEIPTS,
  type UsdcCandidate,
} from "./usdc-index";

const ERC20 = parseAbi([
  "function transfer(address to, uint256 value) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);
const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);
const FEED = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]);
const NATIVE_LOG_INDEX = ETH_EXTERNAL_LOG_INDEX;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
// Keep each Cloudflare minute cron under the shared Worker subrequest budget.
// USDC uses narrow getLogs. Native ETH uses one indexed transfer query and its
// own cursor, so a USDC catch-up cannot jump past an unscanned ETH block.
const MAX_ETH_BLOCKS_STEADY = 20;
const MAX_ETH_BLOCKS_CATCH_UP = 100; // USDC window while catching up
const CATCH_UP_GAP_BLOCKS = 150n;
// One window per run. Six windows plus the ETH fallback blew the Worker
// subrequest budget; Cloudflare then killed the isolate (1102) before the
// cursor advanced, so every later minute repeated the same scan.
const MAX_CATCH_UP_PASSES = 1;
const MAX_ETH_BLOCK_FALLBACK = 3;
const MAX_OVERLAP_BLOCKS = 20n;
// Both configured Base RPCs reject eth_getLogs wider than about 5 blocks.
// A 2,000-block request fails, the worker dies while splitting it, and
// crypto_set_cursor never runs, so every later deposit stays uncredited.
const MAX_LOG_RANGE = 5n;
// Without an index, a cursor this far behind can never be scanned back to the head (the
// providers stop serving logs and state that old, and one run reads far fewer blocks than
// the chain adds). The range is recorded as an incident for a manual backfill and scanning
// resumes near the head, instead of standing still for good as it did from 2026-10-29.
const MAX_SCAN_BACKLOG_BLOCKS = 20_000n;
const RESUME_BEHIND_BLOCKS = 300n;
const GAS_MARGIN_BPS = 12_500n; // 1.25x safety margin on the exact-transaction gas estimate

const CHAIN_DEFS: Record<number, Chain> = { 8453: base, 1: mainnet };

type RpcResult = { data: unknown; error: { message: string } | null };

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>;

type Query = {
  select: (columns: string) => Query;
  eq: (column: string, value: unknown) => Query;
  gte: (column: string, value: unknown) => Query;
  lte: (column: string, value: unknown) => Query;
  is: (column: string, value: null) => Query;
  order: (column: string, options: { ascending: boolean }) => Query;
  limit: (rows: number) => Query;
  update: (values: Record<string, unknown>) => Query;
  single: () => Promise<RpcResult>;
  maybeSingle: () => Promise<RpcResult>;
  then: Promise<RpcResult>["then"];
};

type Admin = { from: (table: string) => Query };

type CryptoSettings = {
  payout_float_max_cents: number | string | null;
  daily_global_limit_cents: number | string | null;
  auto_approve_cents: number | string | null;
  crypto_system_enabled: boolean;
  deposits_enabled: boolean;
  withdrawals_enabled: boolean;
  overlap_blocks: number | string;
};

type ChainNetworkPolicy = {
  network_mode: "testnet" | "mainnet";
  credit_confirmations: number | string;
  min_deposit_cents: number | string | null;
  is_enabled?: boolean;
};

type ObservedTransfer = {
  address: string;
  removed?: boolean;
  transactionHash: Hex;
  logIndex: number;
  blockNumber: bigint;
  args: { value?: bigint; from?: string; to?: string };
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rpc: Rpc = async (fn, args) =>
    (await supabaseAdmin.rpc(fn as never, (args ?? {}) as never)) as RpcResult;
  return { admin: supabaseAdmin as unknown as Admin, rpc };
}

async function must<T>(p: Promise<RpcResult>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export interface Env {
  chainId: number;
  chain: Chain;
  networkMode: "testnet" | "mainnet";
  client: PublicClient;
  clientB: PublicClient | null; // second independent RPC provider for agreement checks
  treasury: `0x${string}`;
  payout: `0x${string}`;
  /** Enabled USDC contract. Null when USDC deposits and payouts are off. */
  usdc: `0x${string}` | null;
  /** Known USDC contract for balance reads, including while deposits are disabled. */
  usdcRead: `0x${string}` | null;
  ethFeed: `0x${string}` | null;
  ethEnabled: boolean;
  settings: CryptoSettings;
  network: ChainNetworkPolicy;
  minDepositUnits: Record<string, bigint>;
}

function rpcUrlFor(chainId: number, secondary = false): string | undefined {
  const suffix = secondary ? `_${chainId}_B` : `_${chainId}`;
  const url = workerEnv(`CRYPTO_RPC_URL${suffix}`);
  if (url) return url;
  return undefined;
}

/**
 * This chain's transfer index: Alchemy's endpoint from its own secret, or either RPC URL when
 * that is an Alchemy endpoint. Null without one: the log and block scans then find deposits.
 */
function depositIndex(chainId: number): string | null {
  return alchemyIndexFromUrls(
    [workerEnv(`CRYPTO_ALCHEMY_URL_${chainId}`), rpcUrlFor(chainId), rpcUrlFor(chainId, true)],
    chainId,
  );
}

async function alchemyPage(url: string, body: string): Promise<AlchemyTransferPage> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  if (!res.ok) throw new Error("INDEX_HTTP");
  const json = (await res.json()) as AlchemyTransferPage;
  if (json.error) throw new Error("INDEX_RPC");
  return json;
}

function checkChainRpcUrl(
  _chainId: number,
  url: string | undefined,
): { ok: true } | { ok: false; reason: string } {
  return checkRpcUrl(url);
}

/** Enabled chains from the registry. Workers iterate these; disabled chains are observe-only. */
export async function enabledChainIds(): Promise<number[]> {
  const { admin } = await db();
  const { data } = await admin.from("chain_networks").select("chain_id").eq("is_enabled", true);
  return ((data ?? []) as { chain_id?: number | string }[]).map((r) => Number(r.chain_id));
}

/** Refuses to return unless every invariant for the chain holds. Raises an incident on failure. */
export async function loadChainEnv(
  chainId: number,
): Promise<{ ok: true; env: Env } | { ok: false; reason: string }> {
  const { admin, rpc } = await db();
  const fail = async (reason: string) => {
    await rpc("crypto_raise_incident", {
      p_check: "crypto_env",
      p_fp: `crypto_env:${chainId}:${reason}:${new Date().toISOString().slice(0, 13)}`,
      p_details: { reason, chain_id: chainId },
    });
    return { ok: false as const, reason };
  };
  const chain = CHAIN_DEFS[chainId];
  if (!chain) return { ok: false, reason: "CHAIN_UNKNOWN" };
  const rpcCheck = checkChainRpcUrl(chainId, rpcUrlFor(chainId));
  if (!rpcCheck.ok) return fail(rpcCheck.reason);
  const [{ data: s }, { data: net }, { data: assets }, { data: tr }] = await Promise.all([
    admin.from("crypto_settings").select("*").single(),
    admin.from("chain_networks").select("*").eq("chain_id", chainId).maybeSingle(),
    admin.from("chain_assets").select("*").eq("chain_id", chainId),
    admin.from("chain_treasury_accounts").select("*").eq("chain_id", chainId).eq("is_active", true),
  ]);
  const settings = s as CryptoSettings | null;
  const network = net as ChainNetworkPolicy | null;
  if (!settings) return fail("SETTINGS_MISSING");
  if (!network?.is_enabled) return fail("CHAIN_DISABLED");
  const rails = resolveChainEnvAssets((assets ?? []) as ChainAssetConfig[]);
  if (!rails.ok) return fail(rails.reason);
  const { usdc, eth } = rails;
  const assetRows = (assets ?? []) as {
    asset_key?: string;
    contract_address?: string | null;
    min_deposit_units?: string | number | null;
    price_feed_address?: string | null;
  }[];
  const usdcRow = assetRows.find((a) => a.asset_key === "USDC") ?? null;
  const ethRow = assetRows.find((a) => a.asset_key === "ETH") ?? null;

  if (network.network_mode !== "mainnet") return fail("TESTNET_REMOVED");
  {
    // Mainnet chains: each enabled asset must match the known-good Circle/Chainlink
    // value. A disabled sibling is not required.
    const mc = checkMainnetRegistry({
      chainId,
      networkMode: network.network_mode,
      ...(usdc ? { usdc: usdc.contract_address, usdcDecimals: Number(usdc.decimals) } : {}),
      ...(eth ? { feed: eth.price_feed_address } : {}),
    });
    if (!mc.ok) return fail(mc.reason);
    // Risk/emergency settings must be present before real money moves.
    if (
      settings.payout_float_max_cents == null ||
      settings.daily_global_limit_cents == null ||
      settings.auto_approve_cents == null
    ) {
      return fail("RISK_SETTINGS_MISSING");
    }
  }

  const client = createPublicClient({
    chain,
    transport: http(rpcUrlFor(chainId), { timeout: 10_000, retryCount: 1 }),
  }) as PublicClient;
  let liveChain: number;
  try {
    liveChain = await client.getChainId();
  } catch (error) {
    logCryptoOps("crypto_rpc_probe_failed", { chainId, provider: "primary", ...rpcFailure(error) });
    return { ok: false, reason: "RPC_UNREACHABLE" };
  }
  if (liveChain !== chainId) return fail("RPC_CHAIN_MISMATCH");
  if (usdc) {
    const code = await client
      .getCode({ address: usdc.contract_address as Hex })
      .catch(() => undefined);
    if (!code || code === "0x") return fail("USDC_NO_CODE");
  }

  // Second independent provider: required for mainnet crediting (RPC agreement), optional on testnet.
  let clientB: PublicClient | null = null;
  const urlB = rpcUrlFor(chainId, true);
  if (urlB && checkChainRpcUrl(chainId, urlB).ok) {
    const cB = createPublicClient({
      chain,
      transport: http(urlB, { timeout: 10_000, retryCount: 1 }),
    }) as PublicClient;
    try {
      if ((await cB.getChainId()) === chainId) clientB = cB;
    } catch {
      clientB = null;
    }
  }
  // Mainnet credits require two independent RPCs (providersAgree). Missing B used
  // to observe deposits forever without crediting — fail the env so ops notices.
  if (network.network_mode === "mainnet" && !clientB) return fail("RPC_B_MISSING");

  const treasuryRows = tr as { role?: string; address?: string }[] | null;
  const treasury = treasuryRows?.find((t) => t.role === "deposit")?.address?.toLowerCase();
  const payout = treasuryRows?.find((t) => t.role === "payout")?.address?.toLowerCase();
  if (!treasury || !payout) return fail("TREASURY_MISSING");
  return {
    ok: true,
    env: {
      chainId,
      chain,
      networkMode: network.network_mode,
      client,
      clientB,
      treasury: treasury as `0x${string}`,
      payout: payout as `0x${string}`,
      usdc: usdc ? ((usdc.contract_address as string).toLowerCase() as `0x${string}`) : null,
      usdcRead:
        usdc?.contract_address?.toLowerCase() === BASE_MAINNET.usdc ||
        usdcRow?.contract_address?.toLowerCase() === BASE_MAINNET.usdc
          ? BASE_MAINNET.usdc
          : null,
      ethFeed: (eth?.price_feed_address?.toLowerCase() ??
        (ethRow?.price_feed_address?.toLowerCase() === BASE_MAINNET.ethUsdFeed
          ? BASE_MAINNET.ethUsdFeed
          : null)) as `0x${string}` | null,
      ethEnabled: !!eth,
      settings,
      network,
      minDepositUnits: {
        ...(usdc ? { USDC: BigInt(usdc.min_deposit_units as string | number) } : {}),
        ...(eth
          ? {
              ETH: BigInt(
                Number(eth.min_deposit_units).toLocaleString("fullwide", { useGrouping: false }),
              ),
            }
          : {}),
      },
    },
  };
}

function asRound(raw: readonly [bigint, bigint, bigint, bigint, bigint]): ChainlinkRound {
  const [roundId, answer, startedAt, updatedAt, answeredInRound] = raw;
  return { roundId, answer, startedAt, updatedAt, answeredInRound };
}

async function notePriceFailure(chainId: number, reason: string) {
  const { rpc } = await db();
  await rpc("crypto_raise_incident", {
    p_check: "crypto_price",
    p_fp: `crypto_price:${chainId}:${reason}:${new Date().toISOString().slice(0, 13)}`,
    p_details: { chain_id: chainId, reason },
  }).catch(() => undefined);
}

/**
 * Reads Chainlink ETH/USD on the server and stores the exact round.
 * `observed_at` is this read. `oracle_updated_at` is the feed's updatedAt.
 * A browser price is never accepted. A missed heartbeat returns null and leaves deposits uncredited.
 */
export async function snapshotEthPrice(
  env: Env,
): Promise<{ id: string; priceMicro: bigint } | null> {
  if (!env.ethFeed) return null;
  const { rpc } = await db();
  const feed = env.ethFeed as Hex;
  const nowSeconds = Date.now() / 1000;
  let roundRaw: readonly [bigint, bigint, bigint, bigint, bigint];
  let decimals: number;
  let sequencer: readonly [bigint, bigint, bigint, bigint, bigint] | null = null;
  try {
    const reads: Promise<unknown>[] = [
      env.client.readContract({ address: feed, abi: FEED, functionName: "latestRoundData" }),
      env.client.readContract({ address: feed, abi: FEED, functionName: "decimals" }),
    ];
    if (env.chainId === 8453) {
      reads.push(
        env.client.readContract({
          address: BASE_SEQUENCER_UPTIME_FEED as Hex,
          abi: FEED,
          functionName: "latestRoundData",
        }),
      );
    }
    const out = await Promise.all(reads);
    roundRaw = out[0] as typeof roundRaw;
    decimals = Number(out[1]);
    if (out[2]) sequencer = out[2] as NonNullable<typeof sequencer>;
  } catch {
    await notePriceFailure(env.chainId, "OUTAGE");
    return null;
  }
  if (sequencer) {
    const seq = assessSequencerRound(sequencer, nowSeconds);
    if (!seq.ok) {
      await notePriceFailure(env.chainId, seq.reason);
      return null;
    }
  }
  const decision = assessEthUsdRound(asRound(roundRaw), decimals, nowSeconds);
  if (!decision.ok) {
    await notePriceFailure(env.chainId, decision.reason);
    return null;
  }
  if (decimals !== BASE_ETH_USD_DECIMALS) return null;
  try {
    const id = await must<string>(
      rpc("crypto_record_price", {
        p_chain: env.chainId,
        p_asset: "ETH",
        p_feed: feed,
        p_round: decision.roundId.toString(),
        p_price_micro: Number(decision.priceMicro),
        p_observed: new Date().toISOString(),
        p_oracle_updated: new Date(Number(decision.updatedAt) * 1000).toISOString(),
      }),
    );
    return { id, priceMicro: decision.priceMicro };
  } catch {
    await notePriceFailure(env.chainId, "RECORD_REJECTED");
    return null;
  }
}

/** Reads deposit-treasury and payout-wallet balances. Never reads or returns a private key. */
export async function publishChainInventory(env: Env, hotKeyMatches: boolean | null) {
  const { rpc } = await db();
  const readUsdc = (address: `0x${string}`) =>
    env.usdcRead
      ? (env.client.readContract({
          address: env.usdcRead,
          abi: ERC20,
          functionName: "balanceOf",
          args: [address],
        }) as Promise<bigint>)
      : Promise.resolve(0n);
  const [depositWei, payoutWei, depositUsdc, payoutUsdc] = await Promise.all([
    env.client.getBalance({ address: env.treasury }),
    env.client.getBalance({ address: env.payout }),
    readUsdc(env.treasury),
    readUsdc(env.payout),
  ]);
  const price = await snapshotEthPrice(env).catch(() => null);
  await must(
    rpc("crypto_record_inventory", {
      p_chain: env.chainId,
      p_deposit_wei: depositWei.toString(),
      p_payout_wei: payoutWei.toString(),
      p_deposit_usdc: depositUsdc.toString(),
      p_payout_usdc: payoutUsdc.toString(),
      p_price_micro: price ? Number(price.priceMicro) : null,
      p_hot_key_matches: hotKeyMatches,
      p_price_ok: !!price,
    }),
  );
}

/**
 * A third RPC provider, used only to stand in for one of the two that cannot serve an old
 * block: the Alchemy endpoint, when it is neither of them. Null without one, or when it is not
 * this chain. Made on first use (most runs never need it).
 */
const verifiers = new WeakMap<Env, Promise<PublicClient | null>>();
function thirdProvider(env: Env): Promise<PublicClient | null> {
  let made = verifiers.get(env);
  if (!made) {
    made = (async () => {
      const url = alchemyIndexFromUrls(
        [workerEnv(`CRYPTO_ALCHEMY_URL_${env.chainId}`)],
        env.chainId,
      );
      if (!url) return null;
      const host = (u: string | undefined) => {
        try {
          return u ? new URL(u).hostname : null;
        } catch {
          return null;
        }
      };
      // Independent means another provider, not another key of the same one.
      if ([rpcUrlFor(env.chainId), rpcUrlFor(env.chainId, true)].some((u) => host(u) === host(url)))
        return null;
      const client = createPublicClient({
        chain: env.chain,
        transport: http(url, { timeout: 10_000, retryCount: 1 }),
      }) as PublicClient;
      return (await client.getChainId().catch(() => null)) === env.chainId ? client : null;
    })();
    verifiers.set(env, made);
  }
  return made;
}

/** One provider's receipt and block for a transaction. A failed read is null, never a guess. */
async function evidenceFrom(
  client: PublicClient,
  txHash: Hex,
  blockNumber: bigint,
  byNumber: boolean,
): Promise<ProviderEvidence> {
  const [receipt, numbered] = await Promise.all([
    client.getTransactionReceipt({ hash: txHash }).catch(() => null),
    byNumber ? client.getBlock({ blockNumber }).catch(() => null) : null,
  ]);
  // By hash when the provider does not serve the block by number (some plans only serve recent
  // blocks that way). The provider's own receipt is then what says the block is canonical.
  const block =
    numbered ??
    (receipt ? await client.getBlock({ blockHash: receipt.blockHash }).catch(() => null) : null);
  return { receipt, block };
}

/**
 * RPC agreement (provider-agreement.ts): two independent providers must attest to the
 * transaction's receipt, its block and the exact log being credited, and match; no provider may
 * say otherwise. A provider that cannot serve the block is not a disagreement, but the credit
 * still needs two that can: the third provider is asked only then. Anything less fails closed:
 * no credit, retry next run, an incident naming what each provider said.
 */
async function providersAgree(
  env: Env,
  txHash: string,
  blockNumber: bigint,
  logIndex: number | null,
): Promise<Agreement> {
  // Mainnet requires two providers.
  if (!env.clientB)
    return env.networkMode === "testnet"
      ? { ok: true, by: ["A"] }
      : { ok: false, reason: "B:none" };
  const hash = txHash as Hex;
  const [a, b] = await Promise.all([
    evidenceFrom(env.client, hash, blockNumber, true),
    evidenceFrom(env.clientB, hash, blockNumber, false),
  ]);
  const readings: Record<string, Reading> = {
    A: readEvidence(a, hash, blockNumber, logIndex),
    B: readEvidence(b, hash, blockNumber, logIndex),
  };
  const two = agreement(readings);
  if (two.ok || !anotherCouldHelp(readings)) return two;
  const third = await thirdProvider(env);
  if (!third) return two;
  readings["C"] = readEvidence(
    await evidenceFrom(third, hash, blockNumber, true),
    hash,
    blockNumber,
    logIndex,
  );
  return agreement(readings);
}

/**
 * Fetch Transfer logs over [from, to], splitting the range adaptively when the
 * RPC provider rejects it (e.g. free-tier 10-block eth_getLogs caps). Fails
 * closed only when even a single-block query is rejected.
 */
async function getLogsChunked(
  client: PublicClient,
  args: { address: Hex; event: typeof TRANSFER; args: { to: Hex[] } },
  from: bigint,
  to: bigint,
): Promise<ObservedTransfer[]> {
  try {
    return (await client.getLogs({
      ...args,
      fromBlock: from,
      toBlock: to,
    })) as ObservedTransfer[];
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/Too many subrequests/i.test(message)) {
      throw new Error("Too many subrequests by single Worker invocation");
    }
    if (from >= to) throw new Error(message.replace(/https?:\/\/\S+/g, "[rpc]").slice(0, 240));
    const mid = from + (to - from) / 2n;
    const left = await getLogsChunked(client, args, from, mid);
    const right = await getLogsChunked(client, args, mid + 1n, to);
    return [...left, ...right];
  }
}

async function observeNativeTransfer(
  env: Env,
  tx: { hash: string; from: string; to: string; blockNumber: bigint; value: bigint },
): Promise<boolean> {
  if (tx.value <= 0n || tx.to.toLowerCase() !== env.treasury) return false;
  if (belowDepositMinimum(env.minDepositUnits, "ETH", tx.value)) return false;
  const { rpc } = await db();
  await must(
    rpc("crypto_observe_deposit", {
      p_chain: env.chainId,
      p_asset: "ETH",
      p_tx: tx.hash,
      p_log: NATIVE_LOG_INDEX,
      p_block: Number(tx.blockNumber),
      p_from: tx.from,
      p_to: tx.to,
      p_units: tx.value.toString(),
    }),
  );
  return true;
}

type BlockWindow = { from: bigint; to: bigint };

/**
 * USDC sent to the treasury within `window`, found through Alchemy's transfer index
 * (alchemy-index.ts). The index names the transactions; each one's receipt is read from the
 * chain and its Transfer logs are what gets recorded. Transactions already recorded are skipped
 * without a chain read. Returns how far the window was completed (`window.to` when all of it).
 * Throws on any index or database error: never "no deposits".
 */
async function scanUsdcViaIndex(
  env: Env,
  indexUrl: string,
  window: BlockWindow,
): Promise<{ scannedTo: bigint; observed: number; missed: number }> {
  if (!env.usdc) throw new Error("INDEX_CHAIN");
  const targets = new Set([env.treasury.toLowerCase()]);
  const found = new Map<string, UsdcCandidate>();
  let pageKey: string | undefined;
  for (let page = 0; page < ALCHEMY_MAX_PAGES; page++) {
    const json = await alchemyPage(
      indexUrl,
      alchemyTransfersBody(env.treasury, window.from, window.to, { usdc: env.usdc }, pageKey),
    );
    for (const c of alchemyUsdcCandidates(json, env.usdc, targets, window.from, window.to))
      if (!found.has(c.hash)) found.set(c.hash, c);
    pageKey = json.result?.pageKey || undefined;
    if (!pageKey) break;
    if (page === ALCHEMY_MAX_PAGES - 1) throw new Error("INDEX_TRUNCATED");
  }
  if (!found.size) return { scannedTo: window.to, observed: 0, missed: 0 };

  // Already recorded: nothing to read again.
  const { admin, rpc } = await db();
  const known = await must<{ tx_hash?: string }[] | null>(
    admin
      .from("crypto_deposits")
      .select("tx_hash")
      .eq("chain_id", env.chainId)
      .eq("asset_key", "USDC")
      .gte("block_number", Number(window.from))
      .lte("block_number", Number(window.to)) as unknown as Promise<RpcResult>,
  );
  const recorded = new Set((known ?? []).map((r) => String(r.tx_hash).toLowerCase()));
  const todo = [...found.values()]
    .filter((c) => !recorded.has(c.hash))
    // Dust by the index's own amount is left alone (as the log scan leaves it), unread.
    .filter((c) => c.units === null || !belowDepositMinimum(env.minDepositUnits, "USDC", c.units))
    .sort((a, b) => (a.block < b.block ? -1 : a.block > b.block ? 1 : 0));

  let scannedTo = window.to;
  let observed = 0;
  let read = 0;
  // Named by the index but not readable from the chain in this run.
  let missed = 0;
  for (const c of todo) {
    if (read >= USDC_INDEX_MAX_RECEIPTS) {
      // The rest waits for the next run; the scan stops short of the first one left.
      scannedTo = c.block - 1n;
      break;
    }
    read++;
    const receipt = await env.client.getTransactionReceipt({ hash: c.hash }).catch((e) => {
      const message = e instanceof Error ? e.message : String(e);
      if (/Too many subrequests/i.test(message)) throw e;
      return null;
    });
    // Not on this chain (yet, or any more): the next runs look at this range again.
    if (!receipt) missed++;
    if (!receipt || receipt.status !== "success") continue;
    for (const l of usdcTransfersInReceipt(receipt.logs, env.usdc, targets)) {
      if (belowDepositMinimum(env.minDepositUnits, "USDC", l.units)) continue;
      await must(
        rpc("crypto_observe_deposit", {
          p_chain: env.chainId,
          p_asset: "USDC",
          p_tx: receipt.transactionHash,
          p_log: l.logIndex,
          p_block: Number(receipt.blockNumber),
          p_from: getAddress(l.from),
          p_to: getAddress(l.to),
          p_units: l.units.toString(),
        }),
      );
      observed++;
    }
  }
  return { scannedTo, observed, missed };
}

/**
 * Top-level ETH sent to the treasury within `window`, from Alchemy's transfer index
 * (recording is idempotent). Throws on any index error: never "no deposits".
 */
async function scanNativeViaIndex(
  env: Env,
  indexUrl: string,
  window: BlockWindow,
): Promise<{ scannedTo: bigint; observed: number; missed: number }> {
  let observed = 0;
  let pageKey: string | undefined;
  for (let page = 0; page < ALCHEMY_MAX_PAGES; page++) {
    const json = await alchemyPage(
      indexUrl,
      alchemyTransfersBody(env.treasury, window.from, window.to, "native", pageKey),
    );
    for (const t of alchemyNativeTransfers(json, env.treasury, window.from, window.to))
      if (await observeNativeTransfer(env, t)) observed++;
    pageKey = json.result?.pageKey || undefined;
    if (!pageKey) break;
    if (page === ALCHEMY_MAX_PAGES - 1) throw new Error("INDEX_TRUNCATED");
  }
  return { scannedTo: window.to, observed, missed: 0 };
}

/**
 * A recorded scan gap read after all (2026-11-11). When the watcher has no index and a backlog
 * the block-by-block scan cannot close, it records the range as a `crypto_scan_gap` incident
 * and resumes at the head: on 2026-11-11 that left 2.6 million blocks unread, with a 24 USDC
 * deposit in them, because the build went live twenty minutes before its index's secret. With
 * the index, one open gap a run is read (the same scans, over the gap's blocks) and the
 * incident is closed once all of it has been. What it finds is credited by the usual pass.
 */
async function backfillScanGap(env: Env, indexUrl: string): Promise<number> {
  const { admin } = await db();
  const open = await must<{ id: number; details: Record<string, unknown> | null }[] | null>(
    admin
      .from("integrity_incidents")
      .select("id,details")
      .eq("check_name", "crypto_scan_gap")
      .is("acknowledged_at", null)
      .order("id", { ascending: true })
      .limit(8) as unknown as Promise<RpcResult>,
  );
  for (const row of open ?? []) {
    const gap = scanGapOf(row.details, env.chainId);
    if (!gap) continue;
    if (gap.asset === "USDC" ? !env.usdc : !env.ethEnabled) continue;
    const scan =
      gap.asset === "USDC"
        ? await scanUsdcViaIndex(env, indexUrl, gap)
        : await scanNativeViaIndex(env, indexUrl, gap);
    // Closed only when every transaction the index named in it was read from the chain.
    if (scan.scannedTo >= gap.to && scan.missed === 0)
      await must(
        admin
          .from("integrity_incidents")
          .update({
            acknowledged_at: new Date().toISOString(),
            acknowledged_note: `read from the transfer index: ${scan.observed} deposit(s) recorded in this pass`,
          })
          .eq("id", row.id) as unknown as Promise<RpcResult>,
      );
    return scan.observed;
  }
  return 0;
}

/**
 * Bounded getBlock fallback. One block at a time, a few blocks per run.
 * A parallel batch of full blocks exhausted Worker memory and Cloudflare
 * killed the isolate (1102), including the withdrawal cron sharing it.
 * Advances only through blocks that were actually read.
 */
async function scanNativeViaBlocks(
  env: Env,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<{ scannedTo: bigint; observed: number }> {
  const end =
    toBlock < fromBlock + BigInt(MAX_ETH_BLOCK_FALLBACK) - 1n
      ? toBlock
      : fromBlock + BigInt(MAX_ETH_BLOCK_FALLBACK) - 1n;
  let observed = 0;
  for (let b = fromBlock; b <= end; b++) {
    const blk = await env.client.getBlock({ blockNumber: b, includeTransactions: true });
    for (const tx of blk.transactions) {
      if (typeof tx === "string" || !tx.to || tx.value <= 0n) continue;
      const seen = await observeNativeTransfer(env, {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        blockNumber: blk.number!,
        value: tx.value,
      });
      if (seen) observed++;
    }
  }
  return { scannedTo: end, observed };
}

/** Deposit watcher for one chain: scan, re-scan overlap, verify, credit idempotently. */
export async function runDepositWatcher(chainId: number) {
  const envr = await loadChainEnv(chainId);
  if (!envr.ok) return { ok: false, reason: envr.reason };
  const env = envr.env;
  const { rpc } = await db();
  const s = env.settings;
  if (!s.crypto_system_enabled) return { ok: true, paused: true };
  const startedAt = Date.now();
  let detectMs = 0;
  const stages = () => {
    const totalMs = Date.now() - startedAt;
    return {
      detectMs: detectMs > 0 ? detectMs : totalMs,
      creditMs: detectMs > 0 ? Math.max(0, totalMs - detectMs) : 0,
      totalMs,
    };
  };

  const latest = await env.client.getBlockNumber();
  // No safe head means no finality proof: observe, but credit nothing this run.
  // The safe head from the first provider, or from the second when the first does not serve
  // it (in production on 2026-11-10 it did not, which alone would hold every credit back).
  const safeHead = (client: PublicClient) =>
    client
      .getBlock({ blockTag: "safe" })
      .then((b) => b.number ?? null)
      .catch(() => null);
  const safeBlock =
    (await safeHead(env.client)) ?? (env.clientB ? await safeHead(env.clientB) : null);

  let observed = 0;
  let credited = 0;
  let passes = 0;
  let lastCursor = 0n;
  let skippedEth = false;
  let usdcError: string | null = null;
  let usdcIndexError: string | null = null;

  // Multiple passes when far behind: USDC catch-up must finish and advance the
  // cursor every window. Cloudflare Workers abort mid-run on subrequest budget;
  // advancing after each USDC window means a kill cannot freeze deposits again.
  // A USDC failure must not skip the ETH cursor or the credit pass below.
  // A disabled USDC row is not scanned and does not move the USDC cursor.
  // The transfer index (Alchemy) finds deposits whatever the block rate. The log scan below is
  // the fallback without it or when it fails.
  const index = depositIndex(env.chainId);
  const usdcIndex = index !== null;
  let usdcIndexed = false;
  if (env.usdc) {
    try {
      if (index) {
        try {
          const cursorRaw = await must<number | null>(
            rpc("crypto_get_cursor", { p_chain: env.chainId }),
          );
          const cursor = cursorRaw == null ? latest - 5n : BigInt(cursorRaw);
          lastCursor = cursor;
          // Every run looks again at the last 50,000 blocks behind the cursor (an index that
          // lags is caught up) and stays 100 blocks behind the head.
          const window = usdcIndexWindow(cursor, latest);
          if (window) {
            const scan = await scanUsdcViaIndex(env, index, window);
            observed += scan.observed;
            if (scan.scannedTo > cursor) {
              await must(
                rpc("crypto_set_cursor", { p_chain: env.chainId, p_block: Number(scan.scannedTo) }),
              );
              lastCursor = scan.scannedTo;
            }
          }
          passes++;
          usdcIndexed = true;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (/Too many subrequests/i.test(message)) throw e;
          usdcIndexError = message.replace(/https?:\/\/\S+/g, "[rpc]").slice(0, 240);
        }
      }
      for (let pass = 0; !usdcIndexed && pass < MAX_CATCH_UP_PASSES; pass++) {
        const cursorRaw = await must<number | null>(
          rpc("crypto_get_cursor", { p_chain: env.chainId }),
        );
        let cursor = cursorRaw == null ? latest - 5n : BigInt(cursorRaw);
        lastCursor = cursor;
        if (cursor >= latest) break;
        if (!usdcIndex && latest - cursor > MAX_SCAN_BACKLOG_BLOCKS) {
          // No index and a backlog the log scan cannot close: record the range, resume near
          // the head. The incident is written first; without it the cursor does not move.
          const resume = latest - RESUME_BEHIND_BLOCKS;
          await must(
            rpc("crypto_raise_incident", {
              p_check: "crypto_scan_gap",
              p_fp: `crypto_scan_gap:${env.chainId}:USDC:${cursor + 1n}-${resume}`,
              p_details: {
                chain_id: env.chainId,
                asset: "USDC",
                from: Number(cursor + 1n),
                to: Number(resume),
              },
            }),
          );
          await must(rpc("crypto_set_cursor", { p_chain: env.chainId, p_block: Number(resume) }));
          cursor = resume;
          lastCursor = cursor;
        }

        const gap = latest - cursor;
        const catchUp = gap > CATCH_UP_GAP_BLOCKS;
        const maxBlocks = catchUp ? MAX_ETH_BLOCKS_CATCH_UP : MAX_ETH_BLOCKS_STEADY;
        const configuredOverlap = BigInt(s.overlap_blocks);
        const overlap =
          configuredOverlap > MAX_OVERLAP_BLOCKS ? MAX_OVERLAP_BLOCKS : configuredOverlap;
        const ethTo = latest < cursor + BigInt(maxBlocks) ? latest : cursor + BigInt(maxBlocks);
        const logFrom = cursor > overlap ? cursor - overlap : 0n;
        const logTo = ethTo;

        const watched = [env.treasury] as Hex[];

        // USDC first — this is the real-money rail. Advance cursor before ETH scan.
        // Primary reads the logs. If that provider fails, the secondary reads the
        // same window. Crediting still requires both receipts to agree.
        const readUsdcLogs = async (client: PublicClient) => {
          for (let from = logFrom; from <= logTo; from += MAX_LOG_RANGE) {
            const to = from + MAX_LOG_RANGE - 1n < logTo ? from + MAX_LOG_RANGE - 1n : logTo;
            const logs = await getLogsChunked(
              client,
              { address: env.usdc as Hex, event: TRANSFER, args: { to: watched } },
              from,
              to,
            );
            for (const l of logs) {
              if (l.address.toLowerCase() !== env.usdc || !l.args.value || l.removed) continue;
              if (belowDepositMinimum(env.minDepositUnits, "USDC", l.args.value)) continue;
              await must(
                rpc("crypto_observe_deposit", {
                  p_chain: env.chainId,
                  p_asset: "USDC",
                  p_tx: l.transactionHash,
                  p_log: l.logIndex,
                  p_block: Number(l.blockNumber),
                  p_from: l.args.from,
                  p_to: l.args.to,
                  p_units: l.args.value.toString(),
                }),
              );
              observed++;
            }
          }
        };
        try {
          await readUsdcLogs(env.client);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (/Too many subrequests/i.test(message) || !env.clientB) throw err;
          await readUsdcLogs(env.clientB);
        }

        // USDC cursor only. Native ETH has its own cursor and is scanned below.
        await must(rpc("crypto_set_cursor", { p_chain: env.chainId, p_block: Number(ethTo) }));
        lastCursor = ethTo;
        passes++;

        if (!catchUp || ethTo >= latest) break;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // The budget is already spent. Continuing into the ETH scan makes further
      // subrequests, and Cloudflare aborts the isolate instead of throwing.
      if (/Too many subrequests/i.test(message)) {
        return {
          ok: false,
          reason: "SUBREQUEST_LIMIT",
          chain: env.chainId,
          cursor: Number(lastCursor),
          passes,
          observed,
          stages: stages(),
        };
      }
      usdcError = message.replace(/https?:\/\/\S+/g, "[rpc]").slice(0, 240);
    }
  }

  let ethAt: bigint | null = null;
  if (env.ethEnabled) {
    const ethCursorRaw = await must<number | null>(
      rpc("crypto_get_eth_cursor", { p_chain: env.chainId }),
    );
    let ethCursor = ethCursorRaw == null ? latest : BigInt(ethCursorRaw);
    ethAt = ethCursor;
    // The transfer index is asked first; the block reader follows without it or when it fails.
    let ethIndexed = false;
    if (index) {
      try {
        // Each run looks again at the last 2,000 blocks behind the cursor and stays 100 blocks
        // behind the head.
        const window = alchemyEthWindow(ethCursor, latest);
        if (window) {
          const scan = await scanNativeViaIndex(env, index, window);
          observed += scan.observed;
          if (scan.scannedTo > ethCursor) {
            await must(
              rpc("crypto_set_eth_cursor", {
                p_chain: env.chainId,
                p_block: Number(scan.scannedTo),
              }),
            );
            ethCursor = scan.scannedTo;
            ethAt = ethCursor;
          }
        }
        ethIndexed = true;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (/Too many subrequests/i.test(message)) {
          return {
            ok: false,
            reason: "SUBREQUEST_LIMIT",
            chain: env.chainId,
            cursor: Number(lastCursor),
            passes,
            skippedEth: true,
            observed,
            stages: stages(),
          };
        }
        // The block reader below takes this run.
      }
    }
    if (!index && latest - ethCursor > MAX_SCAN_BACKLOG_BLOCKS) {
      // Block-by-block reading (three blocks a run) can never close this: record and resume.
      // (backfillScanGap reads the range once an index is configured.)
      const resume = latest - RESUME_BEHIND_BLOCKS;
      await must(
        rpc("crypto_raise_incident", {
          p_check: "crypto_scan_gap",
          p_fp: `crypto_scan_gap:${env.chainId}:ETH:${ethCursor + 1n}-${resume}`,
          p_details: {
            chain_id: env.chainId,
            asset: "ETH",
            from: Number(ethCursor + 1n),
            to: Number(resume),
          },
        }),
      );
      await must(rpc("crypto_set_eth_cursor", { p_chain: env.chainId, p_block: Number(resume) }));
      ethCursor = resume;
      ethAt = ethCursor;
    }
    if (!ethIndexed && ethCursor < latest) {
      try {
        const ethScan = await scanNativeViaBlocks(env, ethCursor + 1n, latest);
        observed += ethScan.observed;
        await must(
          rpc("crypto_set_eth_cursor", {
            p_chain: env.chainId,
            p_block: Number(ethScan.scannedTo),
          }),
        );
        if (ethScan.scannedTo > ethCursor) ethAt = ethScan.scannedTo;
        skippedEth = ethScan.scannedTo < latest;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (/Too many subrequests/i.test(message)) {
          return {
            ok: false,
            reason: "SUBREQUEST_LIMIT",
            chain: env.chainId,
            cursor: Number(lastCursor),
            passes,
            skippedEth: true,
            observed,
            stages: stages(),
          };
        }
        // Leave the ETH cursor where it is. The next run retries this range.
        skippedEth = true;
      }
    }
  }

  // Ranges an earlier run had to skip, read now that there is an index (one gap a run).
  let backfilled = 0;
  if (index) {
    try {
      backfilled = await backfillScanGap(env, index);
      observed += backfilled;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/Too many subrequests/i.test(message)) {
        return {
          ok: false,
          reason: "SUBREQUEST_LIMIT",
          chain: env.chainId,
          cursor: Number(lastCursor),
          passes,
          observed,
          stages: stages(),
        };
      }
      // The gap stays open: the next run reads it again.
    }
  }

  const price = await snapshotEthPrice(env).catch(() => null);
  detectMs = Date.now() - startedAt;
  let creditDeferred = 0;

  // Credit: re-verify every pending deposit against the chain before crediting.
  // A missing ETH price leaves the deposit DETECTED so a later round can credit it once.
  if (s.deposits_enabled && safeBlock != null) {
    const confThreshold =
      latest - BigInt(Math.max(0, Number(env.network.credit_confirmations) - 1));
    const creditAt = safeBlock < confThreshold ? safeBlock : confThreshold;
    const pending = await must<
      {
        id: string;
        tx_hash: Hex;
        block_number: number | string;
        asset_key: string;
        log_index: number | null;
        from_address: string;
        to_address: string;
        units: string | number;
      }[]
    >(rpc("crypto_pending_deposits", { p_chain: env.chainId, p_max_block: Number(latest) }));
    for (const d of pending ?? []) {
      const receipt = await env.client.getTransactionReceipt({ hash: d.tx_hash }).catch(() => null);
      if (!receipt || receipt.status !== "success") continue;
      if (receipt.blockNumber !== BigInt(d.block_number)) {
        await must(
          rpc("crypto_observe_deposit", {
            p_chain: env.chainId,
            p_asset: d.asset_key,
            p_tx: d.tx_hash,
            p_log: d.log_index,
            p_block: Number(receipt.blockNumber),
            p_from: d.from_address,
            p_to: d.to_address,
            p_units: String(d.units),
          }),
        );
      }
      if (receipt.blockNumber > creditAt) continue;
      const dest = String(d.to_address).toLowerCase();
      if (d.asset_key === "USDC") {
        if (!env.usdc) continue;
        const log = receipt.logs.find((l) => l.logIndex === d.log_index);
        if (
          !erc20LogMatches(log, {
            token: env.usdc,
            from: String(d.from_address),
            to: dest,
            units: BigInt(d.units),
            transferTopic: TRANSFER_TOPIC,
          })
        ) {
          continue;
        }
      } else {
        if (!env.ethEnabled) continue;
        const units = BigInt(d.units);
        // Only top-level transfers are recorded now. A row from the retired trace path (ETH
        // forwarded by a contract, a log index above the native one) is never credited here.
        if ((d.log_index ?? NATIVE_LOG_INDEX) > NATIVE_LOG_INDEX) continue;
        const tx = await env.client.getTransaction({ hash: d.tx_hash });
        let txB = env.clientB
          ? await env.clientB.getTransaction({ hash: d.tx_hash }).catch(() => null)
          : null;
        // The second provider cannot read a transaction this old: the third stands in.
        if (env.clientB && !txB)
          txB =
            (await (
              await thirdProvider(env)
            )
              ?.getTransaction({ hash: d.tx_hash })
              .catch(() => null)) ?? null;
        if (!nativeTransfersAgree(tx, txB, dest, units)) continue;
        if (!price) continue;
      }
      const agreed = await providersAgree(
        env,
        d.tx_hash,
        receipt.blockNumber,
        d.asset_key === "USDC" ? d.log_index : null,
      );
      if (!agreed.ok) {
        await rpc("crypto_raise_incident", {
          p_check: "crypto_rpc_disagreement",
          p_fp: `crypto_rpc_disagreement:${env.chainId}:${d.tx_hash}`,
          p_details: {
            chain_id: env.chainId,
            tx: d.tx_hash,
            block: Number(receipt.blockNumber),
            // What each provider said: ok, no_receipt / no_block (cannot say), refuses_….
            providers: agreed.reason,
          },
        });
        continue;
      }
      const r = await must<{ status?: string } | null>(
        rpc("crypto_credit_deposit", {
          p_id: d.id,
          p_price_snapshot: d.asset_key === "ETH" ? price?.id : null,
          p_block_hash: receipt.blockHash,
        }),
      );
      if (r?.status === "CREDITED") credited++;
      else creditDeferred++;
    }
  }

  if (env.usdc && latest > lastCursor + 500n) {
    await rpc("crypto_raise_incident", {
      p_check: "crypto_cursor_lag",
      p_fp: `crypto_cursor_lag:${env.chainId}:${new Date().toISOString().slice(0, 13)}`,
      p_details: {
        chain_id: env.chainId,
        cursor: Number(lastCursor),
        latest: Number(latest),
        gap: Number(latest - lastCursor),
      },
    });
  }
  if (ethAt != null && latest > ethAt + 500n) {
    await rpc("crypto_raise_incident", {
      p_check: "crypto_eth_cursor_lag",
      p_fp: `crypto_eth_cursor_lag:${env.chainId}:${new Date().toISOString().slice(0, 13)}`,
      p_details: {
        chain_id: env.chainId,
        cursor: Number(ethAt),
        latest: Number(latest),
        gap: Number(latest - ethAt),
      },
    });
  }

  return {
    ok: true,
    chain: env.chainId,
    latest: Number(latest),
    safe: safeBlock == null ? null : Number(safeBlock),
    cursor: Number(lastCursor),
    passes,
    skippedEth,
    usdcVia: usdcIndexed ? "index" : "logs",
    backfilled,
    usdcError,
    usdcIndexError,
    observed,
    credited,
    creditDeferred,
    stages: stages(),
  };
}

/** Broadcast the already-signed bytes. The second provider gets the same transaction, never a new one. */
async function broadcastSigned(env: Env, raw: Hex): Promise<void> {
  const clients = [env.client, env.clientB].filter((client): client is PublicClient => !!client);
  let last: unknown;
  for (const client of clients) {
    try {
      await client.sendRawTransaction({ serializedTransaction: raw });
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already known|known transaction/i.test(msg)) return;
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error("BROADCAST_FAILED");
}

/** Withdrawal worker for one chain: one in-flight payout at a time.
 *  Sign once, store the raw transaction, then broadcast. Retries send those same bytes.
 *  A missing receipt, a nonce clash, or provider disagreement leaves the hold in place.
 */
export async function runWithdrawalWorker(chainId: number) {
  const envr = await loadChainEnv(chainId);
  if (!envr.ok) return { ok: false, reason: envr.reason };
  const env = envr.env;
  const { rpc } = await db();
  const s = env.settings;
  const pkRaw = workerEnv(`CRYPTO_HOT_WALLET_PRIVATE_KEY_${env.chainId}`)?.trim();
  const pk = (pkRaw && !pkRaw.startsWith("0x") ? `0x${pkRaw}` : pkRaw) as Hex | undefined;
  const keyLooksValid = !!pk && /^0x[0-9a-fA-F]{64}$/.test(pk);
  const account = keyLooksValid ? privateKeyToAccount(pk as Hex) : null;
  const hotKeyMatches = account ? account.address.toLowerCase() === env.payout : null;
  await publishChainInventory(env, hotKeyMatches).catch(() => undefined);
  if (!s.crypto_system_enabled || !s.withdrawals_enabled) return { ok: true, paused: true };
  if (!account || !pk) return { ok: false, reason: "HOT_KEY_MISSING" };
  if (!hotKeyMatches) return { ok: false, reason: "HOT_KEY_ADDRESS_MISMATCH" };
  const wallet = createWalletClient({
    account,
    chain: env.chain,
    transport: http(rpcUrlFor(env.chainId)),
  });

  const rows = await must<
    {
      id: string;
      status: string;
      tx_hash: Hex;
      signed_raw_tx: Hex;
      nonce: number;
      to_address: string | null;
      asset_key: string;
      units: string | number;
    }[]
  >(rpc("crypto_next_withdrawals", { p_chain: env.chainId }));
  const results: Record<string, string> = {};
  let inFlight = false;
  // The safe head is only needed to confirm an in-flight payout. An idle run
  // used to download it on every cron, which is a full block RPC.
  const safe = (rows ?? []).some((w) => w.status === "SUBMITTING" || w.status === "SUBMITTED")
    ? (await env.client.getBlock({ blockTag: "safe" })).number!
    : 0n;

  for (const w of rows ?? []) {
    if (inflightWithdrawalKeepsStoredRaw(w.status)) {
      inFlight = true;
      // Finality policy lives in ./payout-finality (safe block + two-provider agreement).
      const decision = await decidePayout(
        {
          primary: env.client as unknown as Parameters<typeof decidePayout>[0]["primary"],
          secondary: env.clientB as unknown as Parameters<typeof decidePayout>[0]["secondary"],
          networkMode: env.networkMode,
        },
        w.tx_hash,
        safe,
      );
      if (decision.action !== "no_receipt") {
        results[w.id] = await applyPayoutDecision(
          (fn, args) => must(rpc(fn, args)),
          w.id,
          w.tx_hash,
          decision,
        );
        continue;
      }
      // No receipt: rebroadcast the exact signed bytes (idempotent — same hash, same nonce).
      try {
        await broadcastSigned(env, w.signed_raw_tx);
      } catch (e) {
        const msg = String((e as Error).message).replace(/https?:\/\/\S+/g, "[rpc]");
        // Nonce already consumed. Keep the signed transaction and the hold.
        if (/nonce too low/i.test(msg)) {
          await must(
            rpc("crypto_raise_incident", {
              p_check: "crypto_withdrawal_nonce",
              p_fp: `crypto_withdrawal_nonce:${w.id}`,
              p_details: { withdrawal: w.id, tx: w.tx_hash, nonce: w.nonce },
            }),
          );
        } else if (!/already known|known transaction/i.test(msg)) {
          await rpc("crypto_withdrawal_error", { p_id: w.id, p_reason: msg.slice(0, 300) });
        }
      }
      await rpc("crypto_withdrawal_broadcast", { p_id: w.id });
      results[w.id] = "rebroadcast";
    }
  }

  if (inFlight) return { ok: true, results };
  const next = (rows ?? []).find(
    (w) => w.status === "APPROVED" || w.status === "LIQUIDITY_PENDING",
  );
  if (!next) return { ok: true, results };
  if ((next.asset_key === "USDC" && !env.usdc) || (next.asset_key === "ETH" && !env.ethEnabled)) {
    return { ok: true, results: { ...results, [next.id]: "asset_disabled" } };
  }

  const dest = String(next.to_address ?? "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(dest) || dest === "0x0000000000000000000000000000000000000000") {
    await must(
      rpc("crypto_withdrawal_failed", {
        p_id: next.id,
        p_reason: "destination address is not a Base 0x address",
      }),
    );
    return { ok: true, results: { ...results, [next.id]: "released" } };
  }
  // Hot-wallet float hard cap: the payout key has limited authority. If the
  // wallet holds more than its configured operating maximum, the worker refuses
  // to send payouts until the excess is swept to treasury manually.
  const floatMax = BigInt(Number(env.settings.payout_float_max_cents ?? 0));
  if (floatMax > 0n) {
    const [floatUsdc, floatWei] = await Promise.all([
      env.usdcRead
        ? (env.client.readContract({
            address: env.usdcRead,
            abi: ERC20,
            functionName: "balanceOf",
            args: [account.address],
          }) as Promise<bigint>)
        : Promise.resolve(0n),
      env.client.getBalance({ address: account.address }),
    ]);
    let floatCents = usdcUnitsToCents(floatUsdc);
    if (floatWei > 0n) {
      const p = await snapshotEthPrice(env).catch(() => null);
      if (p) floatCents += weiToCents(floatWei, p.priceMicro);
    }
    if (floatCents > floatMax) {
      await rpc("crypto_raise_incident", {
        p_check: "crypto_float_cap",
        p_fp: `crypto_float_cap:${env.chainId}:${new Date().toISOString().slice(0, 13)}`,
        p_details: {
          chain_id: env.chainId,
          float_cents: Number(floatCents),
          max_cents: Number(floatMax),
        },
      });
      return { ok: true, results: { ...results, [next.id]: "float_cap_exceeded" } };
    }
  }

  const to = next.to_address as Hex;
  const units = BigInt(String(next.units).split(".")[0] ?? "0");
  const request: { to: Hex; value?: bigint; data?: Hex } =
    next.asset_key === "ETH"
      ? { to, value: units }
      : {
          to: env.usdc as Hex,
          data: encodeFunctionData({ abi: ERC20, functionName: "transfer", args: [to, units] }),
        };

  // Liquidity before gas estimate: ERC20 transfer reverts when the hot wallet is
  // short, and estimateGas then looks like a generic gas failure (leaving rows
  // stuck in APPROVED with a misleading error).
  const ethBal = await env.client.getBalance({ address: account.address });
  if (
    next.asset_key === "ETH" &&
    env.chainId === 8453 &&
    ethBal < units + BASE_PAYOUT_GAS_RESERVE_WEI
  ) {
    await must(
      rpc("crypto_withdrawal_liquidity_pending", {
        p_id: next.id,
        p_reason: "payout wallet liquidity shortfall (ETH reserve)",
      }),
    );
    return { ok: true, results: { ...results, [next.id]: "liquidity_pending" } };
  }
  if (next.asset_key === "USDC") {
    const bal = (await env.client.readContract({
      address: env.usdc as Hex,
      abi: ERC20,
      functionName: "balanceOf",
      args: [account.address],
    })) as bigint;
    if (bal < units) {
      await must(
        rpc("crypto_withdrawal_liquidity_pending", {
          p_id: next.id,
          p_reason: "payout wallet liquidity shortfall (USDC)",
        }),
      );
      await rpc("crypto_raise_incident", {
        p_check: "crypto_payout_liquidity",
        p_fp: `crypto_payout_liquidity:${env.chainId}:USDC:${new Date().toISOString().slice(0, 13)}`,
        p_details: {
          chain_id: env.chainId,
          asset: "USDC",
          need: units.toString(),
          have: bal.toString(),
        },
      });
      return { ok: true, results: { ...results, [next.id]: "liquidity_pending" } };
    }
  }

  // Exact-transaction gas estimate with a safety margin. Capture the RPC reason
  // so stuck APPROVED withdrawals are diagnosable (liquidity vs estimate vs RPC).
  let gasEstimate: bigint | null = null;
  let gasPrice: bigint | null = null;
  let gasErr: string | null = null;
  try {
    gasEstimate = await env.client.estimateGas({
      account: account.address,
      ...request,
    } as never);
  } catch (e) {
    gasErr = (e instanceof Error ? e.message : String(e))
      .replace(/https?:\/\/\S+/g, "[rpc]")
      .slice(0, 180);
  }
  try {
    gasPrice = await env.client.getGasPrice();
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e))
      .replace(/https?:\/\/\S+/g, "[rpc]")
      .slice(0, 120);
    gasErr = gasErr ? `${gasErr}; gasPrice: ${msg}` : `gasPrice: ${msg}`;
  }
  if (gasEstimate == null || gasPrice == null) {
    if (gasErr && /exceeds balance|insufficient funds|transfer amount exceeds/i.test(gasErr)) {
      await must(
        rpc("crypto_withdrawal_liquidity_pending", {
          p_id: next.id,
          p_reason: `payout wallet liquidity shortfall (estimate revert): ${gasErr}`.slice(0, 300),
        }),
      );
      return { ok: true, results: { ...results, [next.id]: "liquidity_pending" } };
    }
    await rpc("crypto_withdrawal_error", {
      p_id: next.id,
      p_reason: `gas estimation failed; will retry${gasErr ? `: ${gasErr}` : ""}`.slice(0, 300),
    });
    return { ok: true, results: { ...results, [next.id]: "gas_estimate_retry" } };
  }
  const feeWei = ((gasEstimate * GAS_MARGIN_BPS) / 10_000n) * gasPrice;

  // Gas-token check after we know the fee. Shortage is an explicit queued state.
  if (next.asset_key === "USDC") {
    if (ethBal < feeWei) {
      await must(
        rpc("crypto_withdrawal_liquidity_pending", {
          p_id: next.id,
          p_reason: "payout wallet liquidity shortfall (gas)",
        }),
      );
      return { ok: true, results: { ...results, [next.id]: "liquidity_pending" } };
    }
  } else {
    // Native payout: on Ethereum L1 the gas is deducted from the player's payout;
    // on low-fee chains the house subsidizes gas. Payout + fee never exceeds the hold.
    let value = units;
    if (env.chainId === 1) {
      value = units - feeWei;
      if (value <= 0n) {
        await rpc("crypto_withdrawal_error", {
          p_id: next.id,
          p_reason: "amount does not cover network gas; increase the withdrawal amount",
        });
        return { ok: true, results: { ...results, [next.id]: "below_gas" } };
      }
      request.value = value;
    }
    const reserve = env.chainId === 8453 ? BASE_PAYOUT_GAS_RESERVE_WEI : 0n;
    const spendable = ethBal > reserve ? ethBal - reserve : 0n;
    if (!ethPayoutFunded(env.chainId, spendable, units, feeWei)) {
      await must(
        rpc("crypto_withdrawal_liquidity_pending", {
          p_id: next.id,
          p_reason: "payout wallet liquidity shortfall (ETH)",
        }),
      );
      return { ok: true, results: { ...results, [next.id]: "liquidity_pending" } };
    }
  }

  const chainNonce = await env.client.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });
  let nonce: number;
  try {
    const leased = await must<{ nonce?: number }>(
      rpc("crypto_reserve_nonce", {
        p_chain: env.chainId,
        p_payer: account.address.toLowerCase(),
        p_purpose: "withdrawal",
        p_owner: next.id,
        p_chain_nonce: chainNonce,
      }),
    );
    const parsed = freshWithdrawalNonce(leased);
    if (!parsed.ok) throw new Error(parsed.reason);
    nonce = parsed.nonce;
  } catch {
    logCryptoOps("crypto_withdrawal_nonce_lease", { chainId: env.chainId, result: "failed" });
    await rpc("crypto_withdrawal_error", {
      p_id: next.id,
      p_reason: "payout nonce lease failed; will retry",
    });
    return { ok: true, results: { ...results, [next.id]: "nonce_lease_retry" } };
  }
  const prepared = await wallet.prepareTransactionRequest({
    ...request,
    nonce,
    chain: env.chain,
    account,
  } as never);
  if ((prepared as { chainId?: number }).chainId !== env.chainId)
    return { ok: false, reason: "CHAIN_MISMATCH" };
  const raw = await wallet.signTransaction(prepared as never);
  const hash = keccak256(raw);
  await must(
    rpc("crypto_withdrawal_signed", { p_id: next.id, p_hash: hash, p_nonce: nonce, p_raw: raw }),
  );
  await rpc("crypto_nonce_mark_signed", {
    p_chain: env.chainId,
    p_payer: account.address.toLowerCase(),
    p_nonce: nonce,
    p_owner: next.id,
  });
  try {
    await broadcastSigned(env, raw);
    await must(rpc("crypto_withdrawal_broadcast", { p_id: next.id }));
    results[next.id] = "sent";
  } catch (e) {
    await rpc("crypto_withdrawal_error", {
      p_id: next.id,
      p_reason: String((e as Error).message)
        .replace(/https?:\/\/\S+/g, "[rpc]")
        .slice(0, 300),
    });
    results[next.id] = "broadcast_retry";
  }
  return { ok: true, results };
}

/** Detect-only reconciliation across all enabled chains: on-chain value vs ledger custody liability. */
export async function runReconciliation() {
  const { rpc } = await db();
  const chains = await enabledChainIds();
  let totalCents = 0n;
  const perChain: Record<string, unknown> = {};
  for (const chainId of chains) {
    const envr = await loadChainEnv(chainId);
    if (!envr.ok) {
      perChain[String(chainId)] = { error: envr.reason };
      continue;
    }
    const env = envr.env;
    const addrs = Array.from(new Set([env.treasury, env.payout])) as Hex[];
    let usdc = 0n;
    let wei = 0n;
    for (const a of addrs) {
      if (env.usdcRead) {
        usdc += (await env.client.readContract({
          address: env.usdcRead,
          abi: ERC20,
          functionName: "balanceOf",
          args: [a],
        })) as bigint;
      }
      wei += await env.client.getBalance({ address: a });
    }
    const price = await snapshotEthPrice(env).catch(() => null);
    const cents = usdcUnitsToCents(usdc) + (price ? weiToCents(wei, price.priceMicro) : 0n);
    perChain[String(chainId)] = {
      usdc_units: usdc.toString(),
      wei: wei.toString(),
      cents: Number(cents),
      priced: !!price,
    };
    totalCents += cents;
  }
  if (chains.length === 0) return { ok: true, skipped: true };
  return must(
    rpc("crypto_reconcile", {
      p_onchain_cents: Number(totalCents),
      p_details: { chains: perChain },
    }),
  );
}

export async function envOkForAutoApproval(chainId: number): Promise<boolean> {
  const r = await loadChainEnv(chainId).catch(() => ({ ok: false as const, reason: "ERR" }));
  return r.ok;
}
