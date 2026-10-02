import { Link } from "@tanstack/react-router";
import { Coins, Swords, Trophy, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatUsd } from "@/lib/jackpot/math";
import { LINE_MULT, PAYLINES, SYMBOLS, WILD, type Rarity } from "@/lib/slott/paytable";
import { SYMBOL_IMG } from "@/lib/slott/symbols";
import type { SlotTier } from "@/lib/slott/api";
import { cn } from "@/lib/utils";

export const STEPS = [
  { icon: Coins, title: "Pick a bet", short: "Pick a bet", text: "Choose your stake and create the match." },
  { icon: Users, title: "Challenger joins", short: "Rival joins", text: "They put in the exact same stake." },
  { icon: Swords, title: "Take turns", short: "6 spins each", text: "12 spins, 6 each, fast 3.5-second turns." },
  { icon: Trophy, title: "Top score wins", short: "Top score wins", text: "Winner takes the pot; ties go to sudden death." },
] as const;

const TIER_NAME: Record<string, string> = { WILD: "Wild", MEGA_WILD: "Mega Wild", GOLDEN_WILD: "Golden Wild", JACKPOT_WILD: "Jackpot Wild" };
const GROUPS: { rarity: Rarity; label: string; tone: string }[] = [
  { rarity: "legendary", label: "Legendary", tone: "text-gold" },
  { rarity: "epic", label: "Epic", tone: "text-fuchsia-300 [html[data-theme=light]_&]:text-fuchsia-600" },
  { rarity: "rare", label: "Rare", tone: "text-sky-300 [html[data-theme=light]_&]:text-sky-600" },
  { rarity: "common", label: "Common", tone: "text-muted-foreground" },
];

/** The four steps as a compact rail under the machine. `slim` is one tappable row that opens the rules. `dense` is the one-row version inside the dialog. */
export function StepRail({ className, slim, dense, onOpen }: { className?: string; slim?: boolean; dense?: boolean; onOpen?: () => void }) {
  if (dense) {
    return (
      <ol className={cn("grid grid-cols-4 gap-1", className)}>
        {STEPS.map((s, i) => (
          <li key={s.title} className="slott-chip flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-center">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-primary-soft">
              <s.icon className="h-3 w-3" />
            </span>
            <span className="tabular text-[9px] font-bold leading-none text-primary-soft">{i + 1}</span>
            <span className="w-full truncate text-[10px] font-semibold leading-tight">{s.short}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (slim) {
    return (
      <button type="button" onClick={onOpen} aria-label="How P2P Slott works" className={cn("slott-chip block w-full rounded-xl px-1.5 py-2", className)}>
        <ol className="grid grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex min-w-0 flex-col items-center gap-1 px-0.5 text-center">
              {i > 0 ? <span aria-hidden className="absolute right-1/2 top-3.5 mr-4 h-px w-[calc(100%-2rem)] bg-gradient-to-r from-transparent via-primary/40 to-primary/60" /> : null}
              <span className="relative grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-primary-soft ring-1 ring-primary/40">
                <s.icon className="h-3.5 w-3.5" />
                <span className="tabular absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">{i + 1}</span>
              </span>
              <span className="w-full truncate text-[10px] font-semibold leading-tight">{s.short}</span>
            </li>
          ))}
        </ol>
      </button>
    );
  }
  return (
    <ol className={cn("grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2", className)}>
      {STEPS.map((s, i) => (
        <li key={s.title} className="slott-chip flex items-start gap-2 rounded-xl px-2.5 py-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary-soft">
            <s.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-[11px] font-semibold sm:text-xs"><span className="tabular text-primary-soft">{i + 1}.</span> {s.title}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">{s.text}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Paylines() {
  return (
    <>
      {PAYLINES.map((rows, i) => (
        <svg key={i} viewBox="0 0 50 40" className="h-7 w-full sm:h-6" aria-hidden>
          {Array.from({ length: 20 }, (_, c) => <circle key={c} cx={(c >> 2) * 10 + 5} cy={(c & 3) * 10 + 5} r={1.6} fill="currentColor" opacity={0.25} />)}
          <polyline points={rows.map((r, reel) => `${reel * 10 + 5},${r * 10 + 5}`).join(" ")} fill="none" stroke="#c084fc" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
    </>
  );
}

export function HowItWorks({ open, onOpenChange, tiers, stake, bonusCap }: { open: boolean; onOpenChange: (v: boolean) => void; tiers: SlotTier[]; stake: number; bonusCap: number }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="slott-dialog w-[min(100%-1.25rem,42rem)] max-w-none gap-2 overflow-hidden border-primary/30 bg-[#070a1a] p-3 sm:gap-2.5 sm:p-4">
        <DialogHeader className="space-y-0.5 pr-7">
          <DialogTitle className="font-display text-lg leading-tight">How P2P Slott works</DialogTitle>
          <DialogDescription className="text-xs leading-snug">You play one other player, never the house. Same stake, 6 spins each. Highest score takes the pot.</DialogDescription>
        </DialogHeader>

        <StepRail dense />

        <section className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_9.75rem]">
          <div className="min-w-0">
            <h3 className="font-display text-[11px] uppercase tracking-widest">Brighter symbols pay more</h3>
            <div className="mt-1 space-y-1">
              <div className="slott-chip flex items-center gap-1.5 rounded-lg px-1.5 py-1">
                <span data-rarity="wild" className="slott-cell relative grid h-7 w-7 shrink-0 place-items-center">
                  <img src={SYMBOL_IMG[WILD]} alt="" className="relative" />
                </span>
                <div className="min-w-0 text-[11px] leading-tight"><b className="text-gold">WILD {SYMBOLS[WILD]!.value}</b> <span className="text-muted-foreground">· fills any symbol · 3+ add bonus money</span></div>
              </div>
              {GROUPS.map((gr) => {
                const syms = SYMBOLS.filter((s) => s.rarity === gr.rarity);
                return (
                  <div key={gr.rarity} className="slott-chip flex items-center gap-1.5 rounded-lg px-1.5 py-0.5">
                    <div className="w-16 shrink-0 leading-tight">
                      <div className={cn("text-[11px] font-semibold", gr.tone)}>{gr.label}</div>
                      <div className="tabular text-[10px] text-muted-foreground">{syms[0]!.value} pt{syms[0]!.value > 1 ? "s" : ""}</div>
                    </div>
                    <div className="flex min-w-0 flex-wrap">
                      {syms.map((s) => (
                        <span key={s.id} data-rarity={s.rarity} title={s.name} className="slott-cell relative grid h-7 w-7 place-items-center">
                          <img src={SYMBOL_IMG[s.id]} alt={s.name} className="relative" />
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="slott-chip rounded-lg px-2 py-1.5 text-foreground">
            <div className="text-center text-[10px] font-semibold tracking-wider text-muted-foreground">5 LINES, FROM THE LEFT</div>
            <div className="mt-1 grid grid-cols-5 gap-1 sm:grid-cols-1">
              <Paylines />
            </div>
            <p className="mt-1 text-center text-[11px] font-semibold tabular">3 ×{LINE_MULT[3]} · 4 ×{LINE_MULT[4]} · 5 ×{LINE_MULT[5]}</p>
          </div>
        </section>

        <section>
          <h3 className="font-display text-[11px] uppercase tracking-widest text-gold">Bonus added to the pot</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Not taken from either player. Whoever wins the match gets it, up to {formatUsd(bonusCap)} at this stake.
          </p>
          {tiers.length ? (
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              {tiers.map((t) => (
                <div key={t.tier} className="slott-chip rounded-lg px-1.5 py-1 text-center">
                  <div className="truncate text-[10px] font-semibold text-gold">{TIER_NAME[t.tier] ?? t.tier}</div>
                  <div className="tabular text-[10px] text-muted-foreground">{t.min_wilds}+ WILDs</div>
                  <div className="tabular text-[11px] font-semibold">+{formatUsd(Math.min(Math.floor((stake * t.stake_bps) / 10000), bonusCap))}</div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <p className="text-[11px] leading-snug text-muted-foreground">
          Each turn lasts 3.5 seconds, then the server spins. A 5% fee comes off the players' pot. A tie plays sudden death; a lasting tie refunds both stakes.{" "}
          <Link to="/fairness" className="font-semibold text-primary-soft hover:underline">Verify a match</Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
