import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare, Spade, WifiOff } from "lucide-react";
import { money, type TableState } from "@/lib/poker/api";
import { usePokerPrefs, useReducedMotion } from "@/lib/poker/prefs";
import { warmDealer } from "@/lib/poker/assets";
import { ActionBar, type ActIntent } from "./ActionBar";
import { GameAccount, GameBrand } from "./GameBar";
import { Onboarding } from "./Onboarding";
import { PokerStage } from "./PokerStage";
import { TablePanel } from "./TablePanel";
import { TableSettings } from "./TableSettings";
import { usePresentation, voiceSupported } from "./usePresentation";

export interface TableScreenProps {
  state: TableState;
  mySeat: number | null;
  myCards: (handId: number) => number[] | null;
  serverNow: () => number;
  busy: boolean;
  canSit: boolean;
  offline: boolean;
  onSit: (seatNo: number) => void;
  onAct: (a: ActIntent) => void;
  /** Seat controls (leave, sit out, top up), anchored bottom right. */
  controls?: ReactNode;
  /** Status text when it isn't the viewer's turn. */
  status: ReactNode;
  banner?: ReactNode;
}

/**
 * Full-screen table. Layers: environment, the stage (table, dealer, seats, cards; one
 * coordinate system that keeps its aspect ratio and fits the viewport), then overlay
 * panels anchored to the viewport edges: brand and account on top, chat in a
 * left-hand column, actions centered under the felt, seat controls at the bottom right.
 */
export function TableScreen(p: TableScreenProps) {
  const { state } = p;
  const prefs = usePokerPrefs();
  const reduced = useReducedMotion();
  const [coach, setCoach] = useState(() => !prefs.welcomed);
  const coached = useRef(coach);
  const [firstTurn, setFirstTurn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const names = useMemo(
    () => new Map(state.seats.map((s) => [s.seat_no, s.username])),
    [state.seats],
  );
  const { pres, flights } = usePresentation(state, {
    mySeat: p.mySeat,
    reduced,
    names,
    welcome: !prefs.welcomed,
  });
  useEffect(() => {
    warmDealer();
  }, []);

  const t = state.table;
  const h = state.hand;
  const legal = state.me?.legal ?? null;
  const myTurn = !!h && !!legal && h.status === "BETTING" && h.to_act === p.mySeat;
  useEffect(() => {
    if (!myTurn && h?.actions.some((a) => a.seat_no === p.mySeat && !a.action.startsWith("POST")))
      setFirstTurn(false);
  }, [myTurn, h, p.mySeat]);
  const blinds = `${money(t.small_blind)} / ${money(t.big_blind)}`;

  return (
    <div className="poker-screen" data-chat={chatOpen ? "open" : "closed"}>
      <div className="poker-env" aria-hidden />

      <header className="poker-topbar">
        <div className="poker-topbar-left">
          <GameBrand />
          <div className="poker-game-pill">
            <Link to="/poker" className="poker-icon-btn" aria-label="Back to poker lobby">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Spade className="poker-game-pill-icon" aria-hidden />
            <div className="min-w-0">
              <p className="poker-game-pill-title">Texas Hold'em</p>
              <p className="poker-game-pill-sub">
                {t.name} · {state.seats.length} / {t.max_seats} players · {blinds}
              </p>
            </div>
          </div>
        </div>
        <div className="poker-top-tools">
          <TableSettings voiceAvailable={voiceSupported()} />
          <GameAccount />
        </div>
      </header>

      <div className="poker-stage-wrap">
        <PokerStage
          state={state}
          pres={pres}
          flightsRef={flights}
          mySeat={p.mySeat}
          myCards={p.myCards}
          serverNow={p.serverNow}
          canSit={p.canSit}
          onSit={p.onSit}
          overlay={
            <>
              {p.banner}
              {coach ? <Onboarding onDone={() => setCoach(false)} /> : null}
            </>
          }
        />
      </div>

      {p.offline ? (
        <div className="poker-offline" role="status">
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          Reconnecting… the table keeps running on the server.
        </div>
      ) : null}

      <TablePanel
        id="poker-chat"
        recent={state.recent}
        className="poker-chat-dock"
        onClose={() => setChatOpen(false)}
      />

      <div className="poker-bottom">
        <button
          type="button"
          className="poker-chat-toggle"
          aria-expanded={chatOpen}
          aria-controls="poker-chat"
          onClick={() => setChatOpen((o) => !o)}
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          <span>Chat</span>
        </button>
        <div className="poker-bottom-actions">
          {myTurn && h && legal ? (
            <ActionBar
              legal={legal}
              hand={h}
              busy={p.busy}
              onAct={p.onAct}
              highlight={coached.current && firstTurn}
            />
          ) : (
            <div className="poker-status" aria-live="polite">
              {p.status}
            </div>
          )}
        </div>
        <div className="poker-side">{p.controls}</div>
      </div>
    </div>
  );
}
