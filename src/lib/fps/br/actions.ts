import { eyeHeight } from "../map";
import type { Fighter } from "./combat";
import {
  canHeal,
  dropEquipped,
  tabletOf,
  dropFromBag,
  equipFromBag,
  EQUIP_SLOTS,
  pickUp,
  unequip,
  type EquipSlot,
  type Loose,
} from "./inventory";
import { INVENTORY, ITEMS } from "./items";
import { isPerkId, PERK_EFFECT, perkOn, perkOperation, type PerkOp } from "./perks";
import type { LootWorld } from "./loot-world";
import type { StaticWorld } from "./static-world";

/**
 * Discrete player actions (LOOT-SPEC §3, §12–13): pick up (E), the inventory screen's
 * equip / unequip / drop, and using a healing item. Strict schema like the movement input;
 * the server checks reach, sight and the inventory rules and answers with a result event, so
 * the client never decides what it owns.
 */
export type BrAct =
  | { act: "pickup"; id: number }
  | { act: "equip"; index: number; target: number }
  | { act: "unequip"; slot: EquipSlot }
  | { act: "dropBag"; index: number; qty?: number }
  | { act: "dropEquip"; slot: EquipSlot }
  | { act: "heal"; item: "bandage" | "medkit" }
  | { act: "cancel" }
  | { act: "throw"; nade: "he" | "smoke" | "fire"; kind: "over" | "medium" | "under" }
  | { act: "enter"; id: number }
  | { act: "exit" }
  /** Open or close a door (doors.ts id). */
  | { act: "door"; id: number }
  | ({ act: "perk" } & PerkOp);

const KEYS: Record<BrAct["act"], readonly string[]> = {
  pickup: ["id"],
  equip: ["index", "target"],
  unequip: ["slot"],
  dropBag: ["index", "qty"],
  dropEquip: ["slot"],
  heal: ["item"],
  cancel: [],
  throw: ["nade", "kind"],
  enter: ["id"],
  exit: [],
  door: ["id"],
  perk: ["op", "perk", "slot"],
};
const int = (v: unknown, lo: number, hi: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
const SLOTS = new Set<string>(EQUIP_SLOTS);

export function validateBrAct(raw: unknown): BrAct | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Partial<
    Record<
      | "v"
      | "type"
      | "act"
      | "id"
      | "index"
      | "target"
      | "slot"
      | "qty"
      | "item"
      | "nade"
      | "kind"
      | "op"
      | "perk",
      unknown
    >
  >;
  if (r.v !== 1 || r.type !== "br-act" || typeof r.act !== "string") return null;
  const allowed = KEYS[r.act as BrAct["act"]];
  if (!allowed) return null;
  for (const k of Object.keys(raw))
    if (k !== "v" && k !== "type" && k !== "act" && !allowed.includes(k)) return null;
  switch (r.act) {
    case "pickup":
      return int(r.id, 0, 2 ** 31) ? { act: "pickup", id: r.id as number } : null;
    case "equip":
      return int(r.index, 0, 63) && (r.target === undefined || int(r.target, 0, 2))
        ? { act: "equip", index: r.index as number, target: (r.target as number | undefined) ?? 0 }
        : null;
    case "unequip":
    case "dropEquip":
      return typeof r.slot === "string" && SLOTS.has(r.slot)
        ? { act: r.act, slot: r.slot as EquipSlot }
        : null;
    case "dropBag":
      return int(r.index, 0, 63) && (r.qty === undefined || int(r.qty, 1, 999))
        ? {
            act: "dropBag",
            index: r.index as number,
            ...(r.qty !== undefined ? { qty: r.qty as number } : {}),
          }
        : null;
    case "heal":
      return r.item === "bandage" || r.item === "medkit" ? { act: "heal", item: r.item } : null;
    case "cancel":
      return { act: "cancel" };
    case "enter":
      return int(r.id, 0, 999) ? { act: "enter", id: r.id as number } : null;
    case "exit":
      return { act: "exit" };
    case "door":
      return int(r.id, 0, 2 ** 20) ? { act: "door", id: r.id as number } : null;
    case "perk":
      if (r.op === "unlock")
        return isPerkId(r.perk) && r.slot === undefined
          ? { act: "perk", op: "unlock", perk: r.perk }
          : null;
      if (r.op === "activate")
        return isPerkId(r.perk) && int(r.slot, 0, 2)
          ? { act: "perk", op: "activate", perk: r.perk, slot: r.slot as number }
          : null;
      if (r.op === "deactivate")
        return r.perk === undefined && int(r.slot, 0, 2)
          ? { act: "perk", op: "deactivate", slot: r.slot as number }
          : null;
      return null;
    case "throw":
      return (r.nade === "he" || r.nade === "smoke" || r.nade === "fire") &&
        (r.kind === "over" || r.kind === "medium" || r.kind === "under")
        ? { act: "throw", nade: r.nade, kind: r.kind }
        : null;
  }
  return null;
}

/** Result for the acting player only: the pickup notification or why it was refused. */
export type ActEvent = {
  type: "act";
  seat: number;
  act: BrAct["act"];
  ok: boolean;
  reason?: string;
  item?: string;
  qty?: number;
};

/** Lay dropped items around the feet on whatever floor is there (never inside walls). */
export function layDown(loot: LootWorld, world: StaticWorld, f: Fighter, drops: readonly Loose[]) {
  const n = drops.length;
  drops.forEach((d, i) => {
    let placed = false;
    for (const ring of [0.7, 1.2, 0.35, 0]) {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + f.seat;
      const x = f.body.x + Math.cos(a) * ring,
        z = f.body.z + Math.sin(a) * ring;
      const y = world.supportAt(x, z, 0.15, f.body.y + 0.4);
      if (Math.abs(y - f.body.y) > 1.2 || world.blocked(x, y + 0.05, z, 0.4, 0.15)) continue;
      loot.add({ ...d, dropped: true }, x, y, z);
      placed = true;
      break;
    }
    if (!placed) loot.add({ ...d, dropped: true }, f.body.x, f.body.y, f.body.z);
  });
}

export function applyBrAct(
  f: Fighter,
  a: BrAct,
  loot: LootWorld,
  world: StaticWorld,
  now: number,
): ActEvent {
  const res = (ok: boolean, reason?: string, extra?: Partial<ActEvent>): ActEvent => ({
    type: "act",
    seat: f.seat,
    act: a.act,
    ok,
    ...(reason ? { reason } : {}),
    ...extra,
  });
  if (f.dead) return res(false, "You are out");
  const onFoot = f.body.phase === "ground" || f.body.phase === "swim";
  if (!onFoot && a.act !== "cancel") return res(false, "Land first");
  const changed = () => {
    f.kitVersion++;
  };
  switch (a.act) {
    case "pickup": {
      const item = loot.items.get(a.id);
      if (!item) return res(false, "Gone");
      const ex = f.body.x,
        ey = f.body.y + eyeHeight(f.body),
        ez = f.body.z;
      const ty = item.y + 0.15;
      const dist = Math.hypot(item.x - ex, ty - ey, item.z - ez);
      if (dist > INVENTORY.reachM) return res(false, "Too far");
      const hit = world.raycast(ex, ey, ez, item.x - ex, ty - ey, item.z - ez, dist);
      if (hit && hit.distance < dist - 0.3) return res(false, "Out of reach");
      const before = item.qty;
      const out = pickUp(f.kit, item);
      if (!out.ok) return res(false, out.reason, { item: item.item });
      if (out.left) loot.setQty(item.id, out.left);
      else loot.remove(item.id);
      // Scavenger Chip: 20 % more ammunition from loot (not from what players dropped).
      const taken = before - (out.left ?? 0);
      if (
        ITEMS[item.item].category === "ammo" &&
        !item.dropped &&
        perkOn(tabletOf(f.kit), "scavenger-chip")
      ) {
        const bonus = Math.round(taken * (PERK_EFFECT.scavengerAmmo - 1));
        if (bonus > 0) pickUp(f.kit, { item: item.item, qty: bonus });
      }
      layDown(loot, world, f, out.drops);
      changed();
      return res(true, undefined, { item: item.item, qty: before - (out.left ?? 0) });
    }
    case "equip": {
      const out = equipFromBag(f.kit, a.index, a.target);
      if (out.ok) changed();
      return res(out.ok, out.reason);
    }
    case "unequip": {
      const out = unequip(f.kit, a.slot);
      if (out.ok) changed();
      return res(out.ok, out.reason);
    }
    case "dropBag":
    case "dropEquip": {
      const out =
        a.act === "dropBag" ? dropFromBag(f.kit, a.index, a.qty) : dropEquipped(f.kit, a.slot);
      if (out.ok) {
        // Dropping the gun being reloaded cancels the reload.
        if (a.act === "dropEquip" && a.slot.startsWith("gun")) f.hands.reloadUntil = 0;
        layDown(loot, world, f, out.drops);
        changed();
      }
      return res(out.ok, out.reason);
    }
    case "heal": {
      const why = canHeal(f.kit, a.item);
      if (why) return res(false, why);
      if (f.hands.heal) return res(false, "Already healing");
      f.hands.reloadUntil = 0;
      f.hands.aimSince = 0;
      const fast = perkOn(tabletOf(f.kit), "survival-chip") ? PERK_EFFECT.heal : 1;
      f.hands.heal = { item: a.item, until: now + ITEMS[a.item].useMs * fast };
      changed();
      return res(true, undefined, { item: a.item });
    }
    case "perk": {
      const t = tabletOf(f.kit);
      if (!t) return res(false, "No tablet");
      const why = perkOperation(t, a);
      if (!why) changed();
      return res(!why, why ?? undefined);
    }
    case "throw":
    case "enter":
    case "exit":
    case "door":
      return res(false, "Not here"); // handled by the match (grenades in flight, vehicles)
    case "cancel": {
      if (f.hands.heal) {
        f.hands.heal = null;
        changed();
      }
      return res(true);
    }
  }
}
