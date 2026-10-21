import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { money, type PokerHand, type TableState } from "@/lib/poker/api";
import { collectedPot } from "@/lib/poker/events";
import type { Presentation } from "@/lib/poker/director";
import { bestFive, displaySlot, SEAT_LAYOUT } from "@/lib/poker/display";
import { Dealer } from "./Dealer";
import { FlightLayer, type FlightLayerHandle } from "./FlightLayer";
import { ChipStack, PlayingCard } from "./PlayingCard";
import { Seat } from "./Seat";
import { cn } from "@/lib/utils";

function useShape(ref: React.RefObject<HTMLElement | null>) {
  const [tall, setTall] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e!.contentRect;
      setTall(r.height > r.width * 1.05);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return tall;
}

/**
 * The table: dealer, felt, board, pot, bets and six seats. Rendering only. Card faces come
 * from the authoritative state; the presentation decides only *when* already-dealt cards
 * become visible and which effects play.
 */
export function PokerStage({
  state,
  pres,
  flightsRef,
  mySeat,
  myCards,
  serverNow,
  canSit,
  onSit,
  overlay,
  className,
}: {
  state: TableState;
  pres: Presentation;
  flightsRef: React.RefObject<FlightLayerHandle | null>;
  mySeat: number | null;
  /** Viewer's hole cards for a hand id (kept after the hand ends, when the server stops sending them). */
  myCards: (handId: number) => number[] | null;
  serverNow: () => number;
  canSit: boolean;
  onSit: (seatNo: number) => void;
  overlay?: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const tall = useShape(root);
  const t = state.table;
  const max = t.max_seats;
  const hand: PokerHand | null = state.hand ?? state.last_hand;
  const presented = !!hand && pres.handId === hand.id;
  const voided = hand?.status === "VOIDED";
  const boardVisible =
    !hand || voided
      ? 0
      : presented
        ? Math.min(pres.boardShown, hand.board.length)
        : hand.board.length;
  const done = hand?.status === "COMPLETED";
  const winners = useMemo(() => {
    if (!hand || !done) return new Map<number, { amount: number; handName: string | null }>();
    const list = presented
      ? pres.winners
      : hand.players
          .filter((p) => (p.won ?? 0) > 0)
          .map((p) => ({ seat: p.seat_no, amount: p.won!, handName: p.hand_name }));
    return new Map(list.map((w) => [w.seat, { amount: w.amount, handName: w.handName }]));
  }, [hand, done, presented, pres.winners]);

  const winningCards = useMemo(() => {
    const s = new Set<number>();
    if (!hand || !done || hand.board.length < 5) return s;
    for (const [seat] of winners) {
      const p = hand.players.find((x) => x.seat_no === seat);
      if (p?.shown_cards) for (const c of bestFive([...p.shown_cards, ...hand.board])) s.add(c);
    }
    return s;
  }, [hand, done, winners]);

  const layout = SEAT_LAYOUT[tall ? "tall" : "wide"];
  const anchor = mySeat ?? 0;
  const bySeat = new Map(state.seats.map((s) => [s.seat_no, s]));
  const pot = hand && !voided ? collectedPot(hand) : 0;
  const focusPos =
    pres.focusSeat != null ? layout[displaySlot(pres.focusSeat, anchor, max)]?.seat : null;
  const look = focusPos
    ? {
        x: Math.max(-1, Math.min(1, (focusPos.x - 50) / 40)),
        y: Math.max(0, Math.min(1, (focusPos.y - 30) / 55)),
      }
    : null;
  const showPot = pot > 0 && !(done && winners.size > 0 && (!presented || pres.winners.length > 0));

  return (
    <div
      ref={root}
      className={cn("poker-stage", tall ? "is-tall" : "is-wide", className)}
      data-street={hand?.street ?? "IDLE"}
    >
      <span className="poker-wall-mark" aria-hidden>
        PVP
      </span>
      <div className="poker-table" aria-hidden>
        <span className="poker-rail" />
        <span className="poker-felt" />
      </div>
      <Dealer
        pose={pres.pose}
        look={look}
        caption={pres.caption?.text ?? null}
        className="poker-stage-dealer"
      />
      <span className="poker-muck" data-anchor="muck" aria-hidden />

      <div className="poker-board" aria-label="Community cards">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="poker-board-slot" data-anchor={`board-${i}`}>
            {hand && i < boardVisible ? (
              <PlayingCard
                card={hand.board[i]}
                fresh={presented && pres.freshBoard.includes(i)}
                win={winningCards.has(hand.board[i]!)}
              />
            ) : null}
          </span>
        ))}
      </div>
      <div className="poker-pot" data-anchor="pot" aria-live="polite">
        {showPot ? (
          <>
            <ChipStack amount={pot} label={money(pot)} pulse={pres.potPulse} />
            <span className="poker-pot-label">Pot</span>
          </>
        ) : null}
      </div>

      {Array.from({ length: max }, (_, seatNo) => {
        const { seat: pos, bet: bp } = layout[displaySlot(seatNo, anchor, max)] ?? layout[0]!;
        const seat = bySeat.get(seatNo) ?? null;
        const player =
          hand && !voided ? (hand.players.find((p) => p.seat_no === seatNo) ?? null) : null;
        const isMe = seatNo === mySeat && !!seat;
        const own = isMe && hand ? myCards(hand.id) : null;
        const shown =
          player?.shown_cards && done && (!presented || pres.shownSeats.includes(seatNo))
            ? player.shown_cards
            : null;
        const cards = shown ?? own;
        // The deal animation only decides when opponent backs land. The viewer's own
        // faces are already on the server, so a fast bot hand cannot finish before they appear.
        const animated = player
          ? presented
            ? (pres.holeShown[seatNo] ?? 0)
            : hand!.status === "COMMIT"
              ? 0
              : 2
          : 0;
        const landed = own && own.length === 2 ? Math.max(animated, 2) : animated;
        const turn =
          state.hand?.status === "BETTING" &&
          state.hand.to_act === seatNo &&
          state.hand.action_deadline
            ? { deadline: state.hand.action_deadline }
            : null;
        const bet = player && state.hand?.id === hand?.id && !done ? player.street_bet : 0;
        return (
          <div key={seatNo}>
            <div className="poker-seat-pos" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <Seat
                seatNo={seatNo}
                seat={seat}
                player={player}
                isMe={isMe}
                cards={cards}
                landed={landed}
                faceUp={!!cards}
                turn={turn}
                actionMs={state.config.action_seconds * 1000}
                serverNow={serverNow}
                button={hand ? hand.button_seat === seatNo && !voided : t.button_seat === seatNo}
                winner={winners.get(seatNo) ?? null}
                winningCards={winningCards}
                canSit={canSit}
                onSit={onSit}
              />
            </div>
            <span
              className="poker-bet"
              style={{ left: `${bp.x}%`, top: `${bp.y}%` }}
              data-anchor={`bet-${seatNo}`}
              data-has-bet={bet > 0 ? "1" : "0"}
            >
              {bet > 0 ? (
                <ChipStack amount={bet} label={money(bet)} pulse={pres.betPulse[seatNo] ?? 0} />
              ) : null}
            </span>
          </div>
        );
      })}

      {pres.toast ? (
        <div key={pres.toast.id} className="poker-toast" role="status">
          {pres.toast.text}
        </div>
      ) : null}
      {overlay}
      <FlightLayer ref={flightsRef} root={root} />
    </div>
  );
}
