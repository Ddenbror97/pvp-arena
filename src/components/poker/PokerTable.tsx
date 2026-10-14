import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Pause, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useServerClock } from "@/lib/jackpot/api";
import {
  money,
  pokerAct,
  pokerCommitChain,
  pokerError,
  pokerLeave,
  pokerNudge,
  pokerReveal,
  pokerSit,
  pokerSitOut,
  pokerTopUp,
  useTableState,
  type TableState,
} from "@/lib/poker/api";
import { chainNeedsRotation, newChainHead, revealFor } from "@/lib/poker/chain";
import { BuyInDialog } from "./BuyInDialog";
import { TableScreen } from "./TableScreen";
import type { ActIntent } from "./ActionBar";

const key = () => crypto.randomUUID();

/** Seconds a server deadline may be overdue before the browser asks the table to advance. */
const NUDGE_GRACE_MS = 1500;

function dueAt(s: TableState): number | null {
  const h = s.hand;
  if (!h) return null;
  const at =
    h.status === "COMMIT"
      ? h.reveal_deadline
      : h.status === "BETTING"
        ? h.action_deadline
        : h.next_hand_at;
  return at ? Date.parse(at) : null;
}

export function PokerTable({ id }: { id: number }) {
  const { userId, ready, needsProfile } = useAuth();
  const q = useTableState(id, userId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const now = useServerClock();
  const state = q.data ?? null;
  const me = state?.me ?? null;
  const mySeat = me?.seat_no ?? null;
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{ kind: "sit"; seat: number } | { kind: "topup" } | null>(
    null,
  );
  const [dialogError, setDialogError] = useState<string | null>(null);
  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ["poker-table", id] }),
    [qc, id],
  );

  const cards = useRef(new Map<number, number[]>());
  if (me?.hand_id && me.hole_cards?.length === 2) cards.current.set(me.hand_id, me.hole_cards);
  const myCards = useCallback((handId: number) => cards.current.get(handId) ?? null, []);

  // Fairness reveal: answer our committed link as soon as a hand opens.
  const revealed = useRef(new Set<number>());
  useEffect(() => {
    const h = state?.hand;
    if (!userId || !h || h.status !== "COMMIT" || me?.hand_id !== h.id || me.revealed || !me.link)
      return;
    if (revealed.current.has(h.id)) return;
    revealed.current.add(h.id);
    void (async () => {
      const value = await revealFor(userId, me.link!);
      if (!value) {
        toast.error(
          "This browser doesn't hold your fairness chain. The hand will void; a new chain starts next hand.",
        );
        return;
      }
      const { error } = await pokerReveal(h.id, value);
      if (error && !/ALREADY|HAND_NOT/.test(error.message)) revealed.current.delete(h.id);
      void refresh();
    })();
  }, [state?.hand, me, userId, refresh]);

  // Replace an unknown or nearly spent chain between hands.
  const rotating = useRef(false);
  useEffect(() => {
    if (!userId || mySeat === null || !state || rotating.current) return;
    if (state.hand?.status === "COMMIT" && me?.hand_id === state.hand.id) return;
    rotating.current = true;
    void (async () => {
      try {
        if (!(await chainNeedsRotation(userId, me?.chain_link))) return;
        const head = await newChainHead(userId);
        const { error } = await pokerCommitChain(id, head);
        if (!error) void refresh();
      } finally {
        rotating.current = false;
      }
    })();
  }, [userId, mySeat, me?.chain_link, me?.hand_id, state, id, refresh]);

  // The scheduler advances tables; an overdue deadline is a recovery hint only.
  const due = state ? dueAt(state) : null;
  useEffect(() => {
    if (due === null || !userId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poke = () => {
      if (stop) return;
      const late = now() - due;
      if (late < NUDGE_GRACE_MS) {
        timer = setTimeout(poke, NUDGE_GRACE_MS - late + 50);
        return;
      }
      void pokerNudge(id).then(({ data }) => {
        if (data && data !== "not_due") void refresh();
      });
      timer = setTimeout(poke, 3000);
    };
    poke();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [due, id, now, userId, refresh]);

  const act = useCallback(
    async (a: ActIntent) => {
      const h = state?.hand;
      if (!h || busy) return;
      setBusy(true);
      const { error } = await pokerAct({
        hand: h.id,
        version: h.version,
        action: a.action,
        amount: a.amount,
        key: key(),
      });
      setBusy(false);
      if (error) toast.error(pokerError(error));
      void refresh();
    },
    [state?.hand, busy, refresh],
  );

  const sit = async (amount: number) => {
    if (!userId || !dialog || dialog.kind !== "sit") return;
    setBusy(true);
    setDialogError(null);
    try {
      const head = await newChainHead(userId);
      const { error } = await pokerSit({
        table: id,
        type: null,
        seat: dialog.seat,
        buyIn: amount,
        head,
        key: key(),
      });
      if (error) setDialogError(pokerError(error));
      else setDialog(null);
    } finally {
      setBusy(false);
      void refresh();
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    }
  };

  const topUp = async (amount: number) => {
    setBusy(true);
    setDialogError(null);
    const { data, error } = await pokerTopUp(id, amount);
    setBusy(false);
    if (error) setDialogError(pokerError(error));
    else {
      setDialog(null);
      if (data?.pending) toast("Top-up added. It joins your stack after this hand.");
    }
    void refresh();
    void qc.invalidateQueries({ queryKey: ["wallet"] });
  };

  const sitOut = async (out: boolean) => {
    if (!userId) return;
    setBusy(true);
    const head =
      !out && (await chainNeedsRotation(userId, me?.chain_link))
        ? await newChainHead(userId)
        : null;
    const { error } = await pokerSitOut(id, out, head);
    setBusy(false);
    if (error) toast.error(pokerError(error));
    void refresh();
  };

  const leave = async () => {
    setBusy(true);
    const { data, error } = await pokerLeave(id);
    setBusy(false);
    if (error) {
      toast.error(pokerError(error));
      return;
    }
    if (data?.pending) toast("You'll leave the table when this hand ends.");
    else void navigate({ to: "/poker" });
    void refresh();
    void qc.invalidateQueries({ queryKey: ["wallet"] });
  };

  if (q.isLoading || !ready)
    return (
      <div className="poker-screen" aria-busy="true">
        <div className="poker-env" aria-hidden />
        <div className="poker-stage-wrap">
          <div className="poker-stage is-wide animate-pulse">
            <div className="poker-table">
              <span className="poker-rail" />
              <span className="poker-felt" />
            </div>
          </div>
        </div>
      </div>
    );
  if (!state)
    return (
      <div className="poker-screen grid place-items-center">
        <div className="poker-env" aria-hidden />
        <div className="poker-hud-panel relative max-w-md p-8 text-center">
          <p className="font-display text-xl">Table not available</p>
          <p className="mt-2 text-sm text-[#9aa3c4]">
            {q.isError
              ? "We couldn't load this table. Try again in a moment."
              : "This poker table doesn't exist or has closed."}
          </p>
          <Link to="/poker" className="mt-4 inline-block text-[#c58bff] hover:underline">
            Back to the poker lobby
          </Link>
        </div>
      </div>
    );

  const t = state.table;
  const h = state.hand;
  const seat = state.seats.find((s) => s.seat_no === mySeat) ?? null;
  const canSit =
    !!userId && !needsProfile && mySeat === null && state.config.enabled && t.status === "OPEN";
  const toAct = h?.status === "BETTING" ? state.seats.find((s) => s.seat_no === h.to_act) : null;
  const status = !userId ? (
    <span>
      <Link to="/auth" className="text-primary-soft hover:underline">
        Sign in
      </Link>{" "}
      to take a seat.
    </span>
  ) : !state.config.enabled ? (
    "Poker tables are closed right now."
  ) : mySeat === null ? (
    state.seats.length >= t.max_seats ? (
      "This table is full. You're watching."
    ) : (
      "Pick an open seat to join the game."
    )
  ) : seat?.state === "SITTING_OUT" ? (
    "You're sitting out. Press I'm back to be dealt in."
  ) : !h ? (
    state.seats.filter((s) => s.state === "ACTIVE").length < 2 ? (
      "Waiting for another player…"
    ) : (
      "Next hand starting…"
    )
  ) : h.status === "COMMIT" ? (
    "Shuffling: every player's seed goes into the deck."
  ) : toAct ? (
    `${toAct.username} is deciding…`
  ) : h.status === "COMPLETED" || h.status === "VOIDED" ? (
    "Next hand shortly."
  ) : (
    "Dealing…"
  );

  const room = seat ? t.max_buy_in - seat.stack - seat.pending : 0;
  const controls = seat ? (
    <div className="poker-seat-controls">
      {seat.pending > 0 ? (
        <p className="poker-pending">+{money(seat.pending)} joins your stack next hand</p>
      ) : null}
      <button
        type="button"
        className="poker-btn poker-btn-ghost"
        disabled={busy || room < t.big_blind || seat.leaving}
        onClick={() => {
          setDialogError(null);
          setDialog({ kind: "topup" });
        }}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Top up
      </button>
      <button
        type="button"
        className="poker-btn poker-btn-ghost"
        disabled={busy || seat.leaving}
        onClick={() => void sitOut(seat.state !== "SITTING_OUT")}
      >
        {seat.state === "SITTING_OUT" ? (
          <Play className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Pause className="h-3.5 w-3.5" aria-hidden />
        )}
        {seat.state === "SITTING_OUT" ? "I'm back" : "Sit out"}
      </button>
      <button
        type="button"
        className="poker-btn poker-btn-ghost poker-btn-leave"
        disabled={busy || seat.leaving}
        onClick={() => void leave()}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <LogOut className="h-3.5 w-3.5" aria-hidden />
        )}
        {seat.leaving ? "Leaving…" : "Leave table"}
      </button>
    </div>
  ) : null;

  return (
    <>
      <TableScreen
        state={state}
        mySeat={mySeat}
        myCards={myCards}
        serverNow={now}
        busy={busy}
        canSit={canSit}
        offline={q.isError}
        onSit={(s) => {
          setDialogError(null);
          setDialog({ kind: "sit", seat: s });
        }}
        onAct={(a) => void act(a)}
        controls={controls}
        status={status}
      />
      {dialog?.kind === "sit" ? (
        <BuyInDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          typeId={t.type_id}
          title={`Seat ${dialog.seat + 1} · ${t.name}`}
          min={t.min_buy_in}
          max={t.max_buy_in}
          bb={t.big_blind}
          busy={busy}
          error={dialogError}
          onConfirm={(a) => void sit(a)}
        />
      ) : dialog?.kind === "topup" && seat ? (
        <BuyInDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          typeId={t.type_id}
          title="Top up"
          min={Math.min(room, Math.max(t.big_blind, t.min_buy_in - seat.stack - seat.pending))}
          max={room}
          bb={t.big_blind}
          busy={busy}
          error={dialogError}
          confirmLabel="Add chips"
          note={`Add up to ${money(room)} to your stack (table maximum ${money(t.max_buy_in)}).`}
          onConfirm={(a) => void topUp(a)}
        />
      ) : null}
    </>
  );
}
