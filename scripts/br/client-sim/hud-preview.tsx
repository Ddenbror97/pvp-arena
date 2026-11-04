/**
 * The BR bottom HUD on its own (no match, no WebGL): a few loadouts rendered over a still game
 * frame, for quick visual checks of the HUD styles. Driven by hud-preview.mjs.
 */
import { createRoot } from "react-dom/client";
import type { BrHud } from "../../../src/lib/fps/br/br-arena";
import { BrStatus } from "../../../src/components/fps/BrHud";

const base = {
  hp: 100,
  active: 0,
  guns: [null, null],
  helmet: null,
  vest: null,
  plates: [null, null, null],
  backpack: null,
  capacity: 6,
  bag: [],
  heal: null,
  reloadUntil: 0,
  drawUntil: 0,
  kills: 0,
  dead: false,
  tablet: null,
};
const kits: Record<string, { kit: object; mag: number | null; reload?: boolean; nade?: string }> = {
  armed: {
    kit: {
      ...base,
      hp: 86,
      active: 0,
      guns: [
        { item: "m4", mag: 24, optic: "sight-red" },
        { item: "awp", mag: 5 },
      ],
      helmet: { item: "helmet-2", durability: 80 },
      vest: { item: "vest-1", durability: 60 },
      plates: [{ item: "plate-1", durability: 50 }, null, null],
      bag: [
        { item: "ammo-rifle", qty: 90 },
        { item: "bandage", qty: 3 },
        { item: "grenade-he", qty: 2 },
        { item: "medkit", qty: 1 },
      ],
    },
    mag: 24,
  },
  low: {
    kit: {
      ...base,
      hp: 22,
      active: 0,
      guns: [{ item: "ak47", mag: 4 }, null],
      bag: [{ item: "ammo-rifle", qty: 12 }],
    },
    mag: 4,
    reload: true,
  },
  unarmed: { kit: { ...base }, mag: null },
};
const which = (window as unknown as { KIT?: string }).KIT ?? "armed";
const k = kits[which]!;
const hud = {
  kit: k.kit,
  mag: k.mag,
  nade: null,
  reload: k.reload ? { progress: 0.4, left: 1.2 } : null,
  vehicle: null,
  onFoot: true,
} as unknown as BrHud;
createRoot(document.getElementById("hud")!).render(<BrStatus hud={hud} />);
