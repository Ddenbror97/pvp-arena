import { centsToWei } from "./allowlist";

/**
 * Chainlink Base ETH/USD (0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70).
 * Published heartbeat is 1200s; the feed also updates on a 0.15% deviation.
 * 120s covers L2 timestamp skew. A quiet market inside this window is healthy.
 * A round older than this is a missed heartbeat, not a quiet market — do not widen it.
 */
export const BASE_ETH_USD_HEARTBEAT_SECONDS = 1200;
export const BASE_ETH_USD_HEARTBEAT_GRACE_SECONDS = 120;
export const BASE_ETH_USD_MAX_ORACLE_AGE_SECONDS =
  BASE_ETH_USD_HEARTBEAT_SECONDS + BASE_ETH_USD_HEARTBEAT_GRACE_SECONDS;
export const BASE_ETH_USD_DECIMALS = 8;
export const BASE_ETH_USD_FUTURE_SKEW_SECONDS = 60;

/** Chainlink Base sequencer uptime feed. answer 0 = up, 1 = down. */
export const BASE_SEQUENCER_UPTIME_FEED = "0xbcf85224fc0756b9fa45aa7892530b47e10b6433";
/** Ignore prices for a few minutes after the sequencer recovers. */
export const SEQUENCER_GRACE_SECONDS = 300;

export interface ChainlinkRound {
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
}

export type OracleFailure =
  | "MALFORMED"
  | "DECIMALS"
  | "ZERO"
  | "NEGATIVE"
  | "INCOMPLETE"
  | "FUTURE"
  | "STALE"
  | "SEQUENCER_DOWN"
  | "SEQUENCER_GRACE";

export type OracleDecision =
  | { ok: true; priceMicro: bigint; roundId: bigint; updatedAt: bigint }
  | { ok: false; reason: OracleFailure };

function bigints(values: Array<bigint | null | undefined>): values is bigint[] {
  return values.every((v) => typeof v === "bigint");
}

/** Accept a Chainlink ETH/USD round only when the answer, decimals, and heartbeat all hold. */
export function assessEthUsdRound(
  round: ChainlinkRound | null,
  decimals: number | null,
  nowSeconds: number,
): OracleDecision {
  if (
    !round ||
    !bigints([round.roundId, round.answer, round.startedAt, round.updatedAt, round.answeredInRound])
  ) {
    return { ok: false, reason: "MALFORMED" };
  }
  if (decimals == null || !Number.isInteger(decimals)) return { ok: false, reason: "MALFORMED" };
  if (decimals !== BASE_ETH_USD_DECIMALS) return { ok: false, reason: "DECIMALS" };
  if (round.answer === 0n) return { ok: false, reason: "ZERO" };
  if (round.answer < 0n) return { ok: false, reason: "NEGATIVE" };
  if (round.updatedAt === 0n || round.startedAt === 0n || round.answeredInRound < round.roundId) {
    return { ok: false, reason: "INCOMPLETE" };
  }
  const updated = Number(round.updatedAt);
  if (!Number.isSafeInteger(updated) || !Number.isFinite(nowSeconds))
    return { ok: false, reason: "MALFORMED" };
  if (updated > nowSeconds + BASE_ETH_USD_FUTURE_SKEW_SECONDS)
    return { ok: false, reason: "FUTURE" };
  if (nowSeconds - updated > BASE_ETH_USD_MAX_ORACLE_AGE_SECONDS)
    return { ok: false, reason: "STALE" };
  const priceMicro = round.answer / 10n ** BigInt(BASE_ETH_USD_DECIMALS - 6);
  if (priceMicro <= 0n) return { ok: false, reason: "ZERO" };
  return { ok: true, priceMicro, roundId: round.roundId, updatedAt: round.updatedAt };
}

/** L2 prices are unusable while the sequencer is down or just came back. */
export function assessSequencer(
  answer: bigint | null,
  startedAt: bigint | null,
  nowSeconds: number,
): { ok: true } | { ok: false; reason: OracleFailure } {
  if (typeof answer !== "bigint" || typeof startedAt !== "bigint")
    return { ok: false, reason: "MALFORMED" };
  if (answer === 1n) return { ok: false, reason: "SEQUENCER_DOWN" };
  if (answer !== 0n) return { ok: false, reason: "MALFORMED" };
  if (startedAt === 0n) return { ok: true };
  const started = Number(startedAt);
  if (!Number.isSafeInteger(started) || !Number.isFinite(nowSeconds))
    return { ok: false, reason: "MALFORMED" };
  if (started > nowSeconds + BASE_ETH_USD_FUTURE_SKEW_SECONDS)
    return { ok: false, reason: "FUTURE" };
  if (nowSeconds - started < SEQUENCER_GRACE_SECONDS)
    return { ok: false, reason: "SEQUENCER_GRACE" };
  return { ok: true };
}

/** Presentation-only ETH for a USD-cent amount. Never a balance. */
export function formatEthEquivalent(cents: number, priceMicroUsd: number): string {
  if (!Number.isSafeInteger(cents) || cents <= 0) return "";
  if (!Number.isSafeInteger(priceMicroUsd) || priceMicroUsd <= 0) return "";
  const wei = centsToWei(BigInt(cents), BigInt(priceMicroUsd));
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
  return frac ? `${whole.toString()}.${frac}` : whole.toString();
}

/**
 * A display price is usable only when both clocks are fresh:
 * the server read it inside `serverMaxAgeSeconds`, and the Chainlink round is inside the heartbeat window.
 */
export function usableDisplayPrice(
  input: {
    priceMicroUsd: number;
    observedAtMs: number;
    oracleUpdatedAtMs: number;
    nowMs: number;
    serverMaxAgeSeconds: number;
  } | null,
): number | null {
  if (!input) return null;
  if (!Number.isSafeInteger(input.priceMicroUsd) || input.priceMicroUsd <= 0) return null;
  if (input.nowMs - input.observedAtMs > input.serverMaxAgeSeconds * 1000) return null;
  if (input.nowMs - input.oracleUpdatedAtMs > BASE_ETH_USD_MAX_ORACLE_AGE_SECONDS * 1000)
    return null;
  if (input.oracleUpdatedAtMs > input.nowMs + BASE_ETH_USD_FUTURE_SKEW_SECONDS * 1000) return null;
  return input.priceMicroUsd;
}
