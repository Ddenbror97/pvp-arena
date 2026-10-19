/**
 * Gated Base deposit sweep runner.
 *
 * CRYPTO_DEPOSIT_SWEEP_ENABLED must be exactly "true". Otherwise this returns
 * before any RPC, database, or signature.
 *
 * CRYPTO_DEPOSIT_XPRV is read from the Worker secret binding only. It has to
 * match CRYPTO_DEPOSIT_XPUB (same public key and chain code). Version 1 rows
 * are checked as historical addresses and are not swept. Version 2 rows must
 * match the child private key before a transaction is signed. The key is not
 * stored on a sweep row and is stripped from logs.
 *
 * Set the secret in the Cloudflare dashboard for the pvpspinarena worker.
 * Do not commit it and do not paste it into chat.
 */
import { HDKey } from "@scure/bip32";
import { parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { workerEnv } from "@/lib/worker-env";
import { depositXpub, depositDerivationPath } from "./addresses.server";
import { decidePayout } from "./payout-finality";
import { MAX_INFLIGHT_RECONCILE_PER_RUN, sweepDeadline } from "./job-budget";
import { countActions, logCryptoOps } from "./ops-log";
import {
  applySweepTick,
  classifySweepFlag,
  decodeSignedSweep,
  guardSweepIo,
  prepareSweepPreflight,
  redactSweepLog,
  resolveSweepMode,
  selectSweepTargets,
  signSweepTransaction,
  SWEEP_CHAIN_ID,
  SWEEP_USDC,
  MAX_NEW_SWEEPS_PER_RUN,
  type AccountView,
  type BroadcastOutcome,
  type ChainTransactionView,
  type ReceiptView,
  type SweepAsset,
  type SweepBegin,
  type SweepConfirmProof,
  type SweepIo,
  type SweepRecord,
  type SweepStatus,
  type SweepStore,
  type SweepTarget,
} from "./deposit-sweep";

const ERC20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export type SweepRunResult =
  | { ok: true; skipped: "DISABLED" | "CHAIN" }
  | {
      ok: true;
      mode: "dry_run";
      actions: { address: string; action: string }[];
      signed: 0;
      broadcast: 0;
    }
  | { ok: true; mode: "live"; actions: { address: string; action: string }[] }
  | { ok: false; error: string };

export async function runDepositSweep(chainId: number): Promise<SweepRunResult> {
  const decision = resolveSweepMode(
    workerEnv("CRYPTO_DEPOSIT_SWEEP_ENABLED"),
    workerEnv("CRYPTO_DEPOSIT_SWEEP_DRY_RUN"),
  );
  if (!decision.ok) {
    logCryptoOps("crypto_sweep_config", { ok: false, error: decision.reason, chainId });
    return { ok: false, error: decision.reason };
  }
  if (
    decision.mode === "live" &&
    classifySweepFlag(workerEnv("CRYPTO_DEPOSIT_SWEEP_DRY_RUN")) !== "off"
  ) {
    logCryptoOps("crypto_sweep_config", { ok: false, error: "SWEEP_MODE_CONFLICT", chainId });
    return { ok: false, error: "SWEEP_MODE_CONFLICT" };
  }
  if (decision.mode === "off") return { ok: true, skipped: "DISABLED" };
  if (chainId !== SWEEP_CHAIN_ID) return { ok: true, skipped: "CHAIN" };
  const secrets: string[] = [];
  try {
    const xprv = decision.mode === "live" ? workerEnv("CRYPTO_DEPOSIT_XPRV") : undefined;
    const hot =
      decision.mode === "live" ? workerEnv(`CRYPTO_HOT_WALLET_PRIVATE_KEY_${chainId}`) : undefined;
    if (xprv) secrets.push(xprv);
    if (hot) secrets.push(hot);
    return await runEnabledSweep(chainId, secrets, decision.mode, xprv);
  } catch (error) {
    console.error(
      "[crypto:sweep]",
      redactSweepLog(error instanceof Error ? error.message : "failed", secrets),
    );
    logCryptoOps("crypto_sweep_run", {
      ok: false,
      error: "SWEEP_FAILED",
      chainId,
      mode: decision.mode,
    });
    return { ok: false, error: "SWEEP_FAILED" };
  }
}

async function runEnabledSweep(
  chainId: number,
  secrets: string[],
  mode: "dry_run" | "live",
  xprv: string | undefined,
): Promise<SweepRunResult> {
  const started = Date.now();
  const { loadChainEnv } = await import("./chain.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin: Admin = {
    rpc: async (fn, args) =>
      (await supabaseAdmin.rpc(fn as never, (args ?? {}) as never)) as {
        data: unknown;
        error: { message: string } | null;
      },
  };
  const envr = await loadChainEnv(chainId);
  if (!envr.ok) return { ok: false, error: envr.reason };
  const env = envr.env;

  const { data: bookRows, error: bookError } = await supabaseAdmin
    .from("crypto_deposit_addresses")
    .select("address, derivation_index, derivation_version")
    .eq("chain_id", chainId)
    .order("derivation_index", { ascending: true });
  if (bookError) throw new Error(bookError.message);
  const book: SweepTarget[] = (bookRows ?? []).map((row) => ({
    derivationIndex: Number(row.derivation_index),
    derivationVersion: Number(row.derivation_version) === 2 ? 2 : 1,
    address: String(row.address).toLowerCase(),
  }));

  const readiness = await readSweepReadiness(admin);
  const hotAccount =
    mode === "live"
      ? payoutAccount(workerEnv(`CRYPTO_HOT_WALLET_PRIVATE_KEY_${chainId}`), secrets)
      : null;
  const configuredUsdc = (env.usdc ?? "").toLowerCase();
  const auth = prepareSweepPreflight({
    mode,
    xprv,
    xpub: depositXpub(),
    treasury: env.treasury,
    payout: env.payout,
    payoutKeyAddress: hotAccount?.address ?? null,
    usdc: readiness.ok && readiness.usdc.toLowerCase() !== configuredUsdc ? "" : configuredUsdc,
    chainId,
    activeDepositCount:
      readiness.ok && readiness.depositAddress === env.treasury.toLowerCase()
        ? readiness.depositCount
        : 0,
    activePayoutCount:
      readiness.ok && readiness.payoutAddress === env.payout.toLowerCase()
        ? readiness.payoutCount
        : 0,
    schemaReady: readiness.ok,
    book: book.map((row) => ({
      index: row.derivationIndex,
      address: row.address,
      version: row.derivationVersion,
    })),
    requireKnownAnchors: true,
  });
  if (!auth.ok) {
    await raiseIncident(admin, {
      check: "crypto_sweep_auth",
      fp: `crypto_sweep_auth:${chainId}:${mode}:${auth.reason}`,
      details: {
        reason: auth.reason,
        index: "index" in auth && auth.index != null ? String(auth.index) : "",
      },
    });
    logCryptoOps("crypto_sweep_run", {
      ok: false,
      error: auth.reason,
      chainId,
      mode,
      durationMs: Date.now() - started,
    });
    return { ok: false, error: auth.reason };
  }

  const gasFundingAvailable =
    mode === "live" &&
    hotAccount != null &&
    hotAccount.address.toLowerCase() === env.payout.toLowerCase();
  const store = supabaseSweepStore(admin);
  const inflightAll = await store.listInflight(chainId);
  const inflightDeferred = Math.max(0, inflightAll.length - MAX_INFLIGHT_RECONCILE_PER_RUN);
  const inflight = inflightAll.slice(0, MAX_INFLIGHT_RECONCILE_PER_RUN);
  const cursor = await cursorGet(admin, chainId);
  const selected = selectSweepTargets({
    book,
    inflight,
    cursor,
    limit: MAX_NEW_SWEEPS_PER_RUN,
  });

  let gasPriceWei: bigint | null = null;
  const rpcStarted = Date.now();
  try {
    gasPriceWei = await env.client.getGasPrice();
  } catch {
    gasPriceWei = null;
  }
  const rpcMs = Date.now() - rpcStarted;
  let safeBlock: bigint | null = null;
  try {
    const safe = await env.client.getBlock({ blockTag: "safe" });
    safeBlock = safe.number ?? null;
  } catch {
    safeBlock = null;
  }

  const accounts = new Map<string, AccountView>();
  const needed = new Set<string>([
    env.payout.toLowerCase(),
    ...selected.targets.map((row) => row.address),
  ]);
  const reader = env.client as unknown as BalanceClient;
  for (const address of needed) {
    accounts.set(address, await readAccount(reader, address));
  }

  const tickIo: SweepIo = {
    account: (address) => accounts.get(address.toLowerCase()) ?? { error: "rpc" },
    receipt: (hash) =>
      readReceipt(
        {
          client: env.client as unknown as Parameters<typeof decidePayout>[0]["primary"],
          clientB: env.clientB as unknown as Parameters<typeof decidePayout>[0]["secondary"],
          networkMode: env.networkMode,
        },
        hash,
        safeBlock,
      ),
    broadcast: (raw) =>
      broadcastRaw(
        {
          client: env.client as unknown as RawSender,
          clientB: (env.clientB as unknown as RawSender | null) ?? null,
        },
        raw,
      ),
    sign: async (req) => {
      const account =
        req.kind === "gas"
          ? hotAccount
          : xprv && req.derivationIndex != null
            ? depositAccount(xprv, req.derivationIndex)
            : null;
      if (!account) throw new Error("SIGNER_MISSING");
      return signSweepTransaction(account, req);
    },
    store,
    raise: () => undefined,
    reserveNonce: (input) => reservePayoutNonce(admin, chainId, input),
    markNonceSigned: (input) => markPayoutNonceSigned(admin, chainId, input),
    releaseNonce: (input) => releasePayoutNonce(admin, chainId, input),
    decodeSigned: (raw) => decodeSignedSweep(raw),
    chainTransaction: (hash) => readChainTransaction(env.client, hash),
  };
  const tick = await applySweepTick(
    {
      chainId,
      treasury: env.treasury,
      payout: env.payout,
      gasPriceWei,
      gasFundingAvailable,
      book,
      targets: selected.targets,
      nowIso: new Date().toISOString(),
      mode,
      deadlineAtMs: sweepDeadline(started),
    },
    guardSweepIo(mode, tickIo),
  );

  for (const incident of tick.incidents) {
    await raiseIncident(admin, incident);
  }
  await cursorSet(admin, chainId, selected.nextCursor);
  const counts = countActions(tick.actions);
  logCryptoOps("crypto_sweep_run", {
    ok: tick.aborted == null,
    mode,
    chainId,
    durationMs: Date.now() - started,
    rpcMs,
    gasPriceOk: gasPriceWei != null,
    inflightDeferred,
    error: tick.aborted ?? "",
    actions: JSON.stringify(counts),
  });
  if (tick.aborted) return { ok: false, error: tick.aborted };
  if (mode === "dry_run") {
    return { ok: true, mode, actions: tick.actions, signed: 0, broadcast: 0 };
  }
  return { ok: true, mode, actions: tick.actions };
}

async function readSweepReadiness(admin: Admin): Promise<
  | {
      ok: true;
      depositCount: number;
      depositAddress: string;
      payoutCount: number;
      payoutAddress: string;
      usdc: string;
    }
  | { ok: false }
> {
  const { data, error } = await admin.rpc("crypto_sweep_readiness");
  if (error || data == null || typeof data !== "object") return { ok: false };
  const body = data as Record<string, unknown>;
  if (body["functions_ready"] !== true) return { ok: false };
  return {
    ok: true,
    depositCount: Number(body["deposit_count"] ?? 0),
    depositAddress: String(body["deposit_address"] ?? "").toLowerCase(),
    payoutCount: Number(body["payout_count"] ?? 0),
    payoutAddress: String(body["payout_address"] ?? "").toLowerCase(),
    usdc: String(body["usdc"] ?? "").toLowerCase(),
  };
}

function payoutAccount(raw: string | undefined, secrets: string[]) {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const pk = (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) return null;
  secrets.push(pk);
  try {
    return privateKeyToAccount(pk);
  } catch {
    return null;
  }
}

function depositAccount(xprv: string, index: number) {
  try {
    const node = HDKey.fromExtendedKey(xprv).derive(depositDerivationPath(SWEEP_CHAIN_ID, index));
    if (!node.privateKey) throw new Error("XPRV_INVALID");
    const pk = `0x${Buffer.from(node.privateKey).toString("hex")}` as Hex;
    return privateKeyToAccount(pk);
  } catch {
    throw new Error("XPRV_INVALID");
  }
}

async function readAccount(client: BalanceClient, address: string): Promise<AccountView> {
  try {
    const hex = address as Hex;
    const [ethWei, usdcUnits, nonce] = await Promise.all([
      client.getBalance({ address: hex }),
      client.readContract({
        address: SWEEP_USDC,
        abi: ERC20,
        functionName: "balanceOf",
        args: [hex],
      }),
      client.getTransactionCount({ address: hex, blockTag: "pending" }),
    ]);
    return { ethWei, usdcUnits: BigInt(usdcUnits as string | number | bigint), nonce };
  } catch {
    return { error: "rpc" };
  }
}

async function readReceipt(
  env: {
    client: Parameters<typeof decidePayout>[0]["primary"];
    clientB: Parameters<typeof decidePayout>[0]["secondary"];
    networkMode: string;
  },
  hash: string,
  safeBlock: bigint | null,
): Promise<ReceiptView> {
  let saw: "found" | "missing" | "error" = "error";
  try {
    const receipt = await env.client.getTransactionReceipt({ hash: hash as Hex });
    saw = receipt ? "found" : "missing";
  } catch (error) {
    saw = receiptMissing(error) ? "missing" : "error";
  }
  if (saw === "missing") return { state: "missing" };
  if (saw === "error" || safeBlock == null) return { state: "rpc_error" };
  const decision = await decidePayout(
    { primary: env.client, secondary: env.clientB, networkMode: env.networkMode },
    hash,
    safeBlock,
  );
  if (decision.action === "confirm") return { state: "success", blockNumber: decision.block };
  if (decision.action === "release") return { state: "reverted", blockNumber: decision.block };
  if (decision.action === "wait_unsafe" || decision.action === "wait_agreement") {
    return { state: "pending_finality", blockNumber: decision.block };
  }
  return { state: "rpc_error" };
}

async function broadcastRaw(
  env: { client: RawSender; clientB: RawSender | null },
  raw: string,
): Promise<BroadcastOutcome> {
  const clients = [env.client, env.clientB].filter((client) => client != null);
  for (const client of clients) {
    try {
      await client.sendRawTransaction({ serializedTransaction: raw as Hex });
      return "ok";
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/already known|known transaction/i.test(msg)) return "already_known";
      if (/nonce too low/i.test(msg)) return "nonce_too_low";
    }
  }
  return "rpc_error";
}

type Admin = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function supabaseSweepStore(admin: Admin): SweepStore {
  const rpc = (fn: string, args?: Record<string, unknown>) => admin.rpc(fn, args);
  return {
    async listInflight(chainId) {
      const { data, error } = await rpc("crypto_sweep_inflight", { p_chain: chainId });
      if (error) throw new Error(error.message);
      return ((data ?? []) as DbSweep[]).map(asRecord);
    },
    async listForDeposit(chainId, address) {
      const { data, error } = await rpc("crypto_sweep_for_address", {
        p_chain: chainId,
        p_deposit: address.toLowerCase(),
      });
      if (error) throw new Error(error.message);
      return ((data ?? []) as DbSweep[]).map(asRecord);
    },
    async begin(row: SweepBegin) {
      if (row.derivationVersion !== 2) return { created: false };
      const { data, error } = await rpc("crypto_sweep_begin", {
        p_chain: row.chainId,
        p_deposit: row.depositAddress,
        p_index: row.derivationIndex,
        p_asset: row.asset,
        p_amount: row.amount.toString(),
        p_nonce: row.nonce,
        p_payer: row.payer,
        p_to: row.toAddress,
        p_gas: row.gasLimit.toString(),
        p_fee: row.maxFeePerGas.toString(),
      });
      if (error) throw new Error(error.message);
      const body = (data ?? {}) as { created?: boolean; id?: string };
      if (body.created === true && body.id) return { created: true, id: body.id };
      return { created: false };
    },
    async storeSigned(id, hash, raw) {
      const { error } = await rpc("crypto_sweep_store_signed", {
        p_id: id,
        p_hash: hash,
        p_raw: raw,
      });
      if (error) throw new Error(error.message);
    },
    async markBroadcast(id) {
      const { error } = await rpc("crypto_sweep_mark_broadcast", { p_id: id });
      if (error) throw new Error(error.message);
    },
    async confirm(id, proof: SweepConfirmProof) {
      const { error } = await rpc("crypto_sweep_confirm", {
        p_id: id,
        p_hash: proof.hash,
        p_sender: proof.sender,
        p_to: proof.to,
        p_amount: proof.amount.toString(),
        p_chain: proof.chainId,
      });
      if (error) throw new Error(error.message);
    },
    async fail(id, reason) {
      const { error } = await rpc("crypto_sweep_fail", { p_id: id, p_reason: reason });
      if (error) throw new Error(error.message);
    },
    async note(id, reason) {
      const { error } = await rpc("crypto_sweep_note", { p_id: id, p_reason: reason });
      if (error) throw new Error(error.message);
    },
  };
}

async function reservePayoutNonce(
  admin: Admin,
  chainId: number,
  input: {
    payer: string;
    purpose: "withdrawal" | "gas_stipend";
    ownerId: string;
    chainNonce: number;
  },
): Promise<{ nonce: number; reused: boolean } | null> {
  const { data, error } = await admin.rpc("crypto_reserve_nonce", {
    p_chain: chainId,
    p_payer: input.payer.toLowerCase(),
    p_purpose: input.purpose,
    p_owner: input.ownerId,
    p_chain_nonce: input.chainNonce,
  });
  if (error || data == null || typeof data !== "object") return null;
  const body = data as { nonce?: number; reused?: boolean };
  const nonce = Number(body.nonce);
  if (!Number.isInteger(nonce) || nonce < 0) return null;
  return { nonce, reused: body.reused === true };
}

async function markPayoutNonceSigned(
  admin: Admin,
  chainId: number,
  input: { payer: string; nonce: number; ownerId: string },
): Promise<void> {
  const { error } = await admin.rpc("crypto_nonce_mark_signed", {
    p_chain: chainId,
    p_payer: input.payer.toLowerCase(),
    p_nonce: input.nonce,
    p_owner: input.ownerId,
  });
  if (error) throw new Error(error.message);
}

async function releasePayoutNonce(
  admin: Admin,
  chainId: number,
  input: { payer: string; nonce: number; ownerId: string; chainNonce: number },
): Promise<void> {
  await admin.rpc("crypto_nonce_release", {
    p_chain: chainId,
    p_payer: input.payer.toLowerCase(),
    p_nonce: input.nonce,
    p_owner: input.ownerId,
    p_chain_nonce: input.chainNonce,
  });
}

async function readChainTransaction(
  client: unknown,
  hash: string,
): Promise<ChainTransactionView | null> {
  try {
    const tx = await (
      client as {
        getTransaction: (args: { hash: Hex }) => Promise<{
          hash: Hex;
          from: Hex;
          to: Hex | null;
          value: bigint;
          input: Hex;
          nonce: number;
          chainId?: number;
        }>;
      }
    ).getTransaction({ hash: hash as Hex });
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      input: tx.input,
      nonce: tx.nonce,
      chainId: tx.chainId ?? null,
    };
  } catch {
    return null;
  }
}

async function cursorGet(admin: Admin, chainId: number): Promise<number> {
  const { data, error } = await admin.rpc("crypto_sweep_cursor_get", { p_chain: chainId });
  if (error) throw new Error(error.message);
  const value = Number(data ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

async function cursorSet(admin: Admin, chainId: number, next: number): Promise<void> {
  const { error } = await admin.rpc("crypto_sweep_cursor_set", { p_chain: chainId, p_next: next });
  if (error) throw new Error(error.message);
}

async function raiseIncident(
  admin: Admin,
  incident: { check: string; fp: string; details: Record<string, string> },
): Promise<void> {
  const { error } = await admin.rpc("crypto_raise_incident", {
    p_check: incident.check,
    p_fp: incident.fp,
    p_details: incident.details,
  });
  if (error) console.error("[crypto:sweep]", redactSweepLog(error.message, []));
}

interface DbSweep {
  id: string;
  deposit_address: string;
  derivation_index: number;
  asset_key: string;
  amount: string;
  gas_limit: string;
  max_fee_per_gas: string;
  tx_hash: string | null;
  signed_raw_tx: string | null;
  nonce: number | null;
  status: string;
  payer: string;
  to_address: string;
  idempotency_key: string;
  error: string | null;
}

function asRecord(row: DbSweep): SweepRecord {
  return {
    id: row.id,
    chainId: SWEEP_CHAIN_ID,
    depositAddress: row.deposit_address.toLowerCase(),
    derivationIndex: Number(row.derivation_index),
    asset: asAsset(row.asset_key),
    amount: BigInt(row.amount),
    txHash: row.tx_hash,
    signedRawTx: row.signed_raw_tx,
    nonce: row.nonce,
    status: asStatus(row.status),
    payer: row.payer.toLowerCase(),
    toAddress: row.to_address.toLowerCase(),
    idempotencyKey: row.idempotency_key,
    error: row.error,
    maxFeePerGas: BigInt(row.max_fee_per_gas),
    gasLimit: BigInt(row.gas_limit),
  };
}

function asAsset(value: string): SweepAsset {
  if (value === "ETH" || value === "USDC" || value === "GAS") return value;
  throw new Error("SWEEP_ASSET");
}

function asStatus(value: string): SweepStatus {
  if (
    value === "PENDING" ||
    value === "SIGNED" ||
    value === "BROADCAST" ||
    value === "CONFIRMED" ||
    value === "FAILED"
  ) {
    return value;
  }
  throw new Error("SWEEP_STATUS");
}

interface BalanceClient {
  getBalance: (args: { address: Hex }) => Promise<bigint>;
  readContract: (args: {
    address: Hex;
    abi: typeof ERC20;
    functionName: "balanceOf";
    args: readonly [Hex];
  }) => Promise<unknown>;
  getTransactionCount: (args: { address: Hex; blockTag: "pending" }) => Promise<number>;
}

interface RawSender {
  sendRawTransaction: (args: { serializedTransaction: Hex }) => Promise<unknown>;
}

function receiptMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    name === "TransactionReceiptNotFoundError" || /not found|could not be found/i.test(message)
  );
}
