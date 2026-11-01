import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { duelError } from "@/lib/fps/api";
import { duelAction } from "@/lib/fps/duel.functions";
import { useFpsQueue } from "@/lib/fps/queue";

function useJoinQueuedMatch() {
  const queue = useFpsQueue();
  const action = useServerFn(duelAction);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inFlight = useRef(false);
  return async () => {
    const cash = queue.data?.cash;
    if (!cash || cash.status !== "FUNDED" || inFlight.current) return;
    if (cash.ready_deadline && Date.parse(cash.ready_deadline) <= Date.now()) {
      toast.error("The ready window expired. Both entries will be refunded without a fee.");
      void qc.invalidateQueries({ queryKey: ["fps-queue"] });
      return;
    }
    inFlight.current = true;
    try {
      if (queue.data?.practice) {
        await action({ data: { action: "cancel", matchId: queue.data.practice.id } });
      }
      await navigate({ to: "/fps/$matchId", params: { matchId: cash.id } });
      void qc.invalidateQueries({ queryKey: ["fps-queue"] });
    } catch (e) {
      toast.error(duelError(e));
    } finally {
      inFlight.current = false;
    }
  };
}

/** Also rendered inside the pointer-lock settings dialog so its focus trap cannot hide the action. */
export function FpsReadyAction({ practiceId }: { practiceId: string }) {
  const queue = useFpsQueue();
  const join = useJoinQueuedMatch();
  const [busy, setBusy] = useState(false);
  const cash = queue.data?.cash;
  if (queue.data?.practice?.id !== practiceId || cash?.status !== "FUNDED" || !cash.ready_deadline)
    return null;
  return (
    <div className="duel-queue-ready" role="status">
      <strong>Your human opponent joined.</strong>
      <p>
        Leave free Practice and ready up within 60 seconds. If either player is absent, both entries
        are refunded.
      </p>
      <button
        className="duel-primary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void join().finally(() => setBusy(false));
        }}
      >
        {busy ? "Opening match…" : "Join now"}
      </button>
    </div>
  );
}

export function FpsQueueNotice() {
  const queue = useFpsQueue(true);
  const join = useJoinQueuedMatch();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const notified = useRef<string | null>(null);
  const joinRef = useRef(join);
  joinRef.current = join;
  const cash = queue.data?.cash;
  const cashId = cash?.id;
  const practiceId = queue.data?.practice?.id;
  const pending =
    cash?.status === "FUNDED" && !!cash.ready_deadline && pathname !== `/fps/${cash.id}`;
  useEffect(() => {
    if (!pending || !cashId) return;
    const id = `fps-ready-${cashId}`;
    // The server does not auto-play or auto-forfeit the creator's money seat.
    if (practiceId && pathname === `/fps/${practiceId}` && document.pointerLockElement)
      document.exitPointerLock();
    toast("Your PvPStrike opponent joined", {
      id,
      description:
        "Ready up within 60 seconds. Both entries are refunded if either player is absent.",
      duration: Infinity,
      action: { label: "Join now", onClick: () => void joinRef.current() },
    });
    if (notified.current !== cashId) {
      notified.current = cashId;
      if (
        document.visibilityState === "hidden" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const notice = new Notification("Your PvPStrike opponent joined", {
            body: "Return to the site and click Join now.",
            tag: id,
          });
          notice.onclick = () => {
            window.focus();
            void joinRef.current();
            notice.close();
          };
        } catch {
          // Some browsers deny desktop delivery despite a granted permission.
          // The persistent in-site action remains available.
        }
      }
    }
    return () => {
      toast.dismiss(id);
    };
  }, [pending, cashId, practiceId, pathname]);
  return null;
}
