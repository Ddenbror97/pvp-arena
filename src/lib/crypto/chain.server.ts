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
import { base, baseSepolia, mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { TESTNET, checkStaticConfig, checkMainnetRegistry, weiToCents, usdcUnitsToCents } from "./allowlist";

const ERC20 = parseAbi([
  "function transfer(address to, uint256 value) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);
const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const FEED = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]);
const NATIVE_LOG_INDEX = 1_000_000;
const MAX_ETH_BLOCKS_PER_RUN = 60;
const MAX_LOG_RANGE = 2000n;
const GAS_MARGIN_BPS = 12_500n; // 1.25x safety margin on the exact-transaction gas estimate

const CHAIN_DEFS: Record<number, Chain> = { 84532: baseSepolia, 8453: base, 1: mainnet };

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>;

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rpc: Rpc = async (fn, args) => (await supabaseAdmin.rpc(fn as never, (args ?? {}) as never)) as never;
  return { admin: supabaseAdmin as any, rpc };
}

async function must<T = any>(p: Promise<{ data: any; error: { message: string } | null }>): Promise<T> {
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
  usdc: `0x${string}`;
  ethFeed: `0x${string}` | null;
  settings: any;
  network: any; // chain_networks row (per-chain policy)
  minDepositUnits: Record<string, bigint>;
  depositAddresses: Set<string>; // personal deposit addresses, lowercased
}

function rpcUrlFor(chainId: number, secondary = false): string | undefined {
  const suffix = secondary ? `_${chainId}_B` : `_${chainId}`;
  const url = process.env[`CRYPTO_RPC_URL${suffix}`];
  if (url) return url;
  if (!secondary && chainId === TESTNET.chainId) return process.env["BASE_SEPOLIA_RPC_URL"];
  return undefined;
}

function checkChainRpcUrl(chainId: number, url: string | undefined): { ok: true } | { ok: false; reason: string } {
  if (!url) return { ok: false, reason: "RPC_URL_MISSING" };
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return { ok: false, reason: "RPC_NOT_HTTPS" };
    if (chainId === TESTNET.chainId && !/sepolia/i.test(url)) return { ok: false, reason: "RPC_NOT_SEPOLIA" };
    if (chainId !== TESTNET.chainId && /sepolia/i.test(url)) return { ok: false, reason: "RPC_NOT_MAINNET" };
  } catch {
    return { ok: false, reason: "RPC_URL_INVALID" };
  }
  return { ok: true };
}

/** Enabled chains from the registry. Workers iterate these; disabled chains are observe-only. */
export async function enabledChainIds(): Promise<number[]> {
  const { admin } = await db();
  const { data } = await admin.from("chain_networks").select("chain_id").eq("is_enabled", true);
  return (data ?? []).map((r: any) => Number(r.chain_id));
}

/** Refuses to return unless every invariant for the chain holds. Raises an incident on failure. */
export async function loadChainEnv(chainId: number): Promise<{ ok: true; env: Env } | { ok: false; reason: string }> {
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
  const [{ data: s }, { data: net }, { data: assets }, { data: tr }, { data: addrs }] = await Promise.all([
    admin.from("crypto_settings").select("*").single(),
    admin.from("chain_networks").select("*").eq("chain_id", chainId).maybeSingle(),
    admin.from("chain_assets").select("*").eq("chain_id", chainId),
    admin.from("chain_treasury_accounts").select("*").eq("chain_id", chainId).eq("is_active", true),
    admin.from("crypto_deposit_addresses").select("address").eq("chain_id", chainId),
  ]);
  if (!s) return fail("SETTINGS_MISSING");
  if (!net || !net.is_enabled) return fail("CHAIN_DISABLED");
  const usdc = assets?.find((a: any) => a.asset_key === "USDC" && a.is_enabled);
  const eth = assets?.find((a: any) => a.asset_key === "ETH" && a.is_enabled);
  if (!usdc || !eth) return fail("ASSETS_MISSING");

  if (chainId === TESTNET.chainId) {
    // Testnet keeps its strict hard-coded invariants.
    const st = checkStaticConfig({
      environment: s.environment,
      mainnetEnabled: s.mainnet_enabled,
      chainId,
      usdc: usdc.contract_address,
      feed: eth.price_feed_address,
    });
    if (!st.ok) return fail(st.reason);
  } else {
    // Mainnet chains: the registry must match the known-good Circle/Chainlink
    // values exactly (hard production-config guard — fails closed on any drift).
    const mc = checkMainnetRegistry({
      chainId,
      networkMode: net.network_mode,
      usdc: usdc.contract_address,
      usdcDecimals: Number(usdc.decimals),
      feed: eth.price_feed_address,
    });
    if (!mc.ok) return fail(mc.reason);
    // Risk/emergency settings must be present before real money moves.
    if (s.payout_float_max_cents == null || s.daily_global_limit_cents == null || s.auto_approve_cents == null) {
      return fail("RISK_SETTINGS_MISSING");
    }
  }

  const client = createPublicClient({ chain, transport: http(rpcUrlFor(chainId), { timeout: 10_000 }) }) as PublicClient;
  let liveChain: number;
  try {
    liveChain = await client.getChainId();
  } catch {
    return { ok: false, reason: "RPC_UNREACHABLE" };
  }
  if (liveChain !== chainId) return fail("RPC_CHAIN_MISMATCH");
  const code = await client.getCode({ address: usdc.contract_address as Hex }).catch(() => undefined);
  if (!code || code === "0x") return fail("USDC_NO_CODE");

  // Second independent provider: required for mainnet crediting (RPC agreement), optional on testnet.
  let clientB: PublicClient | null = null;
  const urlB = rpcUrlFor(chainId, true);
  if (urlB && checkChainRpcUrl(chainId, urlB).ok) {
    const cB = createPublicClient({ chain, transport: http(urlB, { timeout: 10_000 }) }) as PublicClient;
    try {
      if ((await cB.getChainId()) === chainId) clientB = cB;
    } catch {
      clientB = null;
    }
  }

  const treasury = tr?.find((t: any) => t.role === "deposit")?.address?.toLowerCase();
  const payout = tr?.find((t: any) => t.role === "payout")?.address?.toLowerCase();
  if (!treasury || !payout) return fail("TREASURY_MISSING");
  return {
    ok: true,
    env: {
      chainId,
      chain,
      networkMode: net.network_mode,
      client,
      clientB,
      treasury,
      payout,
      usdc: usdc.contract_address.toLowerCase(),
      ethFeed: eth.price_feed_address?.toLowerCase() ?? null,
      settings: s,
      network: net,
      minDepositUnits: {
        USDC: BigInt(usdc.min_deposit_units),
        ETH: BigInt(Number(eth.min_deposit_units).toLocaleString("fullwide", { useGrouping: false })),
      },
      depositAddresses: new Set((addrs ?? []).map((a: any) => String(a.address).toLowerCase())),
    },
  };
}

/** Backwards-compatible alias for the primary testnet environment. */
export async function loadVerifiedEnv() {
  return loadChainEnv(TESTNET.chainId);
}

/** Reads Chainlink ETH/USD on the server and stores a snapshot. Never trusts a browser price. */
export async function snapshotEthPrice(env: Env): Promise<{ id: string; priceMicro: bigint } | null> {
  if (!env.ethFeed) return null;
  const { rpc } = await db();
  const feed = env.ethFeed as Hex;
  const [round, dec] = await Promise.all([
    env.client.readContract({ address: feed, abi: FEED, functionName: "latestRoundData" }),
    env.client.readContract({ address: feed, abi: FEED, functionName: "decimals" }),
  ]);
  const [roundId, answer, , updatedAt] = round as readonly [bigint, bigint, bigint, bigint, bigint];
  if (answer <= 0n) return null;
  const age = Date.now() / 1000 - Number(updatedAt);
  if (age > Number(env.settings.price_max_age_seconds)) return null;
  const d = Number(dec);
  const priceMicro = d >= 6 ? answer / 10n ** BigInt(d - 6) : answer * 10n ** BigInt(6 - d);
  const id = await must<string>(
    rpc("crypto_record_price", {
      p_chain: env.chainId,
      p_asset: "ETH",
      p_feed: feed,
      p_round: roundId.toString(),
      p_price_micro: Number(priceMicro),
      p_observed: new Date(Number(updatedAt) * 1000).toISOString(),
    }),
  );
  return { id, priceMicro };
}

/**
 * RPC agreement: two independent providers must return the SAME block hash at the
 * SAME block number, and that block must contain the transaction. Anything less
 * (different heads, missing tx) fails closed: no credit, retry next run.
 */
async function providersAgree(env: Env, txHash: string, blockNumber: bigint): Promise<boolean> {
  if (!env.clientB) return env.networkMode === "testnet"; // mainnet requires two providers
  const [bA, bB] = await Promise.all([
    env.client.getBlock({ blockNumber }).catch(() => null),
    env.clientB!.getBlock({ blockNumber }).catch(() => null),
  ]);
  if (!bA || !bB || bA.hash !== bB.hash) return false;
  return bA.transactions.includes(txHash as Hex);
}

/** Deposit watcher for one chain: scan, re-scan overlap, verify, credit idempotently. */
export async function runDepositWatcher(chainId: number) {
  const envr = await loadChainEnv(chainId);
  if (!envr.ok) return { ok: false, reason: envr.reason };
  const env = envr.env;
  const { rpc } = await db();
  const s = env.settings;
  if (!s.crypto_system_enabled) return { ok: true, paused: true };

  const [latest, safeBlock] = await Promise.all([
    env.client.getBlockNumber(),
    env.client.getBlock({ blockTag: "safe" }).then((b) => b.number!),
  ]);
  const cursorRaw = await must<number | null>(rpc("crypto_get_cursor", { p_chain: env.chainId }));
  const cursor = cursorRaw == null ? latest - 5n : BigInt(cursorRaw);
  const overlap = BigInt(s.overlap_blocks);
  const ethFrom = cursor + 1n;
  const ethTo = latest < cursor + BigInt(MAX_ETH_BLOCKS_PER_RUN) ? latest : cursor + BigInt(MAX_ETH_BLOCKS_PER_RUN);
  const logFrom = cursor > overlap ? cursor - overlap : 0n;
  const logTo = ethTo;
  let observed = 0;

  // Watched destinations: the shared treasury plus every personal deposit address.
  const watched = Array.from(new Set([env.treasury, ...env.depositAddresses])) as Hex[];

  // USDC: Transfer logs to any watched address, over the overlap window (reorg-safe re-scan).
  for (let from = logFrom; from <= logTo; from += MAX_LOG_RANGE) {
    const to = from + MAX_LOG_RANGE - 1n < logTo ? from + MAX_LOG_RANGE - 1n : logTo;
    const logs = await env.client.getLogs({
      address: env.usdc as Hex,
      event: TRANSFER,
      args: { to: watched },
      fromBlock: from,
      toBlock: to,
    });
    for (const l of logs) {
      if (l.address.toLowerCase() !== env.usdc || !l.args.value || l.removed) continue;
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

  // Native ETH: scan new blocks' transactions to any watched address.
  const heights: bigint[] = [];
  for (let b = ethFrom; b <= ethTo; b++) heights.push(b);
  for (let i = 0; i < heights.length; i += 10) {
    const blocks = await Promise.all(
      heights.slice(i, i + 10).map((n) => env.client.getBlock({ blockNumber: n, includeTransactions: true })),
    );
    for (const blk of blocks) {
      for (const tx of blk.transactions) {
        if (typeof tx === "string" || !tx.to || tx.value <= 0n) continue;
        const dest = tx.to.toLowerCase();
        if (dest !== env.treasury && !env.depositAddresses.has(dest)) continue;
        await must(
          rpc("crypto_observe_deposit", {
            p_chain: env.chainId,
            p_asset: "ETH",
            p_tx: tx.hash,
            p_log: NATIVE_LOG_INDEX,
            p_block: Number(blk.number),
            p_from: tx.from,
            p_to: tx.to,
            p_units: tx.value.toString(),
          }),
        );
        observed++;
      }
    }
  }
  await must(rpc("crypto_set_cursor", { p_chain: env.chainId, p_block: Number(ethTo) }));

  // Credit: re-verify every pending deposit against the chain before crediting.
  // Confirmation threshold: the chain's own configurable credit_confirmations, and
  // never ahead of the RPC "safe" block. (Ethereum finalization is tracked by the
  // registry for reporting only; crediting uses this configurable threshold.)
  let credited = 0;
  if (s.deposits_enabled) {
    const confThreshold = latest - BigInt(Math.max(0, Number(env.network.credit_confirmations) - 1));
    const creditAt = safeBlock < confThreshold ? safeBlock : confThreshold;
    const pending = await must<any[]>(rpc("crypto_pending_deposits", { p_chain: env.chainId, p_max_block: Number(latest) }));
    let price: { id: string; priceMicro: bigint } | null | undefined;
    for (const d of pending ?? []) {
      const receipt = await env.client.getTransactionReceipt({ hash: d.tx_hash }).catch(() => null);
      if (!receipt || receipt.status !== "success") continue; // stays pending; re-evaluated next run
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
        const log = receipt.logs.find((l) => l.logIndex === d.log_index);
        if (!log || log.address.toLowerCase() !== env.usdc) continue;
        if ((log.topics[2] ?? "").slice(-40).toLowerCase() !== dest.slice(2)) continue;
        if (BigInt(log.data) !== BigInt(d.units)) continue;
      } else {
        const tx = await env.client.getTransaction({ hash: d.tx_hash });
        if (tx.to?.toLowerCase() !== dest || tx.value !== BigInt(d.units)) continue;
        if (price === undefined) price = await snapshotEthPrice(env).catch(() => null);
        if (!price) continue; // awaiting valuation
      }
      if (!(await providersAgree(env, d.tx_hash, receipt.blockNumber))) {
        await rpc("crypto_raise_incident", {
          p_check: "crypto_rpc_disagreement",
          p_fp: `crypto_rpc_disagreement:${env.chainId}:${d.tx_hash}`,
          p_details: { chain_id: env.chainId, tx: d.tx_hash, block: Number(receipt.blockNumber) },
        });
        continue; // fail closed: no credit, retry next run
      }
      const r = await must<any>(
        rpc("crypto_credit_deposit", { p_id: d.id, p_price_snapshot: d.asset_key === "ETH" ? price?.id : null }),
      );
      if (r?.status === "CREDITED") credited++;
    }
  }
  return { ok: true, chain: env.chainId, latest: Number(latest), safe: Number(safeBlock), cursor: Number(ethTo), observed, credited };
}

/** Withdrawal worker for one chain: one in-flight payout at a time, crash-safe (sign → store → broadcast). */
export async function runWithdrawalWorker(chainId: number) {
  const envr = await loadChainEnv(chainId);
  if (!envr.ok) return { ok: false, reason: envr.reason };
  const env = envr.env;
  const { admin, rpc } = await db();
  const s = env.settings;
  if (!s.crypto_system_enabled || !s.withdrawals_enabled) return { ok: true, paused: true };
  const pk = (process.env[`CRYPTO_HOT_WALLET_PRIVATE_KEY_${env.chainId}`] ??
    (env.chainId === TESTNET.chainId ? process.env["CRYPTO_HOT_WALLET_PRIVATE_KEY"] : undefined)) as Hex | undefined;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) return { ok: false, reason: "HOT_KEY_MISSING" };
  const account = privateKeyToAccount(pk);
  if (account.address.toLowerCase() !== env.payout) return { ok: false, reason: "HOT_KEY_ADDRESS_MISMATCH" };
  const wallet = createWalletClient({ account, chain: env.chain, transport: http(rpcUrlFor(env.chainId)) });

  const rows = await must<any[]>(rpc("crypto_next_withdrawals", { p_chain: env.chainId }));
  const safe = (await env.client.getBlock({ blockTag: "safe" })).number!;
  const results: Record<string, string> = {};
  let inFlight = false;

  for (const w of rows ?? []) {
    if (w.status === "SUBMITTING" || w.status === "SUBMITTED") {
      inFlight = true;
      const receipt = await env.client.getTransactionReceipt({ hash: w.tx_hash }).catch(() => null);
      if (receipt) {
        if (receipt.status !== "success") {
          await must(rpc("crypto_withdrawal_failed", { p_id: w.id, p_reason: "transaction reverted on-chain" }));
          results[w.id] = "released";
        } else if (receipt.blockNumber <= safe) {
          await must(rpc("crypto_withdrawal_confirmed", { p_id: w.id }));
          results[w.id] = "confirmed";
        } else results[w.id] = "confirming";
        continue;
      }
      // No receipt: rebroadcast the exact signed bytes (idempotent — same hash, same nonce).
      try {
        await env.client.sendRawTransaction({ serializedTransaction: w.signed_raw_tx });
      } catch (e) {
        const msg = String((e as Error).message);
        if (/nonce too low/i.test(msg)) {
          await must(rpc("crypto_raise_incident", {
            p_check: "crypto_withdrawal_nonce", p_fp: `crypto_withdrawal_nonce:${w.id}`,
            p_details: { withdrawal: w.id, tx: w.tx_hash, nonce: w.nonce },
          }));
        } else if (!/already known|known transaction/i.test(msg)) {
          await rpc("crypto_withdrawal_error", { p_id: w.id, p_reason: msg.slice(0, 300) });
        }
      }
      await rpc("crypto_withdrawal_broadcast", { p_id: w.id });
      results[w.id] = "rebroadcast";
    }
  }

  if (inFlight) return { ok: true, results };
  const next = (rows ?? []).find((w) => w.status === "APPROVED" || w.status === "LIQUIDITY_PENDING");
  if (!next) return { ok: true, results };

  // Destination must still be the user's verified wallet.
  const { data: wal } = await admin
    .from("user_wallets").select("normalized_address").eq("user_id", next.user_id).eq("is_verified", true);
  if (!wal?.some((x: any) => x.normalized_address === next.to_address)) {
    await must(rpc("crypto_withdrawal_failed", { p_id: next.id, p_reason: "destination wallet no longer verified" }));
    return { ok: true, results: { ...results, [next.id]: "released" } };
  }
  const to = next.to_address as Hex;
  const units = BigInt(String(next.units).split(".")[0] ?? "0");
  const request =
    next.asset_key === "ETH"
      ? { to, value: units }
      : { to: env.usdc as Hex, data: encodeFunctionData({ abi: ERC20, functionName: "transfer", args: [to, units] }) };

  // Exact-transaction gas estimate with a safety margin.
  const [gasEstimate, gasPrice] = await Promise.all([
    env.client.estimateGas({ account: account.address, ...request } as any).catch(() => null),
    env.client.getGasPrice().catch(() => null),
  ]);
  if (gasEstimate == null || gasPrice == null) {
    await rpc("crypto_withdrawal_error", { p_id: next.id, p_reason: "gas estimation failed; will retry" });
    return { ok: true, results: { ...results, [next.id]: "gas_estimate_retry" } };
  }
  const feeWei = (gasEstimate * GAS_MARGIN_BPS / 10_000n) * gasPrice;

  // Funds checks. Shortage is an explicit queued state, never a silent failure.
  const ethBal = await env.client.getBalance({ address: account.address });
  if (next.asset_key === "USDC") {
    const bal = (await env.client.readContract({ address: env.usdc as Hex, abi: ERC20, functionName: "balanceOf", args: [account.address] })) as bigint;
    if (bal < units || ethBal < feeWei) {
      await rpc("crypto_withdrawal_liquidity_pending", { p_id: next.id, p_reason: "payout wallet liquidity shortfall (USDC or gas)" });
      return { ok: true, results: { ...results, [next.id]: "liquidity_pending" } };
    }
  } else {
    // Native payout: on Ethereum L1 the gas is deducted from the player's payout;
    // on low-fee chains the house subsidizes gas. Payout + fee never exceeds the hold.
    let value = units;
    if (env.chainId === 1) {
      value = units - feeWei;
      if (value <= 0n) {
        await rpc("crypto_withdrawal_error", { p_id: next.id, p_reason: "amount does not cover network gas; increase the withdrawal amount" });
        return { ok: true, results: { ...results, [next.id]: "below_gas" } };
      }
      (request as any).value = value;
    }
    if (ethBal < value + (env.chainId === 1 ? 0n : feeWei)) {
      await rpc("crypto_withdrawal_liquidity_pending", { p_id: next.id, p_reason: "payout wallet liquidity shortfall (ETH)" });
      return { ok: true, results: { ...results, [next.id]: "liquidity_pending" } };
    }
  }

  const nonce = await env.client.getTransactionCount({ address: account.address, blockTag: "pending" });
  const prepared = await wallet.prepareTransactionRequest({ ...request, nonce, chain: env.chain, account } as any);
  if ((prepared as any).chainId !== env.chainId) return { ok: false, reason: "CHAIN_MISMATCH" };
  const raw = await wallet.signTransaction(prepared as any);
  const hash = keccak256(raw);
  await must(rpc("crypto_withdrawal_signed", { p_id: next.id, p_hash: hash, p_nonce: nonce, p_raw: raw }));
  try {
    await env.client.sendRawTransaction({ serializedTransaction: raw });
    await must(rpc("crypto_withdrawal_broadcast", { p_id: next.id }));
    results[next.id] = "sent";
  } catch (e) {
    await rpc("crypto_withdrawal_error", { p_id: next.id, p_reason: String((e as Error).message).slice(0, 300) });
    results[next.id] = "broadcast_retry";
  }
  return { ok: true, results };
}

/** Detect-only reconciliation across all enabled chains: on-chain value vs ledger custody liability. */
export async function runReconciliation() {
  const { rpc } = await db();
  const chains = await enabledChainIds();
  let totalCents = 0n;
  const perChain: Record<string, any> = {};
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
      usdc += (await env.client.readContract({ address: env.usdc as Hex, abi: ERC20, functionName: "balanceOf", args: [a] })) as bigint;
      wei += await env.client.getBalance({ address: a });
    }
    const price = await snapshotEthPrice(env).catch(() => null);
    const cents = usdcUnitsToCents(usdc) + (price ? weiToCents(wei, price.priceMicro) : 0n);
    perChain[String(chainId)] = { usdc_units: usdc.toString(), wei: wei.toString(), cents: Number(cents), priced: !!price };
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

export async function envOkForAutoApproval(chainId: number = TESTNET.chainId): Promise<boolean> {
  const r = await loadChainEnv(chainId).catch(() => ({ ok: false as const, reason: "ERR" }));
  return r.ok;
}
