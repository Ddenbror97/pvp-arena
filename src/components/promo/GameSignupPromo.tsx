import { useEffect, useReducer, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import {
  recordGameSignupEventFn,
  reserveGameSignupImpressionFn,
} from "@/lib/promo/game-signup.functions";
import {
  GAME_SIGNUP_COPY,
  GAME_SIGNUP_DIALOG_CLASS,
  GAME_SIGNUP_IDLE_MS,
  browserStore,
  createIdleState,
  createSingleFlight,
  gameFromPathname,
  gamePathFromPathname,
  initialInvitePhase,
  inviteUi,
  readInviteDecision,
  readSignupSurface,
  shouldRequestGameSignup,
  stepIdle,
  writeAuthNext,
  writeInviteDecision,
  writeInviteOrigin,
  type GameId,
} from "@/lib/promo/game-signup-policy";

const reserveOnce = createSingleFlight<{ show: boolean }>();

function surfaceBlocked(): boolean {
  return readSignupSurface({
    hidden: document.hidden,
    introLocked: document.documentElement.classList.contains("intro-lock"),
    dialogCount: document.querySelectorAll("[role='dialog'],[role='alertdialog']").length,
  });
}

export function GameSignupPromo() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const game = gameFromPathname(pathname);
  const path = gamePathFromPathname(pathname);
  const { ready, userId } = useAuth();
  const navigate = useNavigate();
  const reserve = useServerFn(reserveGameSignupImpressionFn);
  const record = useServerFn(recordGameSignupEventFn);
  const [state, dispatch] = useReducer(inviteUi, undefined, () =>
    initialInvitePhase(readInviteDecision(browserStore())),
  );
  const asked = useRef(false);
  const sawOpen = useRef(false);
  const cta = useRef(false);
  const dismissed = useRef(false);
  const gameRef = useRef(game);

  useEffect(() => {
    if (gameRef.current === game) return;
    const leftOpen = state.phase === "open" && !cta.current && !dismissed.current;
    gameRef.current = game;
    if (leftOpen) {
      dismissed.current = true;
      void record({ data: { event: "promo_modal_dismiss" } });
    }
    dispatch({ type: "game-changed", game });
  }, [game, record, state.phase]);

  useEffect(() => {
    if (state.phase === "open") writeInviteDecision(browserStore(), true);
    if (state.phase === "off" && readInviteDecision(browserStore()) === "unknown") {
      writeInviteDecision(browserStore(), false);
    }
  }, [state.phase]);

  useEffect(() => {
    if (!game || !ready || userId || readInviteDecision(browserStore()) !== "unknown") return;
    let idle = createIdleState(performance.now());
    const bump = () => {
      idle = stepIdle(idle, {
        now: performance.now(),
        visible: !document.hidden,
        blocked: surfaceBlocked(),
        interacted: true,
      });
    };
    const sample = () => {
      const next = stepIdle(
        idle,
        {
          now: performance.now(),
          visible: !document.hidden,
          blocked: surfaceBlocked(),
          interacted: false,
        },
        GAME_SIGNUP_IDLE_MS,
      );
      idle = next;
      if (!next.ready || asked.current) return;
      const allowed = shouldRequestGameSignup({
        authReady: ready,
        authenticated: Boolean(userId),
        game,
        decision: readInviteDecision(browserStore()),
        idleReady: true,
        visible: !document.hidden,
        blocked: surfaceBlocked(),
      });
      if (!allowed) return;
      asked.current = true;
      dispatch({ type: "eligible" });
    };
    const names = ["pointerdown", "keydown", "scroll", "wheel", "touchstart"] as const;
    for (const name of names) {
      window.addEventListener(name, bump, { capture: true, passive: true });
    }
    const timer = window.setInterval(sample, 200);
    return () => {
      window.clearInterval(timer);
      for (const name of names) window.removeEventListener(name, bump, true);
    };
  }, [game, ready, userId]);

  useEffect(() => {
    if (state.phase !== "asking" || !game) return;
    let active = true;
    const askedGame: GameId = game;
    void reserveOnce(() => reserve({ data: { game: askedGame } }))
      .then((result) => {
        if (active) dispatch({ type: "answer", show: result.show === true });
      })
      .catch(() => {
        if (active) dispatch({ type: "answer", show: false });
      });
    return () => {
      active = false;
    };
  }, [state.phase, game, reserve]);

  useEffect(() => {
    if (state.phase !== "granted") return;
    const tick = () => {
      const here = gameFromPathname(window.location.pathname);
      if (here && !document.hidden && !surfaceBlocked()) {
        dispatch({ type: "surface", clear: true });
      }
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "open" || sawOpen.current) return;
    sawOpen.current = true;
    void record({ data: { event: "promo_modal_impression" } });
  }, [state.phase, record]);

  function onCta() {
    if (!game || !path || cta.current) return;
    cta.current = true;
    const store = browserStore();
    writeInviteOrigin(store, game);
    writeAuthNext(store, path);
    void record({ data: { event: "promo_modal_cta_click" } });
    dispatch({ type: "cta" });
    void navigate({
      to: "/auth",
      search: { mode: "signup", next: path, code: "PVP1" },
    });
  }

  function onOpenChange(next: boolean) {
    if (next || cta.current || dismissed.current) return;
    dismissed.current = true;
    void record({ data: { event: "promo_modal_dismiss" } });
    dispatch({ type: "dismiss" });
  }

  return (
    <Dialog open={state.phase === "open"} onOpenChange={onOpenChange}>
      <DialogContent className={GAME_SIGNUP_DIALOG_CLASS}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl"
        />
        <div className="relative px-6 pb-5 pt-7 sm:px-7 sm:pb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200">
            <Gift className="h-3.5 w-3.5" aria-hidden="true" />
            Welcome offer
          </span>
          <DialogHeader className="mt-4 space-y-2 pr-7 text-left">
            <DialogTitle className="font-display text-[25px] font-bold leading-tight tracking-tight text-white">
              {GAME_SIGNUP_COPY.headline}
            </DialogTitle>
            <DialogDescription className="max-w-[30rem] text-[13px] leading-relaxed text-slate-300">
              {GAME_SIGNUP_COPY.support}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.13] via-[#111329] to-[#10111d] px-4 py-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Promotional play credit
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold leading-none tracking-tight text-white">
                {GAME_SIGNUP_COPY.amount}
              </p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-violet-200/15 bg-violet-300/[0.08] text-violet-200">
              <Gift className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Your promo code
              </p>
              <p className="mt-0.5 text-xs text-slate-300">Enter it during sign up</p>
            </div>
            <p
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-base font-bold tracking-[0.2em] text-white"
              aria-label="Promo code PVP1"
            >
              {GAME_SIGNUP_COPY.code}
            </p>
          </div>
        </div>

        <div className="relative border-t border-white/[0.07] bg-black/10 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-7">
          <Button
            type="button"
            className="min-h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-display text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110"
            onClick={onCta}
          >
            {GAME_SIGNUP_COPY.primary}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="mt-1 min-h-10 w-full rounded-lg text-sm text-slate-400 hover:bg-white/[0.04] hover:text-white"
            >
              {GAME_SIGNUP_COPY.secondary}
            </Button>
          </DialogClose>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
            {GAME_SIGNUP_COPY.small}{" "}
            <a
              href={GAME_SIGNUP_COPY.termsHref}
              className="text-slate-300 underline decoration-slate-500 underline-offset-2 transition hover:text-white"
            >
              {GAME_SIGNUP_COPY.termsLabel}
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
