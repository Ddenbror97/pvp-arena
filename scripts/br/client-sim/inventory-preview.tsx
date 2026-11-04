/**
 * The BR inventory (B) on its own (no match, no WebGL): a filled loadout and nearby loot over a
 * still game frame, for visual checks of the inventory styles. Driven by inventory-preview.mjs.
 */
import { createRoot } from "react-dom/client";
import type { BrHud, BrNearby } from "../../../src/lib/fps/br/br-arena";
import type { BrKitView } from "../../../src/lib/fps/br/match";
import { BrInventory, BrStatus } from "../../../src/components/fps/BrHud";
import { ITEMS, RARITY, type ItemId } from "../../../src/lib/fps/br/items";
import { BrSettingsSections } from "../../../src/components/fps/BrSettings";
import { DEFAULT_BR_SETTINGS } from "../../../src/lib/fps/br/br-settings";

const full = (window as unknown as { KIT?: string }).KIT !== "empty";
const kit = {
  hp: 86,
  active: 0,
  guns: full
    ? [
        { item: "ak47", mag: 30, optic: "sight-red", muzzle: null },
        { item: "m4", mag: 30, optic: "scope-4x", muzzle: "silencer" },
      ]
    : [null, null],
  helmet: full ? { item: "helmet-2", durability: 120 } : null,
  vest: full ? { item: "vest-2", durability: 100 } : null,
  plates: full
    ? [{ item: "plate", durability: 25 }, { item: "plate", durability: 11 }, null]
    : [null, null, null],
  backpack: full ? "backpack-2" : null,
  capacity: full ? 14 : 6,
  bag: full
    ? [
        { item: "ammo-rifle", qty: 120 },
        { item: "ammo-sniper", qty: 20 },
        { item: "bandage", qty: 5 },
        { item: "medkit", qty: 1 },
        { item: "grenade-he", qty: 1 },
        { item: "grenade-smoke", qty: 1 },
        { item: "plate", qty: 1, durability: 25 },
        { item: "helmet-3", qty: 1, durability: 230 },
        { item: "compensator", qty: 1 },
        { item: "tablet", qty: 1 },
      ]
    : [],
  heal: null,
  reloadUntil: 0,
  drawUntil: 0,
  kills: 0,
  dead: false,
  tablet: null,
} as unknown as BrKitView;
const near = (id: number, item: ItemId, detail: string, qty = 1): BrNearby => ({
  id,
  item,
  name: ITEMS[item].name,
  detail,
  color: RARITY[ITEMS[item].rarity].color,
  rarity: ITEMS[item].rarity,
  category: ITEMS[item].category,
  qty,
  dist: id,
});
const nearby = full
  ? [
      near(1, "awp", "Sniper rifle · 5/5"),
      near(2, "ammo-rifle", "AK-47 and M4 · ×30", 30),
      near(3, "bandage", "Heals 15 (up to 75) · ×5", 5),
      near(4, "grenade-fire", "Fire grenade · ×1"),
      near(5, "medkit", "Heals to full · ×1"),
      near(6, "backpack-3", "18 slots"),
      near(7, "vest-3", "Level 3 · 200/200"),
    ]
  : [];
const hud = {
  kit,
  mag: 30,
  nade: null,
  reload: null,
  vehicle: null,
  onFoot: true,
} as unknown as BrHud;
const which = (window as unknown as { KIT?: string }).KIT;
if (which === "settings")
  createRoot(document.getElementById("hud")!).render(
    <div
      className="strike-settings"
      style={{
        position: "absolute",
        left: "50%",
        top: 20,
        transform: "translateX(-50%)",
        width: 520,
        padding: 24,
        borderRadius: 12,
        display: "grid",
        gap: 14,
        maxHeight: "none",
      }}
    >
      <BrSettingsSections value={DEFAULT_BR_SETTINGS} onChange={() => {}} />
    </div>,
  );
else
  createRoot(document.getElementById("hud")!).render(
    <>
      <BrInventory kit={kit} nearby={nearby} act={() => {}} close={() => {}} />
      <BrStatus hud={hud} />
    </>,
  );
