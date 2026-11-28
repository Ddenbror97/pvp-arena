/**
 * The BR HUD's top, feed and inventory in fixed match states (no match, no WebGL), over a still
 * game frame: on the plane with the doors open, on the ground mid-match, just after a kill, and
 * with the inventory (B) open. For before-and-after checks of the HUD styles; driven by
 * hud-states.mjs. The states are the HUD's own props, so the same page renders main's HUD and
 * a branch's: what a branch adds (the counters, the phase line, the KILLED confirmation) is
 * used when the module exports it, and main's markup otherwise.
 */
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { BrHud, BrNearby } from "../../../src/lib/fps/br/br-arena";
import type { BrKitView } from "../../../src/lib/fps/br/match";
import * as Hud from "../../../src/components/fps/BrHud";
import { ITEMS, RARITY, type ItemId } from "../../../src/lib/fps/br/items";
import { DEFAULT_STRIKE_SETTINGS } from "../../../src/lib/fps/settings";

type Any = (props: Record<string, unknown>) => ReactNode;
const extra = Hud as unknown as Record<string, Any | undefined>;
const Counters = extra["BrCounters"];
const PhaseBanner = extra["BrPhaseBanner"];

const scene = (window as unknown as { SCENE?: string }).SCENE ?? "ground";

const kit = {
  hp: 78,
  active: 0,
  guns: [
    { item: "m4", mag: 24, optic: "sight-red", muzzle: "silencer" },
    { item: "awp", mag: 5, optic: "scope-6x", muzzle: null },
    { item: "deagle", mag: 7, optic: null, muzzle: null },
  ],
  helmet: { item: "helmet-2", durability: 96 },
  vest: { item: "vest-2", durability: 100 },
  plates: [{ item: "plate", durability: 25 }, { item: "plate", durability: 14 }, null],
  backpack: "backpack-2",
  capacity: 14,
  bag: [
    { item: "ammo-rifle", qty: 120 },
    { item: "ammo-sniper", qty: 15 },
    { item: "ammo-50ae", qty: 14 },
    { item: "bandage", qty: 5 },
    { item: "medkit", qty: 1 },
    { item: "grenade-he", qty: 2 },
    { item: "grenade-smoke", qty: 1 },
    { item: "plate", qty: 1, durability: 25 },
    { item: "helmet-3", qty: 1, durability: 230 },
    { item: "compensator", qty: 1 },
  ],
  heal: null,
  reloadUntil: 0,
  drawUntil: 0,
  kills: scene === "plane" ? 0 : scene === "kill" ? 4 : 3,
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
const nearby = [
  near(2, "ak47", "Assault rifle · 30/30"),
  near(3, "ammo-rifle", "AK-47 and M4 · ×30", 30),
  near(4, "vest-3", "Level 3 · 200/200"),
  near(5, "bandage", "Heals 15 (up to 75) · ×5", 5),
  near(6, "grenade-fire", "Fire grenade · ×1"),
  near(7, "backpack-3", "18 slots"),
];

const plane = scene === "plane";
const hud = {
  phase: plane ? "plane" : "active",
  myPhase: plane ? "plane" : "ground",
  canopy: null,
  countdown: plane ? 12 : null,
  jumpOpen: plane,
  aboard: plane ? 87 : 0,
  humans: 3,
  altitude: plane ? 640 : 24,
  agl: plane ? 620 : 0,
  speedKmh: 0,
  visible: 0,
  kit,
  mag: 24,
  aim: 0,
  scope: null,
  reload: null,
  heal: null,
  prompt: null,
  onFoot: !plane,
  nade: null,
  alive: plane ? 100 : 32,
  zone: plane
    ? null
    : {
        phase: 3,
        shrinking: false,
        x: 1100,
        z: 1600,
        r: 900,
        nx: 1180,
        nz: 1660,
        nr: 520,
        until: null,
        dps: 1,
        of: 8,
        left: 42,
        outside: false,
      },
  me: { x: 1100, z: 1600, yaw: 0.6 },
  watch: null,
  placed: null,
  result: null,
  vehicle: null,
  flight: null,
  drops: [],
  airdrop: null,
  waypoint: null,
  nearby: scene === "inventory" ? nearby : [],
  heading: 0.6,
} as unknown as BrHud;

const now = performance.now();
const row = (id: number, killer: string, victim: string, weapon: string, mine = false) => ({
  id,
  mine,
  at: now - id * 900,
  killer,
  victim,
  weapon,
  self: false,
});
const feed = {
  toasts: [],
  kills: plane
    ? []
    : [
        row(1, "You", "BOT Atlas-3", "m4", true),
        row(2, "BOT Rook-24", "BOT Kestrel-7", "awp"),
        row(3, "Dima_rus_23", "BOT Vega-11", "ak"),
      ],
  hurt: null,
  hit: scene === "kill" ? { at: now, head: true, kill: true } : null,
  out: null,
  confirm:
    scene === "kill"
      ? { seat: 7, at: now, victim: "BOT Atlas-3", weapon: "m4", m: 142, streak: 1 }
      : null,
  onFeed: () => {},
} as unknown as ReturnType<typeof Hud.useBrFeed>;

// The match screen's order (BrMatch): centre, status, feed, counters, top status, banner.
createRoot(document.getElementById("hud")!).render(
  <>
    {!plane && <Hud.BrCentre hud={hud} hit={feed.hit} crosshair={DEFAULT_STRIKE_SETTINGS} />}
    {!plane && <Hud.BrStatus hud={hud} />}
    <Hud.BrFeedView feed={feed} />
    {Counters && (
      <Counters alive={hud.alive} kills={kit.kills} aboard={plane ? hud.aboard : null} />
    )}
    {!plane && <Hud.BrTopStatus hud={hud} />}
    {!plane && <Hud.BrZone hud={hud} map={null} waypoint={null} />}
    {scene === "inventory" && (
      <div className="br-inventory-layer">
        <Hud.BrInventory kit={kit} nearby={nearby} act={() => {}} close={() => {}} />
      </div>
    )}
    <header className="duel-hud-top">
      <span />
      {plane &&
        (PhaseBanner ? (
          <PhaseBanner hud={hud} />
        ) : (
          <div className="br-banner">Jump! 12 s left · 87 aboard</div>
        ))}
    </header>
  </>,
);
