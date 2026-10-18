import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
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
import {
  ANKR_MAX_BATCH,
  ANKR_MAX_INDEX_CALLS,
  ANKR_MIN_SCAN_BLOCKS,
  activeTargets,
  activityCalls,
  ETH_EXTERNAL_LOG_INDEX,
  ankrChainName,
  ankrIndexFromRpcUrls,
  ankrIndexedThrough,
  ankrInternalDeposits,
  ankrNativeTransfers,
  callTracerDeposits,
  traceFilterDeposits,
  type AnkrInternalPage,
  type AnkrTxPage,
  type RpcReply,
} from "./ankr-index";

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
/** How far back to look for ETH that arrived inside a contract call and was never recorded. */
const ETH_INTERNAL_LOOKBACK_BLOCKS = 300_000n;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
// Keep each Cloudflare minute cron under the shared Worker subrequest budget.
// USDC uses narrow getLogs. Native ETH uses one indexed transfer query and its
// own cursor, so a USDC catch-up cannot jump past an unscanned ETH block.
const MAX_ETH_BLOCKS_STEADY = 20;
const MAX_ETH_BLOCKS_CATCH_UP = 100; // USDC window while catching up
const MAX_ETH_INDEX_BLOCKS = 50_000n;
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
const GAS_MARGIN_BPS = 12_500n; // 1.25x safety margin on the exact-transaction gas estimate

const CHAIN_DEFS: Record<number, Chain> = { 8453: base, 1: mainnet };

type RpcResult = { data: unknown; error: { message: string } | null };

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>;

type Query = {
  select: (columns: string) => Query;
  eq: (column: string, value: unknown) => Query;
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
  depositAddresses: Set<string>; // personal deposit addresses, lowercased
}

function rpcUrlFor(chainId: number, secondary = false): string | undefined {
  const suffix = secondary ? `_${chainId}_B` : `_${chainId}`;
  const url = workerEnv(`CRYPTO_RPC_URL${suffix}`);
  if (url) return url;
  return undefined;
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
  const [{ data: s }, { data: net }, { data: assets }, { data: tr }, { data: addrs }] =
    await Promise.all([
      admin.from("crypto_settings").select("*").single(),
      admin.from("chain_networks").select("*").eq("chain_id", chainId).maybeSingle(),
      admin.from("chain_assets").select("*").eq("chain_id", chainId),
      admin
        .from("chain_treasury_accounts")
        .select("*")
        .eq("chain_id", chainId)
        .eq("is_active", true),
      admin.from("crypto_deposit_addresses").select("address").eq("chain_id", chainId),
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
  } catch {
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
      depositAddresses: new Set(
        ((addrs ?? []) as { address?: string }[]).map((a) => String(a.address).toLowerCase()),
      ),
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
 * RPC agreement: two independent providers must agree on the block number, the
 * block hash, the transaction receipt (status + block hash), and the exact
 * log/event being credited. Anything less fails closed: no credit, retry next
 * run, alert if persistent.
 */
async function providersAgree(
  env: Env,
  txHash: string,
  blockNumber: bigint,
  logIndex: number | null,
): Promise<boolean> {
  if (!env.clientB) return env.networkMode === "testnet"; // mainnet requires two providers
  const [bA, rA, rB] = await Promise.all([
    env.client.getBlock({ blockNumber }).catch(() => null),
    env.client.getTransactionReceipt({ hash: txHash as Hex }).catch(() => null),
    env.clientB!.getTransactionReceipt({ hash: txHash as Hex }).catch(() => null),
  ]);
  // Provider B by hash: its plan serves only recent blocks by number. B's own receipt
  // (checked below) is what proves the block is canonical on B.
  const bB = bA ? await env.clientB!.getBlock({ blockHash: bA.hash! }).catch(() => null) : null;
  if (!bA || !bB || bA.hash !== bB.hash || bA.number !== bB.number) return false;
  if (!bA.transactions.includes(txHash as Hex)) return false;
  if (!rA || !rB) return false;
  if (rA.status !== "success" || rB.status !== "success") return false;
  if (rA.blockHash !== rB.blockHash || rA.blockHash !== bA.hash) return false;
  if (rA.blockNumber !== rB.blockNumber || rA.blockNumber !== blockNumber) return false;
  if (logIndex != null) {
    const lA = rA.logs.find((l) => l.logIndex === logIndex);
    const lB = rB.logs.find((l) => l.logIndex === logIndex);
    if (!lA || !lB) return false;
    if (lA.address.toLowerCase() !== lB.address.toLowerCase()) return false;
    if (lA.data !== lB.data) return false;
    if (lA.topics.length !== lB.topics.length || lA.topics.some((t, i) => t !== lB.topics[i]))
      return false;
  }
  return true;
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
  logIndex = NATIVE_LOG_INDEX,
): Promise<boolean> {
  const dest = tx.to.toLowerCase();
  if (tx.value <= 0n || (dest !== env.treasury && !env.depositAddresses.has(dest))) return false;
  if (belowDepositMinimum(env.minDepositUnits, "ETH", tx.value)) return false;
  const { rpc } = await db();
  await must(
    rpc("crypto_observe_deposit", {
      p_chain: env.chainId,
      p_asset: "ETH",
      p_tx: tx.hash,
      p_log: logIndex,
      p_block: Number(tx.blockNumber),
      p_from: tx.from,
      p_to: tx.to,
      p_units: tx.value.toString(),
    }),
  );
  return true;
}

async function rpcResult(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error("ACTIVITY_HTTP");
  const json = (await res.json()) as { error?: { message?: string }; result?: unknown };
  if (json.error) {
    const message = String(json.error.message ?? "rpc")
      .replace(/https?:\/\/\S+/g, "url")
      .slice(0, 80);
    throw new Error(`${method}: ${message}`);
  }
  return json.result;
}

async function balanceAt(url: string, address: string, block: bigint): Promise<bigint> {
  const result = await rpcResult(url, "eth_getBalance", [address, `0x${block.toString(16)}`]);
  if (typeof result !== "string" || !/^0x[0-9a-f]+$/i.test(result)) throw new Error("ACTIVITY_READ");
  return BigInt(result);
}

/** Re-read the exchange payout from Ankr before crediting. A normal transfer never reaches here. */
async function internalEthMatches(
  indexUrl: string,
  chainId: number,
  txHash: string,
  dest: string,
  units: bigint,
): Promise<boolean> {
  const chain = ankrChainName(chainId);
  if (!chain) return false;
  try {
    const page = await ankrInternalPage(indexUrl, "ankr_getInternalTransactionsByParentHash", {
      blockchain: chain,
      parentTransactionHash: txHash,
      onlyWithValue: true,
    });
    return ankrInternalDeposits(page, dest, 0n, (1n << 62n) - 1n).some((t) => t.value === units);
  } catch {
    return false;
  }
}

async function ankrInternalPage(
  indexUrl: string,
  method: string,
  params: Record<string, unknown>,
): Promise<AnkrInternalPage> {
  const res = await fetch(indexUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error("INDEX_HTTP");
  const json = (await res.json()) as AnkrInternalPage;
  if (json.error) throw new Error("INDEX_RPC");
  return json;
}

/** ETH already recorded for this chain, in wei, keyed by the receiving address. */
async function accountedEthWei(chainId: number): Promise<Map<string, bigint>> {
  const { rpc } = await db();
  const rows = await must<{ to_address: string; units: string }[]>(
    rpc("crypto_eth_accounted", { p_chain: chainId }),
  );
  const out = new Map<string, bigint>();
  for (const row of rows ?? []) {
    if (!row?.to_address || row.units == null) continue;
    out.set(row.to_address.toLowerCase(), BigInt(row.units));
  }
  return out;
}

/**
 * A contract call paid one of our addresses. Record each internal transfer once.
 * Direct transfers are handled separately and use the external log index.
 */
async function traceFilterBlock(
  url: string,
  block: bigint,
  targets: Set<string>,
): Promise<unknown> {
  const hex = `0x${block.toString(16)}`;
  return rpcResult(url, "trace_filter", [
    { fromBlock: hex, toBlock: hex, toAddress: Array.from(targets) },
  ]);
}

type InternalTransfer = {
  hash: string;
  from: string;
  to: string;
  blockNumber: bigint;
  value: bigint;
  logIndex: number;
};

function clipReason(err: unknown): string {
  const message = err instanceof Error ? err.message : "error";
  return message.replace(/https?:\/\/\S+/g, "url").slice(0, 120);
}

async function balanceNow(url: string, address: string): Promise<bigint> {
  const result = await rpcResult(url, "eth_getBalance", [address, "latest"]);
  if (typeof result !== "string" || !/^0x[0-9a-f]+$/i.test(result)) throw new Error("ACTIVITY_READ");
  return BigInt(result);
}

async function nonceAt(url: string, address: string, block: bigint): Promise<bigint> {
  const result = await rpcResult(url, "eth_getTransactionCount", [address, `0x${block.toString(16)}`]);
  if (typeof result !== "string" || !/^0x[0-9a-f]+$/i.test(result)) throw new Error("ACTIVITY_READ");
  return BigInt(result);
}

type SolePayout = { hash: string; from: string; value: bigint };

/** The one transaction in this block that names the deposit address. */
async function solePayout(url: string, block: bigint, target: string): Promise<SolePayout | null> {
  const body = (await rpcResult(url, "eth_getBlockByNumber", [`0x${block.toString(16)}`, true])) as {
    transactions?: Array<{ hash?: string; from?: string; to?: string | null; input?: string | null; value?: string }>;
  } | null;
  const needle = target.slice(2);
  const hits = (body?.transactions ?? []).filter((tx) => {
    const to = (tx.to ?? "").toLowerCase();
    const input = (tx.input ?? "").toLowerCase();
    return to === target || (needle.length === 40 && input.includes(needle));
  });
  const tx = hits.length === 1 ? hits[0] : null;
  if (!tx?.hash || !tx.from) return null;
  return { hash: tx.hash, from: tx.from, value: BigInt(tx.value ?? "0x0") };
}

/**
 * Ankr and Chainstack both refuse trace methods on the current keys. The deposit
 * is still provable: the archive node shows the balance rising in one block, the
 * address did not send, and exactly one transaction in that block names it.
 * The second node must agree on the amount, or at least on the balance held now.
 */
async function attributeFromBalance(
  urls: string[],
  block: bigint,
  target: string,
): Promise<InternalTransfer | null> {
  if (urls.length < 2 || block < 1n) return null;
  const before = await balanceAt(urls[0]!, target, block - 1n);
  const after = await balanceAt(urls[0]!, target, block);
  const delta = after - before;
  if (delta <= 0n) return null;
  if ((await nonceAt(urls[0]!, target, block - 1n)) !== (await nonceAt(urls[0]!, target, block))) {
    return null;
  }
  const sole = await solePayout(urls[0]!, block, target);
  if (!sole) return null;
  if (sole.value > 0n && sole.value !== delta) return null;
  let agreed = false;
  try {
    const beforeB = await balanceAt(urls[1]!, target, block - 1n);
    const afterB = await balanceAt(urls[1]!, target, block);
    const soleB = await solePayout(urls[1]!, block, target);
    agreed =
      afterB - beforeB === delta &&
      !!soleB &&
      soleB.hash.toLowerCase() === sole.hash.toLowerCase();
  } catch {
    const nowA = await balanceNow(urls[0]!, target);
    const nowB = await balanceNow(urls[1]!, target);
    agreed = nowA === nowB && nowA >= delta;
  }
  if (!agreed) return null;
  return {
    hash: sole.hash,
    from: sole.from,
    to: target,
    blockNumber: block,
    value: sole.value > 0n ? sole.value : delta,
    logIndex: sole.value > 0n ? NATIVE_LOG_INDEX : ETH_EXTERNAL_LOG_INDEX + 1,
  };
}

/** Transactions in the block whose calldata names one of our deposit addresses. */
async function payoutCandidates(
  url: string,
  block: bigint,
  targets: Set<string>,
): Promise<string[]> {
  const body = (await rpcResult(url, "eth_getBlockByNumber", [`0x${block.toString(16)}`, true])) as {
    transactions?: Array<{ hash?: string; to?: string | null; input?: string | null }>;
  } | null;
  const needles = Array.from(targets).map((a) => a.slice(2));
  const hashes: string[] = [];
  for (const tx of body?.transactions ?? []) {
    if (!tx.hash) continue;
    const input = (tx.input ?? "").toLowerCase();
    const to = (tx.to ?? "").toLowerCase();
    if (targets.has(to) || needles.some((n) => n.length === 40 && input.includes(n))) hashes.push(tx.hash);
  }
  return hashes.slice(0, 6);
}

async function observeInternalBlock(
  env: Env,
  indexUrl: string,
  chain: string,
  block: bigint,
  targets: Set<string>,
): Promise<{ observed: number; notes: string[] }> {
  const notes: string[] = [];
  let transfers: InternalTransfer[] = [];
  const addPage = (page: AnkrInternalPage) => {
    for (const target of targets) transfers.push(...ankrInternalDeposits(page, target, block, block));
  };
  try {
    addPage(
      await ankrInternalPage(indexUrl, "ankr_getInternalTransactionsByBlockNumber", {
        blockchain: chain,
        blockNumber: Number(block),
        onlyWithValue: true,
      }),
    );
  } catch (err) {
    notes.push(clipReason(err));
  }

  // The address index misses contract payouts. The payout transaction itself
  // names the deposit address in its calldata, so look that hash up directly.
  let candidates: string[] = [];
  if (transfers.length === 0) {
    const url = rpcUrlFor(env.chainId);
    if (url) {
      try {
        candidates = await payoutCandidates(url, block, targets);
      } catch (err) {
        notes.push(clipReason(err));
      }
    }
    for (const hash of candidates) {
      if (transfers.length > 0) break;
      for (const params of [
        { blockchain: chain, hash },
        { blockchain: chain, transactionHash: hash },
      ]) {
        try {
          addPage(await ankrInternalPage(indexUrl, "ankr_getInternalTransactionsByParentHash", params));
          if (transfers.length > 0) break;
        } catch (err) {
          notes.push(clipReason(err));
        }
      }
    }
  }

  const urls = [rpcUrlFor(env.chainId), rpcUrlFor(env.chainId, true)].filter(
    (url): url is string => !!url,
  );
  if (transfers.length === 0) {
    for (const target of targets) {
      try {
        const agreed = await attributeFromBalance(urls, block, target);
        if (agreed) transfers.push(agreed);
      } catch (err) {
        notes.push(clipReason(err));
      }
    }
  }
  if (transfers.length === 0) {
    for (const url of urls) {
      try {
        const traced = await traceFilterBlock(url, block, targets);
        transfers = [];
        for (const target of targets) transfers.push(...traceFilterDeposits(traced, target, block));
        if (transfers.length > 0) break;
      } catch (err) {
        notes.push(clipReason(err));
      }
    }
  }
  if (transfers.length === 0) {
    for (const hash of candidates) {
      if (transfers.length > 0) break;
      for (const url of urls) {
        try {
          const traced = await rpcResult(url, "debug_traceTransaction", [hash, { tracer: "callTracer" }]);
          for (const target of targets) {
            transfers.push(...callTracerDeposits(traced, target, block, hash));
          }
          if (transfers.length > 0) break;
        } catch (err) {
          notes.push(clipReason(err));
        }
      }
    }
  }

  let observed = 0;
  for (const t of transfers) {
    if (await observeNativeTransfer(env, t, t.logIndex)) observed++;
  }
  if (transfers.length > 0 && observed === 0) notes.push("found_unrecorded");
  notes.push(`candidates:${candidates.length}`);
  return { observed, notes: notes.slice(0, 8) };
}

/** Native transfers to the treasury and deposit addresses. Batched balance and nonce reads
 *  find the addresses with activity; only those are looked up in Ankr's address index.
 *  Advances no further than the block every index response reports as indexed. Throws on any error. */
async function scanNativeViaAnkrIndex(
  env: Env,
  rpcUrl: string,
  indexUrl: string,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<{ scannedTo: bigint; observed: number }> {
  const chain = ankrChainName(env.chainId);
  if (!chain) throw new Error("INDEX_CHAIN");
  const end =
    toBlock < fromBlock + MAX_ETH_INDEX_BLOCKS - 1n
      ? toBlock
      : fromBlock + MAX_ETH_INDEX_BLOCKS - 1n;
  const targets = Array.from(new Set([env.treasury.toLowerCase(), ...env.depositAddresses]));

  const calls = activityCalls(targets, fromBlock - 1n, end);
  const replies: RpcReply[] = [];
  for (let i = 0; i < calls.length; i += ANKR_MAX_BATCH) {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(calls.slice(i, i + ANKR_MAX_BATCH)),
    });
    if (!res.ok) throw new Error("ACTIVITY_HTTP");
    const part = (await res.json()) as unknown;
    if (!Array.isArray(part)) throw new Error("ACTIVITY_READ");
    replies.push(...(part as RpcReply[]));
  }
  const active = activeTargets(targets, replies);
  if (active.length > ANKR_MAX_INDEX_CALLS) throw new Error("INDEX_BUSY");

  let indexed = end;
  let observed = 0;
  let indexCalls = 0;
  for (const target of active) {
    let pageToken: string | undefined;
    for (let page = 0; page < 20; page++) {
      if (++indexCalls > ANKR_MAX_INDEX_CALLS) throw new Error("INDEX_BUSY");
      const params: Record<string, unknown> = {
        blockchain: chain,
        address: target,
        fromBlock: Number(fromBlock),
        toBlock: Number(end),
        pageSize: 1000,
        descOrder: false,
      };
      if (pageToken) params["pageToken"] = pageToken;
      const res = await fetch(indexUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "ankr_getTransactionsByAddress",
          params,
        }),
      });
      if (!res.ok) throw new Error("INDEX_HTTP");
      const json = (await res.json()) as AnkrTxPage;
      if (json.error) throw new Error("INDEX_RPC");
      const through = ankrIndexedThrough(json);
      if (through == null) throw new Error("INDEX_SYNC_UNKNOWN");
      if (through < indexed) indexed = through;
      for (const t of ankrNativeTransfers(json, target, fromBlock, end)) {
        if (await observeNativeTransfer(env, t)) observed++;
      }
      pageToken = json.result?.nextPageToken || undefined;
      if (!pageToken) break;
      if (page === 19) throw new Error("INDEX_TRUNCATED");
    }
  }
  // Exchange payouts (Coinbase on Base) move ETH inside a contract call. The
  // parent transaction value is zero, so the address index above never sees it.
  // A deposit address whose balance is higher than the wei already recorded is
  // looked up from the block where the balance rose.
  if (indexCalls < ANKR_MAX_INDEX_CALLS) {
    observed += await observeUncreditedInternal(
      env,
      rpcUrl,
      indexUrl,
      chain,
      targets,
      replies,
      end,
      ANKR_MAX_INDEX_CALLS - indexCalls,
    );
  }
  return { scannedTo: indexed < fromBlock ? fromBlock - 1n : indexed, observed };
}

function replyWei(replies: RpcReply[], id: number): bigint {
  const row = replies.find((r) => r.id === id);
  if (!row || typeof row.result !== "string" || !/^0x[0-9a-f]+$/i.test(row.result)) {
    throw new Error("ACTIVITY_READ");
  }
  return BigInt(row.result);
}

async function firstBlockAboveChain(
  url: string,
  address: string,
  lo: bigint,
  hi: bigint,
  threshold: bigint,
): Promise<bigint | "older" | null> {
  const reading = new Map<bigint, bigint>();
  const balance = async (block: bigint) => {
    const cached = reading.get(block);
    if (cached != null) return cached;
    const value = await balanceAt(url, address, block);
    reading.set(block, value);
    return value;
  };
  if (hi < lo) return null;
  if ((await balance(hi)) <= threshold) return null;
  if ((await balance(lo)) > threshold) return "older";
  let left = lo;
  let right = hi;
  while (left + 1n < right) {
    const mid = left + (right - left) / 2n;
    if ((await balance(mid)) > threshold) right = mid;
    else left = mid;
  }
  return right;
}

async function observeUncreditedInternal(
  env: Env,
  rpcUrl: string,
  indexUrl: string,
  chain: string,
  targets: string[],
  replies: RpcReply[],
  end: bigint,
  budget: number,
): Promise<number> {
  if (budget <= 0) return 0;
  let accounted: Map<string, bigint>;
  try {
    accounted = await accountedEthWei(env.chainId);
  } catch {
    return 0;
  }
  const min = env.minDepositUnits["ETH"] ?? 0n;
  const wanted = new Map<bigint, Set<string>>();
  let lookups = 0;
  for (let i = 0; i < targets.length && lookups < budget && lookups < 3; i++) {
    const target = targets[i]!;
    if (!env.depositAddresses.has(target)) continue;
    const endBal = replyWei(replies, i * 4 + 1);
    const known = accounted.get(target) ?? 0n;
    if (endBal <= known) continue;
    if (min > 0n && endBal - known < min) continue;
    const lo = end > ETH_INTERNAL_LOOKBACK_BLOCKS ? end - ETH_INTERNAL_LOOKBACK_BLOCKS : 0n;
    let threshold = known;
    let cursor = lo;
    // Walk each balance increase. A dust transfer must not hide a later payout.
    for (let step = 0; step < 3 && lookups < budget && threshold < endBal; step++) {
      let jump: bigint | "older" | null = null;
      try {
        jump = await firstBlockAboveChain(rpcUrl, target, cursor, end, threshold);
      } catch {
        break;
      }
      if (jump === "older") {
        const { rpc } = await db();
        await rpc("crypto_raise_incident", {
          p_check: "crypto_eth_uncredited",
          p_fp: `crypto_eth_uncredited:${env.chainId}:${target}`,
          p_details: { chain_id: env.chainId, address: target, balance: endBal.toString() },
        });
        break;
      }
      if (jump == null) break;
      lookups++;
      const who = wanted.get(jump) ?? new Set<string>();
      who.add(target);
      wanted.set(jump, who);
      try {
        threshold = await balanceAt(rpcUrl, target, jump);
      } catch {
        break;
      }
      cursor = jump;
    }
  }
  let observed = 0;
  const notes: string[] = [];
  for (const [block, who] of wanted) {
    try {
      const result = await observeInternalBlock(env, indexUrl, chain, block, who);
      observed += result.observed;
      notes.push(...result.notes);
    } catch (err) {
      notes.push(clipReason(err));
    }
  }
  if (wanted.size > 0 && observed === 0) {
    const { rpc } = await db();
    await rpc("crypto_raise_incident", {
      p_check: "crypto_eth_internal",
      p_fp: `crypto_eth_internal:${env.chainId}:${new Date().toISOString().slice(0, 16)}`,
      p_details: {
        chain_id: env.chainId,
        blocks: Array.from(wanted.keys()).map((b) => Number(b)),
        notes: notes.slice(0, 8),
      },
    });
  }
  return observed;
}

/** Bounded getBlock fallback. One block at a time, a few blocks per run.
 *  A parallel batch of full blocks exhausted Worker memory and Cloudflare
 *  killed the isolate (1102), including the withdrawal cron sharing it.
 *  Advances only through blocks that were actually read. */
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

  const latest = await env.client.getBlockNumber();
  // No safe head means no finality proof: observe, but credit nothing this run.
  const safeBlock = await env.client
    .getBlock({ blockTag: "safe" })
    .then((b) => b.number ?? null)
    .catch(() => null);

  let observed = 0;
  let credited = 0;
  let passes = 0;
  let lastCursor = 0n;
  let skippedEth = false;
  let usdcError: string | null = null;

  // Multiple passes when far behind: USDC catch-up must finish and advance the
  // cursor every window. Cloudflare Workers abort mid-run on subrequest budget;
  // advancing after each USDC window means a kill cannot freeze deposits again.
  // A USDC failure must not skip the ETH cursor or the credit pass below.
  // A disabled USDC row is not scanned and does not move the USDC cursor.
  if (env.usdc) {
    try {
      for (let pass = 0; pass < MAX_CATCH_UP_PASSES; pass++) {
        const cursorRaw = await must<number | null>(
          rpc("crypto_get_cursor", { p_chain: env.chainId }),
        );
        const cursor = cursorRaw == null ? latest - 5n : BigInt(cursorRaw);
        lastCursor = cursor;
        if (cursor >= latest) break;

        const gap = latest - cursor;
        const catchUp = gap > CATCH_UP_GAP_BLOCKS;
        const maxBlocks = catchUp ? MAX_ETH_BLOCKS_CATCH_UP : MAX_ETH_BLOCKS_STEADY;
        const configuredOverlap = BigInt(s.overlap_blocks);
        const overlap =
          configuredOverlap > MAX_OVERLAP_BLOCKS ? MAX_OVERLAP_BLOCKS : configuredOverlap;
        const ethTo = latest < cursor + BigInt(maxBlocks) ? latest : cursor + BigInt(maxBlocks);
        const logFrom = cursor > overlap ? cursor - overlap : 0n;
        const logTo = ethTo;

        const watched = Array.from(new Set([env.treasury, ...env.depositAddresses])) as Hex[];

        // USDC first — this is the real-money rail. Advance cursor before ETH scan.
        for (let from = logFrom; from <= logTo; from += MAX_LOG_RANGE) {
          const to = from + MAX_LOG_RANGE - 1n < logTo ? from + MAX_LOG_RANGE - 1n : logTo;
          const logs = await getLogsChunked(
            env.client,
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
    const ethCursor = ethCursorRaw == null ? latest : BigInt(ethCursorRaw);
    ethAt = ethCursor;
    const primaryRpc = rpcUrlFor(env.chainId);
    const secondaryRpc = rpcUrlFor(env.chainId, true);
    // Ankr is the address index. It can be either configured RPC. Chainstack is
    // the other provider and is what proves the receipt. Alchemy is not used.
    const ankrIndex = ankrIndexFromRpcUrls([primaryRpc, secondaryRpc], env.chainId);
    const due = ankrIndex ? latest - ethCursor >= ANKR_MIN_SCAN_BLOCKS : ethCursor < latest;
    if (due) {
      const useIndex = !!ankrIndex;
      try {
        const ethScan = ankrIndex
          ? await scanNativeViaAnkrIndex(env, primaryRpc!, ankrIndex, ethCursor + 1n, latest)
          : await scanNativeViaBlocks(env, ethCursor + 1n, latest);
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
          };
        }
        if (!useIndex) {
          skippedEth = true;
        } else {
          try {
            const blocks = await scanNativeViaBlocks(env, ethCursor + 1n, latest);
            observed += blocks.observed;
            await must(
              rpc("crypto_set_eth_cursor", {
                p_chain: env.chainId,
                p_block: Number(blocks.scannedTo),
              }),
            );
            if (blocks.scannedTo > ethCursor) ethAt = blocks.scannedTo;
          } catch {
            // Leave the ETH cursor where it is. The next run retries this range.
          }
          skippedEth = true;
        }
      }
    }
  }

  const price = await snapshotEthPrice(env).catch(() => null);

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
        if (!log || log.address.toLowerCase() !== env.usdc) continue;
        if ((log.topics[0] ?? "").toLowerCase() !== TRANSFER_TOPIC) continue;
        if (
          (log.topics[1] ?? "").slice(-40).toLowerCase() !==
          String(d.from_address).toLowerCase().slice(2)
        )
          continue;
        if ((log.topics[2] ?? "").slice(-40).toLowerCase() !== dest.slice(2)) continue;
        if (BigInt(log.data) !== BigInt(d.units)) continue;
      } else {
        if (!env.ethEnabled) continue;
        const units = BigInt(d.units);
        const internal = (d.log_index ?? NATIVE_LOG_INDEX) > NATIVE_LOG_INDEX;
        if (!internal) {
          const tx = await env.client.getTransaction({ hash: d.tx_hash });
          if (tx.to?.toLowerCase() !== dest || tx.value !== units) continue;
        } else {
          const indexUrl = ankrIndexFromRpcUrls(
            [rpcUrlFor(env.chainId), rpcUrlFor(env.chainId, true)],
            env.chainId,
          );
          const urls = [rpcUrlFor(env.chainId), rpcUrlFor(env.chainId, true)].filter(
            (url): url is string => !!url,
          );
          const fromIndex =
            !!indexUrl &&
            (await internalEthMatches(indexUrl, env.chainId, d.tx_hash, dest, units));
          const fromBalance = fromIndex
            ? null
            : await attributeFromBalance(urls, BigInt(d.block_number), dest).catch(() => null);
          const balanceAgrees =
            !!fromBalance &&
            fromBalance.hash.toLowerCase() === d.tx_hash.toLowerCase() &&
            fromBalance.value === units;
          if (!fromIndex && !balanceAgrees) continue;
        }
        if (!price) continue;
      }
      if (
        !(await providersAgree(
          env,
          d.tx_hash,
          receipt.blockNumber,
          d.asset_key === "USDC" ? d.log_index : null,
        ))
      ) {
        await rpc("crypto_raise_incident", {
          p_check: "crypto_rpc_disagreement",
          p_fp: `crypto_rpc_disagreement:${env.chainId}:${d.tx_hash}`,
          p_details: { chain_id: env.chainId, tx: d.tx_hash, block: Number(receipt.blockNumber) },
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
    usdcError,
    observed,
    credited,
  };
}

/** Withdrawal worker for one chain: one in-flight payout at a time.
 *  Sign once, store the raw transaction, then broadcast. Retries send those same bytes.
 *  A missing receipt, a nonce clash, or provider disagreement leaves the hold in place.
 */
export async function runWithdrawalWorker(chainId: number) {
  const envr = await loadChainEnv(chainId);
  if (!envr.ok) return { ok: false, reason: envr.reason };
  const env = envr.env;
  const { admin, rpc } = await db();
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
    if (w.status === "SUBMITTING" || w.status === "SUBMITTED") {
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
        await env.client.sendRawTransaction({ serializedTransaction: w.signed_raw_tx });
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

  const nonce = await env.client.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });
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
  try {
    await env.client.sendRawTransaction({ serializedTransaction: raw });
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
