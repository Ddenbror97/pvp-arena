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
import {
  PERK_IDS,
  PERKS,
  SLOT_RARITY,
  TABLET,
  type PerkId,
  type PerkRarity,
} from "@/lib/fps/br/perks";

/**
 * The Tactical Tablet (T; owner, 2026-11-13: "redesign it as a premium, modern military tactical
 * device", then "more realistic ipad" and "remove the data points to change perks"): a rugged
 * field tablet held up over the game: a chamfered rubber case with bumpers, screws, a camera
 * and side keys round a glass screen. On the screen (owner, 2026-11-14: "1 commun perk active,
 * 1 rare perk active, 1 epic perk active", and "clean, easy to navigate/understand not so many
 * filters"): three columns, Common, Rare and Epic, each its slot's choice; a tap picks a perk
 * (it replaces that column's pick), a tap on the picked one takes it out. No filters, no sort,
 * no slot to select first. There is nothing to buy, and every state on it is the server's (the
 * kit view): a tap only asks (act "perk"), and the page changes when the kit comes back. It
 * renders when the kit changes, never per frame; nothing on it blurs the game behind.
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
const TITLE: Record<PerkRarity, string> = { common: "Common", rare: "Rare", epic: "Epic" };

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
  const [note, setNote] = useState<{ id: number; text: string } | null>(null);
  const clock = useMemo(
    () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    [],
  );
  // Feedback from what the server confirmed: the slots as they were against as they are now.
  const before = useRef(t);
  useEffect(() => {
    const was = before.current;
    before.current = t;
    if (!was || !t) return;
    let text = "";
    for (let i = 0; i < TABLET.activeSlots; i++) {
      const a = was.active[i] ?? null,
        b = t.active[i] ?? null;
      if (a === b) continue;
      if (b) {
        text =
          a && !t.active.includes(a)
            ? `${PERKS[b].name} replaced ${PERKS[a].name}`
            : `${PERKS[b].name} equipped`;
        break;
      }
      if (a && !t.active.includes(a)) text = `${PERKS[a].name} removed`;
    }
    if (!text) return;
    const id = performance.now();
    setNote({ id, text });
    const timer = setTimeout(() => setNote((n) => (n?.id === id ? null : n)), 1800);
    return () => clearTimeout(timer);
  }, [t]);
  if (!t) return null;
  const active = t.active.filter(Boolean).length;
  return (
    <div className="br-tablet" role="dialog" aria-label="Tactical tablet">
      <div className="br-pad">
        {/* The case's hardware: bumpers and their screws, the side keys, the camera. */}
        <i className="br-pad-bumper tl" aria-hidden />
        <i className="br-pad-bumper tr" aria-hidden />
        <i className="br-pad-bumper bl" aria-hidden />
        <i className="br-pad-bumper br" aria-hidden />
        <i className="br-pad-keys" aria-hidden />
        <i className="br-pad-cam" aria-hidden />
        <i className="br-pad-port" aria-hidden />
        <div className="br-pad-glass">
          <div className="br-tablet-screen">
            <div className="br-tablet-status" aria-hidden>
              <span>
                <Wifi size={13} /> PVPSTRIKE OS v3.7
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
                  <h2>Perks</h2>
                  <small>One common · one rare · one epic</small>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Active</dt>
                  <dd className="is-active">
                    {active} / {TABLET.activeSlots}
                  </dd>
                </div>
              </dl>
              <button
                className="br-tablet-close"
                onClick={close}
                aria-label="Close tablet (T or Esc)"
              >
                <X size={18} aria-hidden />
                <small>T / ESC</small>
              </button>
            </header>

            <div className="br-tablet-cols">
              {SLOT_RARITY.map((rarity, slot) => {
                const picked = t.active[slot] ?? null;
                // The pick that makes three uses the tablet up (owner, 2026-11-14).
                const locks = !picked && active === TABLET.activeSlots - 1;
                return (
                  <section
                    key={rarity}
                    className={`br-tablet-col ${rarity}`}
                    aria-label={TITLE[rarity]}
                  >
                    <h3>
                      {TITLE[rarity]}
                      <span>{picked ? PERKS[picked].name : "Pick 1"}</span>
                    </h3>
                    <ul>
                      {PERK_IDS.filter((id) => PERKS[id].rarity === rarity).map((id) => {
                        const p = PERKS[id];
                        const Icon = ICON[id];
                        const on = picked === id;
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              className={`br-pick ${on ? "on" : ""}`}
                              aria-pressed={on}
                              onClick={() =>
                                act(
                                  on
                                    ? { act: "perk", op: "deactivate", slot }
                                    : { act: "perk", op: "activate", perk: id, slot },
                                )
                              }
                              title={
                                on
                                  ? `Take ${p.name} out`
                                  : locks
                                    ? "Your third pick: locks in all three and uses up the tablet"
                                    : picked
                                      ? `Replace ${PERKS[picked].name}`
                                      : `Pick ${p.name}`
                              }
                            >
                              <Icon size={24} strokeWidth={1.7} aria-hidden />
                              <span>
                                <b>{p.name}</b>
                                <small>{p.description}</small>
                              </span>
                              {on ? (
                                <Check size={16} aria-hidden className="mark" />
                              ) : locks ? (
                                <em>Lock in</em>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>

            <footer className="br-tablet-foot">
              Tap a perk to pick it. Your third pick locks all three in and uses up the tablet; the
              perks stay with you, and a new tablet lets you change them.
            </footer>
            {note && (
              <div key={note.id} className="br-tablet-note" role="status">
                <Check size={14} aria-hidden /> {note.text}
              </div>
            )}
          </div>
          <i className="br-pad-glare" aria-hidden />
        </div>
      </div>
    </div>
  );
}
