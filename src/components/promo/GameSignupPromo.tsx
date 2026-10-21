import { useEffect, useReducer, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
        <DialogHeader className="space-y-3 pr-8 text-left">
          <DialogTitle className="font-display text-2xl leading-tight">
            {GAME_SIGNUP_COPY.headline}
          </DialogTitle>
          <p className="font-display text-4xl leading-none text-primary">
            {GAME_SIGNUP_COPY.amount}
          </p>
          <DialogDescription className="text-sm leading-relaxed">
            {GAME_SIGNUP_COPY.support}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Promo code
          </p>
          <p
            className="mt-1 font-mono text-lg tracking-[0.2em] text-foreground"
            aria-label="Promo code PVP1"
          >
            {GAME_SIGNUP_COPY.code}
          </p>
        </div>
        <Button type="button" className="min-h-11 w-full font-display" onClick={onCta}>
          {GAME_SIGNUP_COPY.primary}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="ghost" className="min-h-11 w-full text-muted-foreground">
            {GAME_SIGNUP_COPY.secondary}
          </Button>
        </DialogClose>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {GAME_SIGNUP_COPY.small}{" "}
          <a
            href={GAME_SIGNUP_COPY.termsHref}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {GAME_SIGNUP_COPY.termsLabel}
          </a>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
