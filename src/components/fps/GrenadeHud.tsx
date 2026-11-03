import { GRENADE_TYPES, type GrenadeInventory, type GrenadeType } from "@/lib/fps/grenades/rules";
import "./grenade-hud.css";

/** Original silhouettes (not the pack's or any game's icons): egg, banded can, can with a band. */
const ICON: Record<GrenadeType, string> = {
  he: "M12 3h2v3h-2zM9 7h8v2a6 6 0 0 1 2 4.5V17a6 6 0 0 1-12 0v-3.5A6 6 0 0 1 9 9z",
  smoke: "M11 2h4v3h-4zM8 6h10v16H8zM8 15h10v2H8z",
  fire: "M11 2h4v3h-4zM8 6h10v16H8zM8 9h10v2H8z",
};
const LABEL: Record<GrenadeType, string> = { he: "HE", smoke: "SMOKE", fire: "FIRE" };

/**
 * Grenade slots (key 4): the three types with how many are carried; the drawn one highlighted.
 * A used-up grenade greys out and cannot be selected (the server refuses it too).
 */
export function GrenadeHud({
  inventory,
  drawn,
}: {
  inventory: GrenadeInventory | undefined;
  drawn: GrenadeType | null;
}) {
  if (!inventory) return null;
  return (
    <div className="grenade-hud" aria-label="Grenades (key 4)">
      <span className="grenade-hud-key">4</span>
      {GRENADE_TYPES.map((type) => (
        <span
          key={type}
          className={`grenade-hud-slot is-${type}${drawn === type ? " is-drawn" : ""}${
            inventory[type] > 0 ? "" : " is-empty"
          }`}
          title={LABEL[type]}
        >
          <svg viewBox="0 0 26 24" aria-hidden="true">
            <path d={ICON[type]} />
          </svg>
          <small>{LABEL[type]}</small>
          {inventory[type] > 1 ? <b>{inventory[type]}</b> : null}
        </span>
      ))}
    </div>
  );
}
