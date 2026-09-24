import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  parseAbi,
  parseAbiItem,
  type Hex,
  type PublicClient,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { TESTNET, checkRpcUrl, checkStaticConfig, weiToCents, usdcUnitsToCents } from "./allowlist";

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
  client: PublicClient;
  treasury: `0x${string}`;
  payout: `0x${string}`;
  settings: any;
  minDepositUnits: Record<string, bigint>;
}

/** Refuses to return unless every testnet-only invariant holds. Raises an incident on failure. */
export async function loadVerifiedEnv(): Promise<{ ok: true; env: Env } | { ok: false; reason: string }> {
  const { admin, rpc } = await db();
  const fail = async (reason: string) => {
    await rpc("crypto_raise_incident", {
      p_check: "crypto_env",
      p_fp: `crypto_env:${reason}:${new Date().toISOString().slice(0, 13)}`,
      p_details: { reason },
    });
    return { ok: false as const, reason };
  };
  const url = process.env["BASE_SEPOLIA_RPC_URL"];
  const rpcCheck = checkRpcUrl(url);
  if (!rpcCheck.ok) return fail(rpcCheck.reason);
  const [{ data: s }, { data: assets }, { data: tr }] = await Promise.all([
    admin.from("crypto_settings").select("*").single(),
    admin.from("chain_assets").select("*").eq("chain_id", TESTNET.chainId),
    admin.from("chain_treasury_accounts").select("*").eq("chain_id", TESTNET.chainId).eq("is_active", true),
  ]);
  if (!s) return fail("SETTINGS_MISSING");
  const usdc = assets?.find((a: any) => a.asset_key === "USDC");
  const eth = assets?.find((a: any) => a.asset_key === "ETH");
  const st = checkStaticConfig({
    environment: s.environment,
    mainnetEnabled: s.mainnet_enabled,
    chainId: Number(s.chain_id),
    usdc: usdc?.contract_address,
    feed: eth?.price_feed_address,
  });
  if (!st.ok) return fail(st.reason);
  const client = createPublicClient({ chain: baseSepolia, transport: http(url, { timeout: 10_000 }) }) as PublicClient;
  let liveChain: number;
  try {
    liveChain = await client.getChainId();
  } catch {
    return { ok: false, reason: "RPC_UNREACHABLE" };
  }
  if (liveChain !== TESTNET.chainId) return fail("RPC_CHAIN_MISMATCH");
  const code = await client.getCode({ address: TESTNET.usdc as Hex }).catch(() => undefined);
  if (!code || code === "0x") return fail("USDC_NO_CODE");
  const treasury = tr?.find((t: any) => t.role === "deposit")?.address?.toLowerCase();
  const payout = tr?.find((t: any) => t.role === "payout")?.address?.toLowerCase();
  if (!treasury || !payout) return fail("TREASURY_MISSING");
  return {
    ok: true,
    env: {
      client,
      treasury,
      payout,
      settings: s,
      minDepositUnits: { USDC: BigInt(usdc.min_deposit_units), ETH: BigInt(Number(eth.min_deposit_units).toLocaleString("fullwide", { useGrouping: false })) },
    },
  };
}

/** Reads Chainlink ETH/USD on the server and stores a snapshot. Never trusts a browser price. */
export async function snapshotEthPrice(env: Env): Promise<{ id: string; priceMicro: bigint } | null> {
  const { rpc } = await db();
  const feed = TESTNET.ethUsdFeed as Hex;
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
      p_asset: "ETH",
      p_feed: feed,
      p_round: roundId.toString(),
      p_price_micro: Number(priceMicro),
      p_observed: new Date(Number(updatedAt) * 1000).toISOString(),
    }),
  );
  return { id, priceMicro };
}

/** Deposit watcher: scan, re-scan overlap, verify at the safe block, credit idempotently. */
export async function runDepositWatcher() {
  const envr = await loadVerifiedEnv();
  if (!envr.ok) return { ok: false, reason: envr.reason };
  const env = envr.env;
  const { rpc } = await db();
  const s = env.settings;
  if (!s.crypto_system_enabled) return { ok: true, paused: true };

  const [latest, safeBlock] = await Promise.all([
    env.client.getBlockNumber(),
    env.client.getBlock({ blockTag: "safe" }).then((b) => b.number!),
  ]);
  const cursorRaw = await must<number | null>(rpc("crypto_get_cursor", { p_chain: TESTNET.chainId }));
  const cursor = cursorRaw == null ? latest - 5n : BigInt(cursorRaw);
  const overlap = BigInt(s.overlap_blocks);
  const ethFrom = cursor + 1n;
  const ethTo = latest < cursor + BigInt(MAX_ETH_BLOCKS_PER_RUN) ? latest : cursor + BigInt(MAX_ETH_BLOCKS_PER_RUN);
  const logFrom = cursor > overlap ? cursor - overlap : 0n;
  const logTo = ethTo;
  let observed = 0;

  // USDC: Transfer logs to the treasury, over the overlap window (reorg-safe re-scan).
  for (let from = logFrom; from <= logTo; from += MAX_LOG_RANGE) {
    const to = from + MAX_LOG_RANGE - 1n < logTo ? from + MAX_LOG_RANGE - 1n : logTo;
    const logs = await env.client.getLogs({
      address: TESTNET.usdc as Hex,
      event: TRANSFER,
      args: { to: env.treasury },
      fromBlock: from,
      toBlock: to,
    });
    for (const l of logs) {
      if (l.address.toLowerCase() !== TESTNET.usdc || !l.args.value || l.removed) continue;
      await must(
        rpc("crypto_observe_deposit", {
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

  // Native ETH: scan new blocks' transactions to the treasury.
  const heights: bigint[] = [];
  for (let b = ethFrom; b <= ethTo; b++) heights.push(b);
  for (let i = 0; i < heights.length; i += 10) {
    const blocks = await Promise.all(
      heights.slice(i, i + 10).map((n) => env.client.getBlock({ blockNumber: n, includeTransactions: true })),
    );
    for (const blk of blocks) {
      for (const tx of blk.transactions) {
        if (typeof tx === "string" || !tx.to || tx.to.toLowerCase() !== env.treasury || tx.value <= 0n) continue;
        await must(
          rpc("crypto_observe_deposit", {
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
  await must(rpc("crypto_set_cursor", { p_chain: TESTNET.chainId, p_block: Number(ethTo) }));

  // Credit: re-verify every pending deposit against the chain before crediting.
  let credited = 0;
  if (s.deposits_enabled) {
    const pending = await must<any[]>(rpc("crypto_pending_deposits", { p_chain: TESTNET.chainId, p_max_block: Number(latest) }));
    let price: { id: string; priceMicro: bigint } | null | undefined;
    for (const d of pending ?? []) {
      const receipt = await env.client.getTransactionReceipt({ hash: d.tx_hash }).catch(() => null);
      if (!receipt || receipt.status !== "success") continue; // stays pending; re-evaluated next run
      if (receipt.blockNumber !== BigInt(d.block_number)) {
        await must(
          rpc("crypto_observe_deposit", {
            p_asset: d.asset_key, p_tx: d.tx_hash, p_log: d.log_index, p_block: Number(receipt.blockNumber),
            p_from: d.from_address, p_to: d.to_address, p_units: String(d.units),
          }),
        );
      }
      if (receipt.blockNumber > safeBlock) continue;
      if (d.asset_key === "USDC") {
        const log = receipt.logs.find((l) => l.logIndex === d.log_index);
        if (!log || log.address.toLowerCase() !== TESTNET.usdc) continue;
        if ((log.topics[2] ?? "").slice(-40).toLowerCase() !== env.treasury.slice(2)) continue;
        if (BigInt(log.data) !== BigInt(d.units)) continue;
      } else {
        const tx = await env.client.getTransaction({ hash: d.tx_hash });
        if (tx.to?.toLowerCase() !== env.treasury || tx.value !== BigInt(d.units)) continue;
        if (price === undefined) price = await snapshotEthPrice(env).catch(() => null);
        if (!price) continue; // awaiting valuation
      }
      const r = await must<any>(
        rpc("crypto_credit_deposit", { p_id: d.id, p_price_snapshot: d.asset_key === "ETH" ? price?.id : null }),
      );
      if (r?.status === "CREDITED") credited++;
    }
  }
  return { ok: true, latest: Number(latest), safe: Number(safeBlock), cursor: Number(ethTo), observed, credited };
}

/** Withdrawal worker: one in-flight payout at a time, crash-safe (sign → store → broadcast). */
export async function runWithdrawalWorker() {
  const envr = await loadVerifiedEnv();
  if (!envr.ok) return { ok: false, reason: envr.reason };
  const env = envr.env;
  const { admin, rpc } = await db();
  const s = env.settings;
  if (!s.crypto_system_enabled || !s.withdrawals_enabled) return { ok: true, paused: true };
  const pk = process.env["CRYPTO_HOT_WALLET_PRIVATE_KEY"] as Hex | undefined;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) return { ok: false, reason: "HOT_KEY_MISSING" };
  const account = privateKeyToAccount(pk);
  if (account.address.toLowerCase() !== env.payout) return { ok: false, reason: "HOT_KEY_ADDRESS_MISMATCH" };
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(process.env["BASE_SEPOLIA_RPC_URL"]) });

  const rows = await must<any[]>(rpc("crypto_next_withdrawals"));
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
  const next = (rows ?? []).find((w) => w.status === "APPROVED");
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
      : { to: TESTNET.usdc as Hex, data: encodeFunctionData({ abi: ERC20, functionName: "transfer", args: [to, units] }) };

  // Funds check.
  const ethBal = await env.client.getBalance({ address: account.address });
  if (next.asset_key === "USDC") {
    const bal = (await env.client.readContract({ address: TESTNET.usdc as Hex, abi: ERC20, functionName: "balanceOf", args: [account.address] })) as bigint;
    if (bal < units) {
      await rpc("crypto_withdrawal_error", { p_id: next.id, p_reason: "payout wallet has insufficient test USDC" });
      return { ok: true, results: { ...results, [next.id]: "insufficient_funds" } };
    }
  } else if (ethBal < units) {
    await rpc("crypto_withdrawal_error", { p_id: next.id, p_reason: "payout wallet has insufficient test ETH" });
    return { ok: true, results: { ...results, [next.id]: "insufficient_funds" } };
  }

  const nonce = await env.client.getTransactionCount({ address: account.address, blockTag: "pending" });
  const prepared = await wallet.prepareTransactionRequest({ ...request, nonce, chain: baseSepolia, account } as any);
  if ((prepared as any).chainId !== TESTNET.chainId) return { ok: false, reason: "CHAIN_MISMATCH" };
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

/** Hourly detect-only reconciliation: on-chain treasury value vs ledger custody liability. */
export async function runReconciliation() {
  const envr = await loadVerifiedEnv();
  if (!envr.ok) return { ok: false, reason: envr.reason };
  const env = envr.env;
  const { rpc } = await db();
  const addrs = Array.from(new Set([env.treasury, env.payout])) as Hex[];
  let usdc = 0n;
  let wei = 0n;
  for (const a of addrs) {
    usdc += (await env.client.readContract({ address: TESTNET.usdc as Hex, abi: ERC20, functionName: "balanceOf", args: [a] })) as bigint;
    wei += await env.client.getBalance({ address: a });
  }
  const price = await snapshotEthPrice(env).catch(() => null);
  if (!price) return { ok: false, reason: "PRICE_STALE" };
  const cents = usdcUnitsToCents(usdc) + weiToCents(wei, price.priceMicro);
  return must(
    rpc("crypto_reconcile", {
      p_onchain_cents: Number(cents),
      p_details: { usdc_units: usdc.toString(), wei: wei.toString(), price_micro: price.priceMicro.toString() },
    }),
  );
}

export async function envOkForAutoApproval(): Promise<boolean> {
  const r = await loadVerifiedEnv().catch(() => ({ ok: false as const, reason: "ERR" }));
  return r.ok;
}
