import type { ReactNode } from "react";
import type { SlotGameView, SlotSpin, SlotBonusEvent } from "@/lib/slott/api";
import { formatUsd } from "@/lib/jackpot/math";
import { hasBomb } from "@/lib/slott/paytable";

export function LatestStatus({
  latest,
  landed,
  bonuses,
  game: g,
  turn,
  me,
  countdown,
}: {
  latest: SlotSpin | null;
  landed: boolean;
  bonuses: SlotBonusEvent[];
  game: SlotGameView;
  turn: "A" | "B" | null;
  me: "A" | "B" | null;
  countdown: ReactNode;
}) {
  const name = (seat: "A" | "B") =>
    (seat === "A" ? g.creator : g.opponent)?.username ?? (seat === "A" ? "Host" : "Challenger");
  if (g.status === "WAITING") return <span />;
  if (g.status === "COMPLETED")
    return (
      <span>
        {g.outcome === "DRAW"
          ? "It's a draw — both stakes refunded."
          : g.outcome === "BOMB"
            ? "Bomb — the house took both stakes."
            : `Match over · ${g.score_a} – ${g.score_b}`}
      </span>
    );
  if (!latest)
    return (
      <span>
        {turn
          ? `${turn === me ? "Your" : `${name(turn)}'s`} turn — spin 1 of ${g.base_spins / 2}.`
          : "Match starting…"}
      </span>
    );
  if (!landed)
    return <span className="text-primary-soft">{`${name(latest.seat)} is spinning…`}</span>;
  if (hasBomb(latest.grid))
    return <span>{`${name(latest.seat)} hit the bomb. Both stakes go to the house.`}</span>;
  const bonus = bonuses.find((b) => b.spin_no === latest.spin_no);
  const next = turn ? (
    <span>
      <span>{` · ${turn === me ? "your turn" : `${name(turn)} next`}`}</span>
      {countdown != null ? <span translate="no"> ({countdown})</span> : null}
    </span>
  ) : (
    ""
  );
  if (Number(latest.bonus_cents) > 0)
    return (
      <span>
        <span>{`${name(latest.seat)} hit a ${(bonus?.tier ?? "WILD").replace(/_/g, " ")}! `}</span>
        <span className="font-semibold text-gold">
          {`+${formatUsd(Number(latest.bonus_cents))} bonus`}
        </span>
        <span> added to the pot</span>
        {next}
      </span>
    );
  const lines = latest.lines.length
    ? ` · ${latest.lines.length} line win${latest.lines.length > 1 ? "s" : ""}`
    : "";
  return (
    <span>
      <span>{`${name(latest.seat)} scored ${latest.score}${lines}`}</span>
      {next}
    </span>
  );
}
