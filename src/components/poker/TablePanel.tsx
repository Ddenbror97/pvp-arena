import { useState } from "react";
import { ShieldCheck, Loader2, X } from "lucide-react";
import { GameChat } from "@/components/chat/GameChat";
import { SHARED_CHAT_ROOM } from "@/lib/chat/config";
import { fetchHandDetail, money, type RecentHand } from "@/lib/poker/api";
import { verifyPokerHand } from "@/lib/fairness/poker";
import { observedCommitment } from "@/lib/poker/commitments";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";

type Verdict = { ok: boolean; lines: string[] } | "loading" | null;

function HandRow({ h }: { h: RecentHand }) {
  const [v, setV] = useState<Verdict>(null);
  const verify = async () => {
    setV("loading");
    try {
      const d = await fetchHandDetail(h.id);
      if (!d?.server_seed || !d.entropy)
        return setV({ ok: false, lines: ["Proof not published yet."] });
      const r = await verifyPokerHand({
        id: d.id,
        server_seed: d.server_seed,
        server_seed_hash: d.server_seed_hash,
        entropy: d.entropy,
        reveals: d.players.map((p) => ({ seat: p.seat_no, value: p.reveal ?? "" })),
        links: Object.fromEntries(d.players.map((p) => [p.seat_no, p.link])),
        observed_seed_hash: observedCommitment(d.id),
      });
      const n = d.players.length;
      const boardOk = d.board.every(
        (c, i) => c === r.deck[[2 * n + 1, 2 * n + 2, 2 * n + 3, 2 * n + 5, 2 * n + 7][i]!],
      );
      setV({
        ok: r.hashOk && r.commitmentOk !== false && r.revealsOk && r.entropyOk && boardOk,
        lines: [
          r.commitmentOk === null
            ? "– Commitment not seen live on this device"
            : `${r.commitmentOk ? "✓" : "✗"} Commitment matches the one shown before the deal`,
          `${r.hashOk ? "✓" : "✗"} Server seed matches its commitment`,
          `${r.revealsOk ? "✓" : "✗"} Every player's reveal matches their chain`,
          `${r.entropyOk ? "✓" : "✗"} Shuffle entropy recomputed`,
          `${boardOk ? "✓" : "✗"} Board recomputed from the shuffle`,
        ],
      });
    } catch {
      setV({ ok: false, lines: ["Couldn't load this hand. Try again."] });
    }
  };
  return (
    <li className="poker-hand-row">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">#{h.hand_no}</span>
        <span className="flex gap-0.5">
          {h.board.map((c) => (
            <PlayingCard key={c} card={c} className="poker-card-xs" />
          ))}
        </span>
        <span className="text-xs font-semibold tabular-nums">{money(h.pot)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-foreground/85">
          {h.winners
            .map((w) => `${w.username} +${money(w.won)}${w.hand_name ? ` (${w.hand_name})` : ""}`)
            .join(", ") || "No winner"}
        </span>
        <button
          type="button"
          onClick={verify}
          disabled={v === "loading"}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-primary-soft hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {v === "loading" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ShieldCheck className="h-3 w-3" />
          )}
          Verify
        </button>
      </div>
      {v && v !== "loading" ? (
        <ul
          className={cn("mt-1 space-y-0.5 text-[11px]", v.ok ? "text-success" : "text-destructive")}
        >
          {v.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Shared site chat and this table's hand history with one-click fairness checks. */
export function TablePanel({
  recent,
  className,
  id,
  onClose,
}: {
  recent: RecentHand[];
  className?: string;
  id?: string;
  /** Shown as a close button when the panel is a collapsible sheet. */
  onClose?: () => void;
}) {
  const [tab, setTab] = useState<"chat" | "hands">("chat");
  return (
    <section id={id} className={cn("poker-panel", className)} aria-label="Chat and hand history">
      <div className="poker-panel-head">
        <div role="tablist" aria-label="Table panel" className="poker-panel-tabs">
          {(["chat", "hands"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(tab === t && "is-on")}
            >
              {t === "chat" ? "Chat" : "Hands"}
            </button>
          ))}
        </div>
        {onClose ? (
          <button
            type="button"
            className="poker-panel-close"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="relative min-h-0 flex-1">
        <div hidden={tab !== "chat"} className="absolute inset-0">
          <GameChat
            gameType={SHARED_CHAT_ROOM}
            bare
            className="poker-chat h-full rounded-none border-0 bg-transparent"
          />
        </div>
        {tab === "hands" ? (
          <ul className="no-scrollbar absolute inset-0 space-y-2 overflow-y-auto p-2.5">
            {recent.length === 0 ? (
              <li className="py-6 text-center text-xs text-muted-foreground">
                No finished hands yet.
              </li>
            ) : (
              recent.map((h) => <HandRow key={h.id} h={h} />)
            )}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
