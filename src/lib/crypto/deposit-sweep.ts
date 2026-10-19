/**
 * Base ETH/USDC deposit sweep. Pure planning, signing checks, and the
 * settlement state machine. No network and no ledger.
 *
 * The destination is only the Base treasury. Gas stipends are the one
 * exception: the payout wallet may send a capped amount of ETH to a known
 * deposit address so that address can pay for its own USDC transfer.
 * Nothing in this module credits or debits a user balance.
 *
 * CRYPTO_DEPOSIT_XPRV is a Cloudflare Worker secret. It is compared with
 * CRYPTO_DEPOSIT_XPUB and then used to sign. It is never written to a sweep
 * row, a log line, or an incident payload.
 *
 * Version 2 rows are swept only when the stored address matches the standard
 * Ethereum address of the child private key. Version 1 rows stay in the book
 * so late deposits can still be credited, and they are not swept. The xprv is
 * not requested and is not logged.
 */
import { HDKey } from "@scure/bip32";
import {
  decodeFunctionData,
  encodeFunctionData,
  getAddress,
  keccak256,
  parseAbi,
  parseTransaction,
  recoverTransactionAddress,
  type Hex,
  type TransactionSerializableEIP1559,
} from "viem";
import { privateKeyToAccount, publicKeyToAddress } from "viem/accounts";
import { BASE_MAINNET } from "./allowlist";
import {
  depositDerivationPath,
  deriveDepositAddress,
  deriveDepositAddressV2,
  ethereumAddressFromCompressedPublicKey,
} from "./addresses.server";

export const SWEEP_CHAIN_ID = 8453;
/** MetaMask treasury. The only ETH/USDC sweep destination. */
export const SWEEP_TREASURY = getAddress("0x9EAff85db9A2559eC958740A6a3b523751237987");
export const SWEEP_USDC = getAddress(BASE_MAINNET.usdc);

export const ETH_TRANSFER_GAS = 21_000n;
export const USDC_TRANSFER_GAS = 80_000n;
/** Hard cap on one ETH stipend from the payout wallet. 0.0002 ETH. */
export const GAS_STIPEND_CAP_WEI = 200_000_000_000_000n;
/** Lifetime sum of non-failed stipends for one deposit address. 0.0004 ETH. */
export const GAS_STIPEND_LIFETIME_CAP_WEI = 400_000_000_000_000n;
/** Non-failed gas rows, including one that is still in flight. */
export const GAS_STIPEND_MAX_FUNDED = 2;
/** Every gas attempt, including failures. A third attempt is refused. */
export const GAS_STIPEND_MAX_ATTEMPTS = 3;
/** Dust below this stays on the deposit address. 0.00001 ETH. */
export const MIN_ETH_SWEEP_WEI = 10_000_000_000_000n;
/** Any positive USDC balance is eligible. The cap still limits gas funding. */
export const MIN_USDC_SWEEP_UNITS = 1n;
export const MAX_NEW_SWEEPS_PER_RUN = 6;

/**
 * Public deposit addresses already allocated on Base. The sweep aborts before
 * signing if the installed xprv does not derive these. The addresses are public.
 */
export const KNOWN_DEPOSIT_ANCHORS = [
  { index: 3, address: "0xe0a1403a2e32c5d52d1620ccce8a5867367ef8fa" },
  { index: 41, address: "0x989642fd0d3e78296081a9417fac253460f2a0c0" },
  { index: 57, address: "0xc60f6abb3af64a21e101c09cd584b6ccc741d1a2" },
] as const;

const ERC20_TRANSFER = parseAbi(["function transfer(address to, uint256 value) returns (bool)"]);
const INFLIGHT = new Set(["PENDING", "SIGNED", "BROADCAST"]);

export type SweepAsset = "ETH" | "USDC" | "GAS";
export type SweepStatus = "PENDING" | "SIGNED" | "BROADCAST" | "CONFIRMED" | "FAILED";
export type BroadcastOutcome = "ok" | "already_known" | "nonce_too_low" | "rpc_error";

export interface SweepTarget {
  derivationIndex: number;
  derivationVersion: 1 | 2;
  address: string;
}

export interface SweepRecord {
  id: string;
  chainId: number;
  depositAddress: string;
  derivationIndex: number;
  asset: SweepAsset;
  amount: bigint;
  txHash: string | null;
  signedRawTx: string | null;
  nonce: number | null;
  status: SweepStatus;
  payer: string;
  toAddress: string;
  idempotencyKey: string;
  error: string | null;
  maxFeePerGas: bigint;
  gasLimit: bigint;
}

export interface SweepBegin {
  chainId: number;
  depositAddress: string;
  derivationIndex: number;
  derivationVersion: 1 | 2;
  asset: SweepAsset;
  amount: bigint;
  nonce: number;
  payer: string;
  toAddress: string;
  maxFeePerGas: bigint;
  gasLimit: bigint;
}

/** Fields the database checks before a sweep row can become CONFIRMED. */
export interface SweepConfirmProof {
  hash: string;
  sender: string;
  to: string;
  amount: bigint;
  chainId: number;
}

export interface SweepStore {
  listInflight(chainId: number): Promise<SweepRecord[]>;
  listForDeposit(chainId: number, address: string): Promise<SweepRecord[]>;
  begin(row: SweepBegin): Promise<{ created: true; id: string } | { created: false }>;
  storeSigned(id: string, hash: string, raw: string): Promise<void>;
  markBroadcast(id: string): Promise<void>;
  confirm(id: string, proof: SweepConfirmProof): Promise<void>;
  fail(id: string, reason: string): Promise<void>;
  note(id: string, reason: string): Promise<void>;
}

export type AccountView = { ethWei: bigint; usdcUnits: bigint; nonce: number } | { error: "rpc" };

export type ReceiptView =
  | { state: "missing" }
  | { state: "rpc_error" }
  | { state: "pending_finality"; blockNumber: bigint }
  | { state: "success"; blockNumber: bigint }
  | { state: "reverted"; blockNumber: bigint };

export type SweepPlan =
  | { action: "retry" }
  | { action: "sweep_eth"; amount: bigint; gasLimit: bigint }
  | { action: "sweep_usdc"; amount: bigint; gasLimit: bigint }
  | { action: "fund_gas"; amount: bigint; gasLimit: bigint }
  | { action: "idle"; reason: string }
  | { action: "alert"; reason: "GAS_CAP"; deficit: bigint };

export interface SignRequest {
  kind: "eth" | "usdc" | "gas";
  from: string;
  to: string;
  amount: bigint;
  nonce: number;
  gasLimit: bigint;
  maxFeePerGas: bigint;
  derivationIndex: number | null;
}

export interface SweepIncident {
  check: string;
  fp: string;
  details: Record<string, string>;
}

export interface SweepContext {
  chainId: number;
  treasury: string;
  payout: string;
  gasPriceWei: bigint | null;
  gasFundingAvailable: boolean;
  book: SweepTarget[];
  targets: SweepTarget[];
  nowIso: string;
  /** Absent means live, which is what the settlement tests exercise. */
  mode?: "live" | "dry_run";
  /** New work stops at this time. In-flight rows are still reconciled. */
  deadlineAtMs?: number;
}

export interface ReservedNonce {
  nonce: number;
  reused: boolean;
}

export interface NonceLeaseRequest {
  payer: string;
  purpose: "withdrawal" | "gas_stipend";
  ownerId: string;
  chainNonce: number;
}

/** Fields recovered from the persisted signed transaction. */
export interface DecodedSweep {
  hash: string;
  chainId: number;
  nonce: number;
  sender: string;
  to: string;
  value: bigint;
  data: Hex;
}

/** The transaction a provider returned for the stored hash. */
export interface ChainTransactionView {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
  input: string;
  nonce: number;
  chainId: number | null;
}

export interface SweepIo {
  account: (address: string) => AccountView;
  receipt: (hash: string) => ReceiptView | Promise<ReceiptView>;
  sign: (
    req: SignRequest,
  ) => { raw: string; hash: string } | Promise<{ raw: string; hash: string }>;
  broadcast: (raw: string) => BroadcastOutcome | Promise<BroadcastOutcome>;
  store: SweepStore;
  raise: (incident: SweepIncident) => void;
  reserveNonce: (input: NonceLeaseRequest) => Promise<ReservedNonce | null>;
  markNonceSigned: (input: { payer: string; nonce: number; ownerId: string }) => Promise<void>;
  releaseNonce: (input: {
    payer: string;
    nonce: number;
    ownerId: string;
    chainNonce: number;
  }) => Promise<void>;
  decodeSigned: (raw: string) => Promise<DecodedSweep | null> | DecodedSweep | null;
  chainTransaction: (
    hash: string,
  ) => Promise<ChainTransactionView | null> | ChainTransactionView | null;
}

export interface SweepTickResult {
  actions: { address: string; action: string }[];
  incidents: SweepIncident[];
  aborted?: string;
}

export function sweepFlagEnabled(flag: string | undefined): boolean {
  return flag === "true";
}

export type SweepFlagState = "off" | "on" | "invalid";

/** Only the exact strings "true" and "false" are configuration. Anything else fails closed. */
export function classifySweepFlag(value: string | undefined): SweepFlagState {
  if (value == null || value === "" || value === "false") return "off";
  if (value === "true") return "on";
  return "invalid";
}

export type SweepModeName = "off" | "dry_run" | "live";

export type SweepModeDecision =
  | { ok: true; mode: SweepModeName }
  | { ok: false; reason: "SWEEP_MODE_CONFLICT" | "SWEEP_FLAG_INVALID" };

/**
 * Live signing requires the live flag exactly "true" and dry-run off.
 * Dry-run requires its own flag exactly "true" and the live flag off.
 * Both on, or any other value, is a conflict. Dry-run never selects live.
 */
export function resolveSweepMode(
  enabled: string | undefined,
  dryRun: string | undefined,
): SweepModeDecision {
  const live = classifySweepFlag(enabled);
  const dry = classifySweepFlag(dryRun);
  if (live === "invalid" || dry === "invalid") return { ok: false, reason: "SWEEP_FLAG_INVALID" };
  if (live === "on" && dry === "on") return { ok: false, reason: "SWEEP_MODE_CONFLICT" };
  if (dry === "on") return { ok: true, mode: "dry_run" };
  if (live === "on") return { ok: true, mode: "live" };
  return { ok: true, mode: "off" };
}

export function sweepIdempotencyKey(
  chainId: number,
  depositAddress: string,
  asset: SweepAsset,
  nonce: number,
): string {
  return `sweep:${chainId}:${depositAddress.toLowerCase()}:${asset}:${nonce}`;
}

export function usdcGasWei(gasPriceWei: bigint): bigint {
  return USDC_TRANSFER_GAS * gasPriceWei;
}

export function ethGasWei(gasPriceWei: bigint): bigint {
  return ETH_TRANSFER_GAS * gasPriceWei;
}

/** Deficit up to twice the USDC gas budget, never above the hard cap. */
export function planGasStipend(
  ethWei: bigint,
  gasPriceWei: bigint,
): { action: "enough" } | { action: "fund"; wei: bigint } | { action: "refuse"; deficit: bigint } {
  const need = usdcGasWei(gasPriceWei);
  if (ethWei >= need) return { action: "enough" };
  const deficit = need * 2n - ethWei;
  if (deficit > GAS_STIPEND_CAP_WEI) return { action: "refuse", deficit };
  if (deficit <= 0n) return { action: "enough" };
  return { action: "fund", wei: deficit };
}

/**
 * Balance-based. Credited and rejected wei are the same on-chain balance,
 * so under-minimum deposits are swept and are not credited here.
 * An in-flight row blocks every new send from that address.
 * USDC that cannot be gas-funded also blocks an ETH sweep, so the ETH is
 * not removed from under a stuck USDC balance.
 */
export function planSweep(input: {
  inflight: boolean;
  ethWei: bigint;
  usdcUnits: bigint;
  gasPriceWei: bigint;
}): SweepPlan {
  if (input.inflight) return { action: "retry" };
  if (input.gasPriceWei <= 0n) return { action: "idle", reason: "GAS_PRICE" };
  if (input.usdcUnits >= MIN_USDC_SWEEP_UNITS) {
    const gas = planGasStipend(input.ethWei, input.gasPriceWei);
    if (gas.action === "enough") {
      return { action: "sweep_usdc", amount: input.usdcUnits, gasLimit: USDC_TRANSFER_GAS };
    }
    if (gas.action === "fund") {
      return { action: "fund_gas", amount: gas.wei, gasLimit: ETH_TRANSFER_GAS };
    }
    return { action: "alert", reason: "GAS_CAP", deficit: gas.deficit };
  }
  const amount = input.ethWei - ethGasWei(input.gasPriceWei);
  if (amount >= MIN_ETH_SWEEP_WEI) {
    return { action: "sweep_eth", amount, gasLimit: ETH_TRANSFER_GAS };
  }
  return { action: "idle", reason: "DUST" };
}

/** Refuses another stipend after the lifetime sum or the attempt ceiling. */
export function assessGasStipend(input: {
  records: { asset: SweepAsset; status: SweepStatus; amount: bigint }[];
  nextAmount: bigint;
}): { ok: true } | { ok: false; reason: "GAS_LIFETIME" | "GAS_ATTEMPTS" } {
  const gas = input.records.filter((row) => row.asset === "GAS");
  const funded = gas.filter((row) => row.status !== "FAILED");
  if (gas.length >= GAS_STIPEND_MAX_ATTEMPTS) return { ok: false, reason: "GAS_ATTEMPTS" };
  const fundedSum = funded.reduce((sum, row) => sum + row.amount, 0n);
  if (
    funded.length >= GAS_STIPEND_MAX_FUNDED ||
    fundedSum + input.nextAmount > GAS_STIPEND_LIFETIME_CAP_WEI
  ) {
    return { ok: false, reason: "GAS_LIFETIME" };
  }
  return { ok: true };
}

export function selectSweepTargets(input: {
  book: SweepTarget[];
  inflight: { depositAddress: string; derivationIndex: number }[];
  cursor: number;
  limit: number;
}): { targets: SweepTarget[]; nextCursor: number } {
  const book = [...input.book]
    .map((row) => ({
      derivationIndex: row.derivationIndex,
      derivationVersion: row.derivationVersion,
      address: row.address.toLowerCase(),
    }))
    .sort(
      (a, b) => a.derivationIndex - b.derivationIndex || a.derivationVersion - b.derivationVersion,
    );
  const sweepable = book.filter((row) => row.derivationVersion === 2);
  const seen = new Set<string>();
  const targets: SweepTarget[] = [];
  for (const row of input.inflight) {
    const address = row.depositAddress.toLowerCase();
    if (seen.has(address)) continue;
    seen.add(address);
    const known = book.find((item) => item.address === address);
    targets.push({
      address,
      derivationIndex: known ? known.derivationIndex : row.derivationIndex,
      derivationVersion: known?.derivationVersion === 2 ? 2 : 1,
    });
  }
  if (input.limit <= 0 || sweepable.length === 0) {
    return { targets, nextCursor: input.cursor };
  }
  let start = sweepable.findIndex((row) => row.derivationIndex >= input.cursor);
  if (start < 0) start = 0;
  const fresh: SweepTarget[] = [];
  let scanned = 0;
  let last = sweepable[start]?.derivationIndex ?? 0;
  while (scanned < input.limit && scanned < sweepable.length) {
    const row = sweepable[(start + scanned) % sweepable.length];
    if (!row) break;
    if (!seen.has(row.address)) fresh.push(row);
    last = row.derivationIndex;
    scanned += 1;
  }
  const wrappedPastEnd = start + scanned >= sweepable.length;
  return {
    targets: [...targets, ...fresh],
    nextCursor: wrappedPastEnd ? 0 : last + 1,
  };
}

export function reconcileAddress(input: {
  ethWei: bigint;
  usdcUnits: bigint;
  gasPriceWei: bigint;
  records: SweepRecord[];
}): {
  inflight: number;
  confirmedEth: bigint;
  confirmedUsdc: bigint;
  confirmedGas: bigint;
  failed: number;
  ethSweepable: bigint;
  usdcSweepable: bigint;
  needsRetry: boolean;
  settled: boolean;
} {
  const inflight = input.records.filter((row) => INFLIGHT.has(row.status)).length;
  let confirmedEth = 0n;
  let confirmedUsdc = 0n;
  let confirmedGas = 0n;
  let failed = 0;
  for (const row of input.records) {
    if (row.status === "FAILED") failed += 1;
    if (row.status !== "CONFIRMED") continue;
    if (row.asset === "ETH") confirmedEth += row.amount;
    if (row.asset === "USDC") confirmedUsdc += row.amount;
    if (row.asset === "GAS") confirmedGas += row.amount;
  }
  const plan = planSweep({
    inflight: false,
    ethWei: input.ethWei,
    usdcUnits: input.usdcUnits,
    gasPriceWei: input.gasPriceWei,
  });
  const ethSweepable = plan.action === "sweep_eth" ? plan.amount : 0n;
  const usdcSweepable =
    plan.action === "sweep_usdc" || plan.action === "fund_gas" || plan.action === "alert"
      ? input.usdcUnits
      : 0n;
  const needsRetry = failed > 0 && (ethSweepable > 0n || usdcSweepable > 0n);
  const settled = inflight === 0 && !needsRetry && ethSweepable === 0n && usdcSweepable === 0n;
  return {
    inflight,
    confirmedEth,
    confirmedUsdc,
    confirmedGas,
    failed,
    ethSweepable,
    usdcSweepable,
    needsRetry,
    settled,
  };
}

export interface SweepAuthInput {
  enabledFlag: string | undefined;
  xprv: string | undefined;
  xpub: string | null;
  treasury: string;
  book: { index: number; address: string; version: 1 | 2 }[];
  requireKnownAnchors: boolean;
}

export type SweepAuth =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "DISABLED"
        | "KEY_MISSING"
        | "XPUB_MISSING"
        | "KEY_MISMATCH"
        | "DERIVATION_MISMATCH"
        | "TREASURY_MISMATCH"
        | "BOOK_EMPTY";
      index?: number;
    };

/**
 * Fail closed before any signature. Reasons are codes. The xprv and xpub
 * values are not copied into the result.
 */
export function prepareSweepAuth(input: SweepAuthInput): SweepAuth {
  if (!sweepFlagEnabled(input.enabledFlag)) return { ok: false, reason: "DISABLED" };
  if (input.treasury.toLowerCase() !== SWEEP_TREASURY.toLowerCase()) {
    return { ok: false, reason: "TREASURY_MISMATCH" };
  }
  if (!input.xprv) return { ok: false, reason: "KEY_MISSING" };
  if (!input.xpub) return { ok: false, reason: "XPUB_MISSING" };
  if (!xprvMatchesXpub(input.xprv, input.xpub)) return { ok: false, reason: "KEY_MISMATCH" };
  if (input.book.length === 0) return { ok: false, reason: "BOOK_EMPTY" };
  for (const row of input.book) {
    const matches =
      row.version === 1
        ? version1RecordMatches(input.xpub, input.xprv, row.index, row.address)
        : row.version === 2
          ? version2RecordMatches(input.xpub, input.xprv, row.index, row.address)
          : false;
    if (!matches) return { ok: false, reason: "DERIVATION_MISMATCH", index: row.index };
  }
  if (input.requireKnownAnchors) {
    for (const anchor of KNOWN_DEPOSIT_ANCHORS) {
      if (!version1RecordMatches(input.xpub, input.xprv, anchor.index, anchor.address)) {
        return { ok: false, reason: "DERIVATION_MISMATCH", index: anchor.index };
      }
    }
  }
  return { ok: true };
}

export function xprvMatchesXpub(xprv: string, xpub: string): boolean {
  const priv = nodeMaterial(xprv);
  const pub = nodeMaterial(xpub);
  if (!priv || !pub) return false;
  return priv.publicKey === pub.publicKey && priv.chainCode === pub.chainCode;
}

export function deriveDepositAddressFromXprv(
  xprv: string,
  chainId: number,
  index: number,
): `0x${string}` {
  try {
    const key = derivedNode(xprv, chainId, index);
    if (!key.publicKey) throw new Error("XPRV_INVALID");
    const hex = `0x${Buffer.from(key.publicKey).toString("hex")}` as const;
    return publicKeyToAddress(hex);
  } catch (error) {
    if (error instanceof Error && error.message === "DERIVATION_PARAMS_INVALID") throw error;
    throw new Error("XPRV_INVALID");
  }
}

/** Version 2 address from the xprv, using the same X || Y hash as the xpub path. */
export function deriveDepositAddressV2FromXprv(
  xprv: string,
  chainId: number,
  index: number,
): `0x${string}` {
  try {
    const key = derivedNode(xprv, chainId, index);
    if (!key.publicKey) throw new Error("XPRV_INVALID");
    return ethereumAddressFromCompressedPublicKey(key.publicKey);
  } catch (error) {
    if (error instanceof Error && error.message === "DERIVATION_PARAMS_INVALID") throw error;
    throw new Error("XPRV_INVALID");
  }
}

/** Address a standard Base transaction from this child key can spend. */
export function spendableAddressFromXprv(
  xprv: string,
  chainId: number,
  index: number,
): `0x${string}` {
  try {
    const key = derivedNode(xprv, chainId, index);
    if (!key.privateKey) throw new Error("XPRV_INVALID");
    const pk = `0x${Buffer.from(key.privateKey).toString("hex")}` as Hex;
    return privateKeyToAccount(pk).address;
  } catch (error) {
    if (error instanceof Error && error.message === "DERIVATION_PARAMS_INVALID") throw error;
    throw new Error("XPRV_INVALID");
  }
}

export function redactSweepLog(message: string, secrets: readonly string[]): string {
  let out = message.replace(/https?:\/\/\S+/g, "[rpc]");
  out = out.replace(
    /\b(?:xprv|xpub|yprv|ypub|zprv|zpub|tprv|tpub)[1-9A-HJ-NP-Za-km-z]{20,}\b/g,
    "[redacted]",
  );
  out = out.replace(/0x[0-9a-fA-F]{64}/g, "[redacted]");
  for (const secret of secrets) {
    if (secret.length < 12) continue;
    out = out.split(secret).join("[redacted]");
  }
  return out.slice(0, 240);
}

export interface BuiltSweepTx {
  chainId: 8453;
  nonce: number;
  gas: bigint;
  maxFeePerGas: bigint;
  to: `0x${string}`;
  value: bigint;
  data: Hex;
}

/** Last check before a signature. A bad destination throws and nothing is signed. */
export function buildSweepTransaction(req: SignRequest): BuiltSweepTx {
  if (req.maxFeePerGas <= 0n) throw new Error("SWEEP_FEE");
  if (!Number.isInteger(req.nonce) || req.nonce < 0) throw new Error("SWEEP_NONCE");
  if (req.amount <= 0n) throw new Error("SWEEP_AMOUNT");
  const to = req.to.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(to) || to === "0x0000000000000000000000000000000000000000") {
    throw new Error("SWEEP_ADDRESS");
  }
  const fee = req.maxFeePerGas;
  if (req.kind === "eth") {
    if (to !== SWEEP_TREASURY.toLowerCase()) throw new Error("SWEEP_DESTINATION_FORBIDDEN");
    if (req.gasLimit !== ETH_TRANSFER_GAS) throw new Error("SWEEP_GAS");
    return {
      chainId: SWEEP_CHAIN_ID,
      nonce: req.nonce,
      gas: ETH_TRANSFER_GAS,
      maxFeePerGas: fee,
      to: SWEEP_TREASURY,
      value: req.amount,
      data: "0x",
    };
  }
  if (req.kind === "usdc") {
    if (to !== SWEEP_TREASURY.toLowerCase()) throw new Error("SWEEP_DESTINATION_FORBIDDEN");
    if (req.gasLimit !== USDC_TRANSFER_GAS) throw new Error("SWEEP_GAS");
    return {
      chainId: SWEEP_CHAIN_ID,
      nonce: req.nonce,
      gas: USDC_TRANSFER_GAS,
      maxFeePerGas: fee,
      to: SWEEP_USDC,
      value: 0n,
      data: encodeFunctionData({
        abi: ERC20_TRANSFER,
        functionName: "transfer",
        args: [SWEEP_TREASURY, req.amount],
      }),
    };
  }
  if (to === SWEEP_TREASURY.toLowerCase()) throw new Error("GAS_DESTINATION_FORBIDDEN");
  if (req.amount > GAS_STIPEND_CAP_WEI) throw new Error("GAS_CAP");
  if (req.gasLimit !== ETH_TRANSFER_GAS) throw new Error("SWEEP_GAS");
  return {
    chainId: SWEEP_CHAIN_ID,
    nonce: req.nonce,
    gas: ETH_TRANSFER_GAS,
    maxFeePerGas: fee,
    to: getAddress(to),
    value: req.amount,
    data: "0x",
  };
}

export async function signSweepTransaction(
  account: {
    address: string;
    signTransaction: (transaction: TransactionSerializableEIP1559) => Promise<Hex>;
  },
  req: SignRequest,
): Promise<{ raw: Hex; hash: Hex }> {
  if (account.address.toLowerCase() !== req.from.toLowerCase()) throw new Error("SIGNER_MISMATCH");
  const tx = buildSweepTransaction(req);
  const raw = await account.signTransaction({
    type: "eip1559",
    chainId: tx.chainId,
    nonce: tx.nonce,
    gas: tx.gas,
    maxFeePerGas: tx.maxFeePerGas,
    maxPriorityFeePerGas: tx.maxFeePerGas,
    to: tx.to,
    value: tx.value,
    data: tx.data,
  });
  return { raw, hash: keccak256(raw) };
}

export async function applySweepTick(ctx: SweepContext, io: SweepIo): Promise<SweepTickResult> {
  const incidents: SweepIncident[] = [];
  const actions: { address: string; action: string }[] = [];
  const raise = (incident: SweepIncident) => {
    incidents.push(incident);
    io.raise(incident);
  };
  if (ctx.chainId !== SWEEP_CHAIN_ID) return { actions, incidents, aborted: "CHAIN" };
  if (ctx.treasury.toLowerCase() !== SWEEP_TREASURY.toLowerCase()) {
    raise({
      check: "crypto_sweep_treasury",
      fp: `crypto_sweep_treasury:${ctx.chainId}`,
      details: { reason: "TREASURY_MISMATCH" },
    });
    return { actions, incidents, aborted: "TREASURY_MISMATCH" };
  }

  const book = new Map(ctx.book.map((row) => [row.address.toLowerCase(), row]));
  const inflight = await io.store.listInflight(ctx.chainId);
  const byAddress = new Map(inflight.map((row) => [row.depositAddress.toLowerCase(), row]));
  const nonceCursor = new Map<string, number>();
  const reservedNonce = new Map<string, number>();
  for (const row of inflight) {
    if (row.nonce == null) continue;
    const payer = row.payer.toLowerCase();
    reservedNonce.set(payer, Math.max(reservedNonce.get(payer) ?? 0, row.nonce + 1));
  }
  const blockedPayers = new Set<string>();
  const hour = ctx.nowIso.slice(0, 13);

  const takeNonce = (address: string): number | null => {
    const key = address.toLowerCase();
    const cached = nonceCursor.get(key);
    if (cached != null) return cached;
    const view = io.account(key);
    if ("error" in view) return null;
    const next = Math.max(view.nonce, reservedNonce.get(key) ?? 0);
    nonceCursor.set(key, next);
    return next;
  };
  const consumeNonce = (address: string, used: number) => {
    nonceCursor.set(address.toLowerCase(), used + 1);
  };

  for (const target of ctx.targets) {
    const address = target.address.toLowerCase();
    const known = book.get(address);
    if (
      !known ||
      known.derivationIndex !== target.derivationIndex ||
      known.derivationVersion !== target.derivationVersion
    ) {
      raise({
        check: "crypto_sweep_derivation",
        fp: `crypto_sweep_derivation:${ctx.chainId}:${address}`,
        details: { reason: "DERIVATION_MISMATCH", address },
      });
      actions.push({ address, action: "derivation_mismatch" });
      continue;
    }
    const index = known.derivationIndex;
    const existing = byAddress.get(address);
    if (existing) {
      if ((ctx.mode ?? "live") === "dry_run") {
        actions.push({ address, action: "dry_run_inflight" });
        continue;
      }
      const outcome = await reconcileRow(
        existing,
        ctx,
        io,
        raise,
        hour,
        consumeNonce,
        blockedPayers,
      );
      actions.push({ address, action: outcome });
      continue;
    }
    if (target.derivationVersion !== 2) {
      actions.push({ address, action: "version_skipped" });
      continue;
    }
    if (ctx.deadlineAtMs != null && Date.now() >= ctx.deadlineAtMs) {
      actions.push({ address, action: "deadline" });
      break;
    }
    if (ctx.gasPriceWei == null || ctx.gasPriceWei <= 0n) {
      actions.push({ address, action: "gas_price_unavailable" });
      continue;
    }
    const view = io.account(address);
    if ("error" in view) {
      raise({
        check: "crypto_sweep_rpc",
        fp: `crypto_sweep_rpc:${ctx.chainId}:${address}:${hour}`,
        details: { reason: "BALANCE_RPC", address },
      });
      actions.push({ address, action: "rpc_skip" });
      continue;
    }
    const plan = planSweep({
      inflight: false,
      ethWei: view.ethWei,
      usdcUnits: view.usdcUnits,
      gasPriceWei: ctx.gasPriceWei,
    });
    if (plan.action === "idle" || plan.action === "retry") {
      actions.push({
        address,
        action: plan.action === "idle" ? plan.reason.toLowerCase() : "retry",
      });
      continue;
    }
    if (plan.action === "alert") {
      raise({
        check: "crypto_sweep_gas_refused",
        fp: `crypto_sweep_gas_refused:${ctx.chainId}:${address}:${hour}`,
        details: {
          reason: "GAS_CAP",
          address,
          deficit: plan.deficit.toString(),
          cap: GAS_STIPEND_CAP_WEI.toString(),
        },
      });
      actions.push({ address, action: "gas_cap" });
      continue;
    }
    if ((ctx.mode ?? "live") === "dry_run") {
      actions.push({ address, action: await describeDryRun(plan, address, ctx, io) });
      continue;
    }

    const fee = ctx.gasPriceWei;
    let req: SignRequest;
    let releaseReserved = false;
    let gasChainNonce = 0;
    if (plan.action === "fund_gas") {
      if (!ctx.gasFundingAvailable) {
        raise({
          check: "crypto_sweep_gas_refused",
          fp: `crypto_sweep_gas_payer:${ctx.chainId}:${hour}`,
          details: { reason: "GAS_PAYER_UNAVAILABLE", address },
        });
        actions.push({ address, action: "gas_payer_unavailable" });
        continue;
      }
      const payer = io.account(ctx.payout.toLowerCase());
      if ("error" in payer) {
        raise({
          check: "crypto_sweep_rpc",
          fp: `crypto_sweep_rpc:${ctx.chainId}:payout:${hour}`,
          details: { reason: "PAYER_RPC", address },
        });
        actions.push({ address, action: "rpc_skip" });
        continue;
      }
      if (payer.ethWei < plan.amount + ethGasWei(fee)) {
        raise({
          check: "crypto_sweep_gas_refused",
          fp: `crypto_sweep_gas_short:${ctx.chainId}:${hour}`,
          details: { reason: "GAS_PAYER_SHORT", address, amount: plan.amount.toString() },
        });
        actions.push({ address, action: "gas_payer_short" });
        continue;
      }
      if (blockedPayers.has(ctx.payout.toLowerCase())) {
        actions.push({ address, action: "payer_nonce_blocked" });
        continue;
      }
      const history = await io.store.listForDeposit(ctx.chainId, address);
      const stipend = assessGasStipend({ records: history, nextAmount: plan.amount });
      if (!stipend.ok) {
        raise({
          check: "crypto_sweep_gas_refused",
          fp: `crypto_sweep_gas_refused:${ctx.chainId}:${address}:${stipend.reason}`,
          details: {
            reason: stipend.reason,
            address,
            cap: GAS_STIPEND_LIFETIME_CAP_WEI.toString(),
          },
        });
        actions.push({ address, action: "gas_lifetime" });
        continue;
      }
      const leased = await io.reserveNonce({
        payer: ctx.payout.toLowerCase(),
        purpose: "gas_stipend",
        ownerId: `gas:${address}`,
        chainNonce: payer.nonce,
      });
      if (!leased) {
        actions.push({ address, action: "nonce_lease_failed" });
        continue;
      }
      releaseReserved = !leased.reused;
      gasChainNonce = payer.nonce;
      req = {
        kind: "gas",
        from: ctx.payout.toLowerCase(),
        to: address,
        amount: plan.amount,
        nonce: leased.nonce,
        gasLimit: plan.gasLimit,
        maxFeePerGas: fee,
        derivationIndex: null,
      };
    } else {
      const nonce = takeNonce(address);
      if (nonce == null) {
        actions.push({ address, action: "rpc_skip" });
        continue;
      }
      req = {
        kind: plan.action === "sweep_eth" ? "eth" : "usdc",
        from: address,
        to: SWEEP_TREASURY,
        amount: plan.amount,
        nonce,
        gasLimit: plan.gasLimit,
        maxFeePerGas: fee,
        derivationIndex: index,
      };
    }

    try {
      buildSweepTransaction(req);
    } catch (error) {
      if (releaseReserved) {
        await io.releaseNonce({
          payer: req.from,
          nonce: req.nonce,
          ownerId: `gas:${address}`,
          chainNonce: gasChainNonce,
        });
      }
      raise({
        check: "crypto_sweep_destination",
        fp: `crypto_sweep_destination:${ctx.chainId}:${address}`,
        details: { reason: error instanceof Error ? error.message : "SWEEP_DESTINATION_FORBIDDEN" },
      });
      actions.push({ address, action: "destination_rejected" });
      continue;
    }

    const begun = await io.store.begin({
      chainId: ctx.chainId,
      depositAddress: address,
      derivationIndex: index,
      derivationVersion: 2,
      asset: req.kind === "eth" ? "ETH" : req.kind === "usdc" ? "USDC" : "GAS",
      amount: req.amount,
      nonce: req.nonce,
      payer: req.from,
      toAddress: req.to,
      maxFeePerGas: req.maxFeePerGas,
      gasLimit: req.gasLimit,
    });
    if (!begun.created) {
      if (releaseReserved) {
        await io.releaseNonce({
          payer: req.from,
          nonce: req.nonce,
          ownerId: `gas:${address}`,
          chainNonce: gasChainNonce,
        });
      }
      actions.push({ address, action: "duplicate" });
      continue;
    }
    const sent = await signAndBroadcast(
      begun.id,
      req,
      ctx,
      io,
      raise,
      hour,
      blockedPayers,
      consumeNonce,
    );
    actions.push({ address, action: sent });
  }

  return { actions, incidents };
}

async function reconcileRow(
  row: SweepRecord,
  ctx: SweepContext,
  io: SweepIo,
  raise: (incident: SweepIncident) => void,
  hour: string,
  consumeNonce: (address: string, used: number) => void,
  blockedPayers: Set<string>,
): Promise<string> {
  if (!row.signedRawTx || !row.txHash) {
    if (row.status === "PENDING" && row.nonce != null && row.maxFeePerGas > 0n) {
      const req: SignRequest = {
        kind: row.asset === "ETH" ? "eth" : row.asset === "USDC" ? "usdc" : "gas",
        from: row.payer.toLowerCase(),
        to: row.toAddress.toLowerCase(),
        amount: row.amount,
        nonce: row.nonce,
        gasLimit: row.gasLimit,
        maxFeePerGas: row.maxFeePerGas,
        derivationIndex: row.asset === "GAS" ? null : row.derivationIndex,
      };
      return signAndBroadcast(row.id, req, ctx, io, raise, hour, blockedPayers, consumeNonce);
    }
    raise({
      check: "crypto_sweep_nonce",
      fp: `crypto_sweep_nonce:${row.id}`,
      details: { reason: "UNSIGNED_PENDING", address: row.depositAddress },
    });
    return "unsigned_pending";
  }
  const receipt = await io.receipt(row.txHash);
  if (receipt.state === "rpc_error") {
    raise({
      check: "crypto_sweep_rpc",
      fp: `crypto_sweep_rpc:${ctx.chainId}:${row.depositAddress}:${hour}`,
      details: { reason: "RECEIPT_RPC", address: row.depositAddress },
    });
    await io.store.note(row.id, "receipt rpc");
    return "rpc_hold";
  }
  if (receipt.state === "pending_finality") return "await_finality";
  if (receipt.state === "success" || receipt.state === "reverted") {
    const proof = await verifiedSweepProof(row, io);
    if (!proof) {
      raise({
        check: "crypto_sweep_receipt",
        fp: `crypto_sweep_receipt:${row.id}`,
        details: { reason: "RECEIPT_MISMATCH", address: row.depositAddress, tx: row.txHash },
      });
      await io.store.note(row.id, "receipt mismatch");
      return "receipt_mismatch";
    }
    if (receipt.state === "success") {
      await io.store.confirm(row.id, proof);
      return "confirmed";
    }
    await io.store.fail(row.id, "reverted");
    return "failed";
  }
  return rebroadcast(row, io, raise);
}

async function describeDryRun(
  plan: Extract<SweepPlan, { action: "sweep_eth" | "sweep_usdc" | "fund_gas" }>,
  address: string,
  ctx: SweepContext,
  io: SweepIo,
): Promise<string> {
  if (plan.action === "sweep_eth") return "dry_run_sweep_eth";
  if (plan.action === "sweep_usdc") return "dry_run_sweep_usdc";
  if (!ctx.gasFundingAvailable) return "dry_run_gas_payer_unavailable";
  const payer = io.account(ctx.payout.toLowerCase());
  if ("error" in payer) return "dry_run_rpc_skip";
  if (ctx.gasPriceWei == null || payer.ethWei < plan.amount + ethGasWei(ctx.gasPriceWei)) {
    return "dry_run_gas_payer_short";
  }
  const history = await io.store.listForDeposit(ctx.chainId, address);
  const stipend = assessGasStipend({ records: history, nextAmount: plan.amount });
  if (!stipend.ok) return `dry_run_${stipend.reason.toLowerCase()}`;
  return "dry_run_fund_gas";
}

async function signAndBroadcast(
  id: string,
  req: SignRequest,
  ctx: SweepContext,
  io: SweepIo,
  raise: (incident: SweepIncident) => void,
  hour: string,
  blockedPayers: Set<string>,
  consumeNonce: (address: string, used: number) => void,
): Promise<string> {
  if (ctx.mode === "dry_run") return "dry_run_blocked";
  let signed: { raw: string; hash: string };
  try {
    buildSweepTransaction(req);
    signed = await io.sign(req);
  } catch (error) {
    const reason = redactSweepLog(error instanceof Error ? error.message : "sign failed", []);
    if (reason === "SIGNER_MISMATCH") {
      await io.store.fail(id, "SIGNER_MISMATCH");
      raise({
        check: "crypto_sweep_derivation",
        fp: `crypto_sweep_signer:${ctx.chainId}:${req.from}:${hour}`,
        details: { reason: "SIGNER_MISMATCH", address: req.kind === "gas" ? req.to : req.from },
      });
      return "signer_mismatch";
    }
    await io.store.note(id, reason);
    raise({
      check: "crypto_sweep_rpc",
      fp: `crypto_sweep_sign:${ctx.chainId}:${req.from}:${hour}`,
      details: { reason, address: req.kind === "gas" ? req.to : req.from },
    });
    return "sign_retry";
  }
  await io.store.storeSigned(id, signed.hash, signed.raw);
  if (req.kind === "gas") {
    try {
      await io.markNonceSigned({
        payer: req.from,
        nonce: req.nonce,
        ownerId: `gas:${req.to.toLowerCase()}`,
      });
    } catch {
      raise({
        check: "crypto_sweep_nonce",
        fp: `crypto_sweep_nonce:${id}`,
        details: { reason: "NONCE_MARK_FAILED", address: req.to },
      });
    }
  }
  const outcome = await rebroadcast(
    {
      id,
      signedRawTx: signed.raw,
      txHash: signed.hash,
      depositAddress: req.kind === "gas" ? req.to : req.from,
    },
    io,
    raise,
  );
  if (outcome === "nonce_hold") blockedPayers.add(req.from.toLowerCase());
  else consumeNonce(req.from, req.nonce);
  if (req.kind === "gas" && outcome !== "sign_retry") {
    raise({
      check: "crypto_sweep_gas",
      fp: `crypto_sweep_gas:${ctx.chainId}:${req.to}:${req.nonce}`,
      details: {
        address: req.to,
        amount: req.amount.toString(),
        cap: GAS_STIPEND_CAP_WEI.toString(),
        nonce: String(req.nonce),
      },
    });
  }
  return outcome === "rebroadcast" ? "signed" : outcome;
}

async function rebroadcast(
  row: { id: string; signedRawTx: string | null; txHash: string | null; depositAddress: string },
  io: SweepIo,
  raise: (incident: SweepIncident) => void,
): Promise<string> {
  if (!row.signedRawTx) return "unsigned_pending";
  let outcome: BroadcastOutcome;
  try {
    outcome = await io.broadcast(row.signedRawTx);
  } catch {
    outcome = "rpc_error";
  }
  if (outcome === "ok" || outcome === "already_known") {
    await io.store.markBroadcast(row.id);
    return "rebroadcast";
  }
  if (outcome === "nonce_too_low") {
    raise({
      check: "crypto_sweep_nonce",
      fp: `crypto_sweep_nonce:${row.id}`,
      details: { reason: "NONCE_TOO_LOW", address: row.depositAddress, tx: row.txHash ?? "" },
    });
    await io.store.note(row.id, "nonce too low");
    return "nonce_hold";
  }
  await io.store.note(row.id, "broadcast rpc");
  return "broadcast_retry";
}

function version1MatchesXpub(xpub: string, index: number, address: string): boolean {
  try {
    const expected = address.toLowerCase();
    const fromPub = deriveDepositAddress(xpub, SWEEP_CHAIN_ID, index).toLowerCase();
    const version2 = deriveDepositAddressV2(xpub, SWEEP_CHAIN_ID, index).toLowerCase();
    return fromPub === expected && version2 !== expected;
  } catch {
    return false;
  }
}

function version2MatchesXpub(xpub: string, index: number, address: string): boolean {
  try {
    const expected = address.toLowerCase();
    const fromPub = deriveDepositAddressV2(xpub, SWEEP_CHAIN_ID, index).toLowerCase();
    const version1 = deriveDepositAddress(xpub, SWEEP_CHAIN_ID, index).toLowerCase();
    return fromPub === expected && version1 !== expected;
  } catch {
    return false;
  }
}

function version1RecordMatches(
  xpub: string,
  xprv: string,
  index: number,
  address: string,
): boolean {
  try {
    const expected = address.toLowerCase();
    const fromPub = deriveDepositAddress(xpub, SWEEP_CHAIN_ID, index).toLowerCase();
    const fromPriv = deriveDepositAddressFromXprv(xprv, SWEEP_CHAIN_ID, index).toLowerCase();
    const version2 = deriveDepositAddressV2(xpub, SWEEP_CHAIN_ID, index).toLowerCase();
    return fromPub === expected && fromPriv === expected && version2 !== expected;
  } catch {
    return false;
  }
}

function version2RecordMatches(
  xpub: string,
  xprv: string,
  index: number,
  address: string,
): boolean {
  try {
    const expected = address.toLowerCase();
    const fromPub = deriveDepositAddressV2(xpub, SWEEP_CHAIN_ID, index).toLowerCase();
    const fromPriv = deriveDepositAddressV2FromXprv(xprv, SWEEP_CHAIN_ID, index).toLowerCase();
    const spendable = spendableAddressFromXprv(xprv, SWEEP_CHAIN_ID, index).toLowerCase();
    const version1 = deriveDepositAddress(xpub, SWEEP_CHAIN_ID, index).toLowerCase();
    return (
      fromPub === expected &&
      fromPriv === expected &&
      spendable === expected &&
      version1 !== expected
    );
  } catch {
    return false;
  }
}

export type SweepPreflightReason =
  | "KEY_MISSING"
  | "XPUB_MISSING"
  | "KEY_MISMATCH"
  | "DERIVATION_MISMATCH"
  | "TREASURY_MISMATCH"
  | "TREASURY_COUNT"
  | "PAYOUT_MISMATCH"
  | "PAYOUT_COUNT"
  | "USDC_MISMATCH"
  | "CHAIN"
  | "SCHEMA_NOT_READY"
  | "BOOK_EMPTY";

export interface SweepPreflightInput {
  mode: "dry_run" | "live";
  xprv?: string | undefined;
  xpub: string | null;
  treasury: string;
  payout: string;
  payoutKeyAddress: string | null;
  usdc: string;
  chainId: number;
  activeDepositCount: number;
  activePayoutCount: number;
  schemaReady: boolean;
  book: { index: number; address: string; version: 1 | 2 }[];
  requireKnownAnchors: boolean;
}

/**
 * Checks that must pass before a live signature or a dry-run plan.
 * Dry-run does not read the xprv. Live mode also requires the xprv to match
 * the xpub and the child private key, and the gas-stipend key to match the
 * active payout address.
 */
export function prepareSweepPreflight(
  input: SweepPreflightInput,
): { ok: true } | { ok: false; reason: SweepPreflightReason; index?: number } {
  if (input.chainId !== SWEEP_CHAIN_ID) return { ok: false, reason: "CHAIN" };
  if (!input.schemaReady) return { ok: false, reason: "SCHEMA_NOT_READY" };
  if (input.activeDepositCount !== 1) return { ok: false, reason: "TREASURY_COUNT" };
  if (input.treasury.toLowerCase() !== SWEEP_TREASURY.toLowerCase()) {
    return { ok: false, reason: "TREASURY_MISMATCH" };
  }
  if (input.activePayoutCount !== 1) return { ok: false, reason: "PAYOUT_COUNT" };
  if (!/^0x[0-9a-f]{40}$/.test(input.payout.toLowerCase())) {
    return { ok: false, reason: "PAYOUT_MISMATCH" };
  }
  if (input.usdc.toLowerCase() !== SWEEP_USDC.toLowerCase()) {
    return { ok: false, reason: "USDC_MISMATCH" };
  }
  if (!input.xpub) return { ok: false, reason: "XPUB_MISSING" };
  if (input.book.length === 0) return { ok: false, reason: "BOOK_EMPTY" };
  if (input.mode === "live") {
    if (!input.xprv) return { ok: false, reason: "KEY_MISSING" };
    if (!xprvMatchesXpub(input.xprv, input.xpub)) return { ok: false, reason: "KEY_MISMATCH" };
    if (
      !input.payoutKeyAddress ||
      input.payoutKeyAddress.toLowerCase() !== input.payout.toLowerCase()
    ) {
      return { ok: false, reason: "PAYOUT_MISMATCH" };
    }
  }
  for (const row of input.book) {
    const matches =
      input.mode === "live" && input.xprv
        ? row.version === 1
          ? version1RecordMatches(input.xpub, input.xprv, row.index, row.address)
          : row.version === 2
            ? version2RecordMatches(input.xpub, input.xprv, row.index, row.address)
            : false
        : row.version === 1
          ? version1MatchesXpub(input.xpub, row.index, row.address)
          : row.version === 2
            ? version2MatchesXpub(input.xpub, row.index, row.address)
            : false;
    if (!matches) return { ok: false, reason: "DERIVATION_MISMATCH", index: row.index };
  }
  if (input.requireKnownAnchors) {
    for (const anchor of KNOWN_DEPOSIT_ANCHORS) {
      const matches =
        input.mode === "live" && input.xprv
          ? version1RecordMatches(input.xpub, input.xprv, anchor.index, anchor.address)
          : version1MatchesXpub(input.xpub, anchor.index, anchor.address);
      if (!matches) return { ok: false, reason: "DERIVATION_MISMATCH", index: anchor.index };
    }
  }
  return { ok: true };
}

/** Dry-run IO cannot sign, broadcast, lease a nonce, or change a sweep row. */
export function guardSweepIo(mode: "live" | "dry_run", io: SweepIo): SweepIo {
  if (mode === "live") return io;
  const forbid = (code: string) => async (): Promise<never> => {
    throw new Error(code);
  };
  return {
    ...io,
    sign: forbid("DRY_RUN_SIGN"),
    broadcast: forbid("DRY_RUN_BROADCAST"),
    reserveNonce: forbid("DRY_RUN_NONCE"),
    markNonceSigned: forbid("DRY_RUN_NONCE"),
    releaseNonce: forbid("DRY_RUN_NONCE"),
    store: {
      listInflight: (chainId) => io.store.listInflight(chainId),
      listForDeposit: (chainId, address) => io.store.listForDeposit(chainId, address),
      begin: async () => {
        throw new Error("DRY_RUN_STATE");
      },
      storeSigned: async () => {
        throw new Error("DRY_RUN_STATE");
      },
      markBroadcast: async () => {
        throw new Error("DRY_RUN_STATE");
      },
      confirm: async () => {
        throw new Error("DRY_RUN_STATE");
      },
      fail: async () => {
        throw new Error("DRY_RUN_STATE");
      },
      note: async () => {
        throw new Error("DRY_RUN_STATE");
      },
    },
  };
}

export async function decodeSignedSweep(raw: string): Promise<DecodedSweep | null> {
  if (!/^0x02[0-9a-fA-F]+$/.test(raw)) return null;
  try {
    const serialized = raw as `0x02${string}`;
    const parsed = parseTransaction(serialized);
    const sender = await recoverTransactionAddress({ serializedTransaction: serialized });
    return {
      hash: keccak256(serialized),
      chainId: Number(parsed.chainId ?? 0),
      nonce: Number(parsed.nonce ?? -1),
      sender: sender.toLowerCase(),
      to: (parsed.to ?? "").toLowerCase(),
      value: parsed.value ?? 0n,
      data: parsed.data ?? "0x",
    };
  } catch {
    return null;
  }
}

export function signedSweepMatches(
  row: SweepRecord,
  decoded: DecodedSweep,
): { ok: true; proof: SweepConfirmProof } | { ok: false; reason: string } {
  if (!row.signedRawTx || !row.txHash || row.nonce == null)
    return { ok: false, reason: "UNSIGNED" };
  if (decoded.hash.toLowerCase() !== row.txHash.toLowerCase()) return { ok: false, reason: "HASH" };
  if (row.signedRawTx.startsWith("0x")) {
    const hashed = keccak256(row.signedRawTx as Hex).toLowerCase();
    if (hashed !== row.txHash.toLowerCase()) return { ok: false, reason: "HASH" };
  }
  if (decoded.chainId !== SWEEP_CHAIN_ID || decoded.chainId !== row.chainId) {
    return { ok: false, reason: "CHAIN" };
  }
  if (decoded.sender !== row.payer.toLowerCase()) return { ok: false, reason: "SENDER" };
  if (decoded.nonce !== row.nonce) return { ok: false, reason: "NONCE" };
  if (!payloadMatches(row, decoded)) return { ok: false, reason: "PAYLOAD" };
  return {
    ok: true,
    proof: {
      hash: row.txHash.toLowerCase(),
      sender: row.payer.toLowerCase(),
      to: row.toAddress.toLowerCase(),
      amount: row.amount,
      chainId: row.chainId,
    },
  };
}

export function chainTransactionMatches(
  decoded: DecodedSweep,
  chain: ChainTransactionView,
): boolean {
  if (chain.hash.toLowerCase() !== decoded.hash.toLowerCase()) return false;
  if (chain.from.toLowerCase() !== decoded.sender) return false;
  if ((chain.to ?? "").toLowerCase() !== decoded.to) return false;
  if (chain.value !== decoded.value) return false;
  if (normalizeCalldata(chain.input) !== normalizeCalldata(decoded.data)) return false;
  if (chain.nonce !== decoded.nonce) return false;
  if (chain.chainId != null && chain.chainId !== decoded.chainId) return false;
  return decoded.chainId === SWEEP_CHAIN_ID;
}

async function verifiedSweepProof(
  row: SweepRecord,
  io: SweepIo,
): Promise<SweepConfirmProof | null> {
  if (!row.signedRawTx || !row.txHash) return null;
  const decoded = await io.decodeSigned(row.signedRawTx);
  if (!decoded) return null;
  const matched = signedSweepMatches(row, decoded);
  if (!matched.ok) return null;
  const chainTx = await io.chainTransaction(row.txHash);
  if (!chainTx || !chainTransactionMatches(decoded, chainTx)) return null;
  return matched.proof;
}

function payloadMatches(row: SweepRecord, decoded: DecodedSweep): boolean {
  if (row.asset === "USDC") {
    if (decoded.to !== SWEEP_USDC.toLowerCase() || decoded.value !== 0n) return false;
    if (row.toAddress.toLowerCase() !== SWEEP_TREASURY.toLowerCase()) return false;
    try {
      const call = decodeFunctionData({ abi: ERC20_TRANSFER, data: decoded.data });
      if (call.functionName !== "transfer") return false;
      const to = String(call.args[0]).toLowerCase();
      const value = call.args[1];
      return to === SWEEP_TREASURY.toLowerCase() && value === row.amount;
    } catch {
      return false;
    }
  }
  if (normalizeCalldata(decoded.data) !== "0x") return false;
  if (decoded.value !== row.amount) return false;
  if (decoded.to !== row.toAddress.toLowerCase()) return false;
  if (row.asset === "ETH") return decoded.to === SWEEP_TREASURY.toLowerCase();
  return row.asset === "GAS" && decoded.to === row.depositAddress.toLowerCase();
}

function normalizeCalldata(data: string): string {
  const value = data.toLowerCase();
  return value === "0x" || value === "" ? "0x" : value;
}

function derivedNode(xprv: string, chainId: number, index: number) {
  if (!/^(xprv|yprv|zprv|tprv)/.test(xprv)) throw new Error("XPRV_INVALID");
  return HDKey.fromExtendedKey(xprv).derive(depositDerivationPath(chainId, index));
}

function nodeMaterial(extended: string): { publicKey: string; chainCode: string } | null {
  try {
    const key = HDKey.fromExtendedKey(extended);
    if (!key.publicKey || !key.chainCode) return null;
    return {
      publicKey: Buffer.from(key.publicKey).toString("hex"),
      chainCode: Buffer.from(key.chainCode).toString("hex"),
    };
  } catch {
    return null;
  }
}
