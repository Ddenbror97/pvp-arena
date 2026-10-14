/**
 * Pot construction and settlement. Mirrors `_poker_settle_pots` in SQL.
 *
 * Policy (docs/POKER.md, "Platform fee"):
 * 1. The uncalled part of the largest contribution is returned before anything else.
 * 2. Pots are built by contribution level; a pot is contested by the players who
 *    did not fold and contributed at least that level. Adjacent pots with the
 *    same contenders are merged.
 * 3. Fee per pot = floor(pot * fee_bps / 10000), only when the flop was dealt.
 * 4. Each pot's remainder after its fee is split evenly between its best hands;
 *    leftover cents go one each to winners in seat order starting left of the button.
 */

export type PotPlayer = {
  seat: number;
  contributed: number;
  folded: boolean;
  /** Showdown score from `evaluate`; ignored for folded players or when one player remains. */
  score?: number | undefined;
};

export type SettledPot = {
  amount: number;
  fee: number;
  eligible: number[];
  winners: number[];
  shares: Record<number, number>;
};

export type Settlement = {
  refunds: Record<number, number>;
  pots: SettledPot[];
  payouts: Record<number, number>;
  feeTotal: number;
  /** Contributed amount per seat after the uncalled return. */
  wagered: Record<number, number>;
};

/** Seats in clockwise order beginning with the first seat after the button. */
export function seatOrderFrom(button: number, seats: readonly number[], maxSeats = 6): number[] {
  return [...seats].sort(
    (a, b) => ((a - button - 1 + maxSeats) % maxSeats) - ((b - button - 1 + maxSeats) % maxSeats),
  );
}

export function settlePots(
  players: readonly PotPlayer[],
  opts: { feeBps: number; flopDealt: boolean; button: number; maxSeats?: number },
): Settlement {
  const { feeBps, flopDealt, button } = opts;
  const maxSeats = opts.maxSeats ?? 6;
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000) throw new Error("INVALID_FEE");
  const c = new Map<number, number>();
  for (const p of players) {
    if (!Number.isInteger(p.contributed) || p.contributed < 0)
      throw new Error("INVALID_CONTRIBUTION");
    c.set(p.seat, p.contributed);
  }
  const refunds: Record<number, number> = {};
  const sorted = [...players].sort((a, b) => b.contributed - a.contributed);
  if (sorted.length >= 1) {
    const top = sorted[0]!;
    const second = sorted[1]?.contributed ?? 0;
    if (top.contributed > second) {
      refunds[top.seat] = top.contributed - second;
      c.set(top.seat, second);
    }
  }
  const live = players.filter((p) => !p.folded);
  if (live.length === 0) throw new Error("NO_LIVE_PLAYER");
  const levels = [...new Set([...c.values()].filter((v) => v > 0))].sort((a, b) => a - b);

  type Raw = { amount: number; eligible: number[] };
  const raw: Raw[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const v of c.values()) amount += Math.min(v, level) - Math.min(v, prev);
    const eligible = live
      .filter((p) => (c.get(p.seat) ?? 0) >= level)
      .map((p) => p.seat)
      .sort((a, b) => a - b);
    prev = level;
    if (amount === 0) continue;
    const last = raw[raw.length - 1];
    if (eligible.length === 0) {
      if (last) last.amount += amount;
      else raw.push({ amount, eligible: [] });
      continue;
    }
    if (last && (last.eligible.length === 0 || sameSet(last.eligible, eligible))) {
      last.amount += amount;
      if (last.eligible.length === 0) last.eligible = eligible;
      continue;
    }
    raw.push({ amount, eligible });
  }

  const order = seatOrderFrom(
    button,
    live.map((p) => p.seat),
    maxSeats,
  );
  const score = new Map(live.map((p) => [p.seat, p.score ?? 0]));
  const payouts: Record<number, number> = {};
  const pots: SettledPot[] = [];
  let feeTotal = 0;
  for (const pot of raw) {
    const fee = flopDealt ? Math.floor((pot.amount * feeBps) / 10000) : 0;
    const net = pot.amount - fee;
    let winners: number[];
    if (live.length === 1) winners = [live[0]!.seat];
    else {
      const best = Math.max(...pot.eligible.map((s) => score.get(s) ?? 0));
      winners = pot.eligible.filter((s) => (score.get(s) ?? 0) === best);
    }
    winners = order.filter((s) => winners.includes(s));
    const each = Math.floor(net / winners.length);
    let odd = net - each * winners.length;
    const shares: Record<number, number> = {};
    for (const w of winners) {
      shares[w] = each + (odd > 0 ? 1 : 0);
      if (odd > 0) odd--;
      payouts[w] = (payouts[w] ?? 0) + shares[w]!;
    }
    feeTotal += fee;
    pots.push({ amount: pot.amount, fee, eligible: pot.eligible, winners, shares });
  }
  for (const [seat, amt] of Object.entries(refunds)) {
    payouts[Number(seat)] = (payouts[Number(seat)] ?? 0) + amt;
  }
  const wagered: Record<number, number> = {};
  for (const [seat, v] of c) wagered[seat] = v;
  return { refunds, pots, payouts, feeTotal, wagered };
}

function sameSet(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
