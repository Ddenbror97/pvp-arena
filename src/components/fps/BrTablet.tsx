import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  BatteryFull,
  Bomb,
  Check,
  Crosshair,
  Ear,
  Footprints,
  Ghost,
  HeartPulse,
  Hexagon,
  Lock,
  Package,
  PersonStanding,
  Shield,
  ShieldPlus,
  Signal,
  Sparkles,
  Target,
  Wifi,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { BrAct } from "@/lib/fps/br/actions";
import type { BrKitView } from "@/lib/fps/br/match";
import { PERK_IDS, PERKS, TABLET, type PerkId } from "@/lib/fps/br/perks";

/**
 * The Tactical Tablet (T; owner, 2026-11-13: "redesign it as a premium, modern military tactical
 * device"): a rugged field tablet. Its header carries the Tactical Data, unlock and active
 * counts; the three loadout slots sit on top; the perk library below, filtered by rarity and
 * sorted by cost or name. Every figure and state on it is the server's (the kit view): a
 * button only asks (act "perk"), and the page changes when the kit comes back. It renders when
 * the kit changes, never per frame; nothing on it blurs the game behind.
 */
const ICON: Record<PerkId, LucideIcon> = {
  "quick-hands": Zap,
  "combat-ready": ArrowLeftRight,
  scavenger: Package,
  "field-medic": HeartPulse,
  lightweight: Wind,
  "iron-plates": Shield,
  "steady-aim": Crosshair,
  "silent-steps": Ear,
  "fast-recovery": Activity,
  "quick-vault": PersonStanding,
  "deadly-precision": Target,
  "ghost-protocol": Ghost,
  "battle-hardened": ShieldPlus,
  tracker: Footprints,
  "last-stand": Sparkles,
  "explosive-expert": Bomb,
};
type Filter = "all" | "rare" | "epic";
type Sort = "cost" | "name";
type State = "equipped" | "unlocked" | "available" | "insufficient" | "unavailable";
const STATE_LABEL: Record<State, string> = {
  equipped: "Equipped",
  unlocked: "Unlocked",
  available: "Available",
  insufficient: "Insufficient data",
  unavailable: "Unavailable",
};

function stateOf(t: NonNullable<BrKitView["tablet"]>, id: PerkId): State {
  const p = PERKS[id];
  if (p.needs) return "unavailable";
  if (t.active.includes(id)) return "equipped";
  if (t.unlocked.includes(id)) return "unlocked";
  return t.data >= p.cost ? "available" : "insufficient";
}

export function BrTablet({
  kit,
  act,
  close,
}: {
  kit: BrKitView;
  act: (a: BrAct) => void;
  close: () => void;
}) {
  const t = kit.tablet;
  const [slot, setSlot] = useState(() => Math.max(0, t?.active.findIndex((p) => !p) ?? 0));
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("cost");
  const [note, setNote] = useState<{ id: number; text: string } | null>(null);
  const clock = useMemo(
    () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    [],
  );
  // Feedback from what the server confirmed: the tablet as it was against as it is now.
  const before = useRef(t);
  useEffect(() => {
    const was = before.current;
    before.current = t;
    if (!was || !t) return;
    let text = "";
    const gained = t.unlocked.find((id) => !was.unlocked.includes(id));
    if (gained) text = `${PERKS[gained].name} unlocked`;
    else
      for (let i = 0; i < TABLET.activeSlots; i++) {
        const a = was.active[i] ?? null,
          b = t.active[i] ?? null;
        if (a === b) continue;
        if (b)
          text = a
            ? `${PERKS[b].name} replaced ${PERKS[a].name}`
            : `${PERKS[b].name} equipped · slot ${i + 1}`;
        else if (a && !t.active.includes(a)) text = `${PERKS[a].name} removed`;
        if (b) break;
      }
    if (!text) return;
    const id = performance.now();
    setNote({ id, text });
    const timer = setTimeout(() => setNote((n) => (n?.id === id ? null : n)), 1800);
    return () => clearTimeout(timer);
  }, [t]);
  // The selected slot follows the loadout: after an equip, the next free slot.
  useEffect(() => {
    if (!t || !t.active[slot]) return;
    const free = t.active.findIndex((p) => !p);
    if (free >= 0) setSlot(free);
    // Only when the loadout changes (choosing an occupied slot by hand must stick).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.active.join()]);
  if (!t) return null;
  const active = t.active.filter(Boolean).length;
  const available = PERK_IDS.filter((id) => !PERKS[id].needs);
  const shown = PERK_IDS.filter((id) => filter === "all" || PERKS[id].rarity === filter).sort(
    (a, b) =>
      sort === "name"
        ? PERKS[a].name.localeCompare(PERKS[b].name)
        : PERKS[a].cost - PERKS[b].cost || PERKS[a].n.localeCompare(PERKS[b].n),
  );
  const count = (r: "rare" | "epic") => PERK_IDS.filter((id) => PERKS[id].rarity === r).length;
  return (
    <div className="br-tablet" role="dialog" aria-label="Tactical tablet">
      <div className="br-tablet-screen">
        <div className="br-tablet-status" aria-hidden>
          <span>
            <Wifi size={13} /> TACTICAL OS v3.7
          </span>
          <span>{clock}</span>
          <span>
            <Signal size={13} /> 92% <BatteryFull size={15} />
          </span>
        </div>
        <header className="br-tablet-head">
          <div className="br-tablet-title">
            <Hexagon size={34} strokeWidth={1.6} aria-hidden />
            <div>
              <h2>Tactical System</h2>
              <small>Battle Royale // Perk Module</small>
            </div>
          </div>
          <dl>
            <div>
              <dt>Tactical Data</dt>
              <dd className="data">
                <Hexagon size={15} strokeWidth={2.4} aria-hidden /> {t.data}
              </dd>
            </div>
            <div>
              <dt>Unlocked</dt>
              <dd>
                {t.unlocked.length} / {available.length}
              </dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>
                {active} / {TABLET.activeSlots}
              </dd>
            </div>
          </dl>
          <button className="br-tablet-close" onClick={close} aria-label="Close tablet (T or Esc)">
            <X size={18} aria-hidden />
            <small>T / ESC</small>
          </button>
        </header>

        <section className="br-tablet-loadout" aria-label="Active perks">
          <h3>
            Active perks{" "}
            <span>
              ({active}/{TABLET.activeSlots})
            </span>
          </h3>
          <div className="br-tablet-slots">
            {t.active.map((id, i) => {
              const p = id ? PERKS[id] : null;
              const Icon = id ? ICON[id] : null;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  className={`br-tablet-slot ${p ? p.rarity : "empty"} ${slot === i ? "sel" : ""}`}
                  onClick={() => setSlot(i)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSlot(i)}
                  aria-pressed={slot === i}
                  aria-label={`Slot ${i + 1}: ${p ? p.name : "empty"}`}
                >
                  {p && Icon ? (
                    <>
                      <Icon size={34} strokeWidth={1.7} aria-hidden />
                      <div>
                        <small>{p.rarity}</small>
                        <b>{p.name}</b>
                        <p>{p.description}</p>
                      </div>
                      <button
                        className="br-tablet-x"
                        aria-label={`Unequip ${p.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          act({ act: "perk", op: "deactivate", slot: i });
                        }}
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </>
                  ) : (
                    <div className="none">
                      <small>Slot 0{i + 1}</small>
                      <b>Select perk</b>
                      <p>{slot === i ? "Choose an unlocked perk below" : "Empty"}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <nav className="br-tablet-tabs" aria-label="Perk filters">
          <div role="tablist">
            {(
              [
                ["all", "All perks"],
                ["rare", `Rare (${count("rare")})`],
                ["epic", `Epic (${count("epic")})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={filter === id}
                className={`${id} ${filter === id ? "on" : ""}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="br-tablet-sort"
            onClick={() => setSort(sort === "cost" ? "name" : "cost")}
            aria-label={`Sorted by ${sort}; change`}
          >
            Sort: {sort}
          </button>
        </nav>

        <section className="br-tablet-grid" aria-label="Perk library">
          {shown.map((id) => {
            const p = PERKS[id];
            const Icon = ICON[id];
            const state = stateOf(t, id);
            const replace = t.active[slot];
            return (
              <article key={id} className={`br-perk ${p.rarity} is-${state}`}>
                <Icon size={30} strokeWidth={1.7} aria-hidden />
                <div className="br-perk-text">
                  <small>{p.rarity}</small>
                  <b>{p.name}</b>
                  <p>{p.description}</p>
                </div>
                <footer>
                  {state === "equipped" ? (
                    <span className="br-perk-on">
                      <Check size={14} aria-hidden /> Equipped
                    </span>
                  ) : state === "unavailable" ? (
                    <span className="br-perk-off" title={p.needs}>
                      <Lock size={12} aria-hidden /> {p.needs}
                    </span>
                  ) : state === "unlocked" ? (
                    <>
                      <span className="br-perk-state">Unlocked</span>
                      <button
                        className="go"
                        onClick={() => act({ act: "perk", op: "activate", perk: id, slot })}
                      >
                        {replace ? `Replace slot ${slot + 1}` : `Equip · slot ${slot + 1}`}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="br-perk-cost">
                        <Hexagon size={13} strokeWidth={2.4} aria-hidden /> {p.cost}
                      </span>
                      <button
                        className="go"
                        disabled={state === "insufficient"}
                        onClick={() => act({ act: "perk", op: "unlock", perk: id })}
                        aria-label={`${STATE_LABEL[state]}: unlock ${p.name} for ${p.cost} Tactical Data`}
                      >
                        {state === "insufficient" ? "Insufficient data" : "Unlock"}
                      </button>
                    </>
                  )}
                </footer>
              </article>
            );
          })}
        </section>

        <footer className="br-tablet-foot">
          Three perks work at once, and only while you carry the tablet. Eliminations earn Tactical
          Data ({TABLET.perElimination} each). Everything on the tablet lasts for this match.
        </footer>
        {note && (
          <div key={note.id} className="br-tablet-note" role="status">
            <Check size={14} aria-hidden /> {note.text}
          </div>
        )}
      </div>
    </div>
  );
}
