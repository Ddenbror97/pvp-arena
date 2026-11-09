import type { Loose } from "./inventory";
import { ITEM_IDS, type ItemId } from "./items";
import type { WorldItem } from "./loot";

/**
 * The items lying on the island during a match: rolled loot, drops and eliminated players'
 * gear. Indexed on a 32 m grid for reach checks and interest management. Clients learn about
 * items only near them (LOOT_SEND_M) and receive additions and removals as they change, so
 * nobody can read the whole map's loot off the wire.
 */
export const LOOT_SEND_M = 70;
const CELL = 32;
const key = (x: number, z: number) =>
  (Math.floor(x / CELL) + 512) * 1024 + Math.floor(z / CELL) + 512;
const CODE = new Map<ItemId, number>(ITEM_IDS.map((id, i) => [id, i]));
export const itemCode = (id: ItemId) => CODE.get(id)!;
export const itemFromCode = (code: number): ItemId | undefined => ITEM_IDS[code];

/**
 * Wire row: [id, item code, x, y, z, qty, durability|-1, magazine|-1, optic code|-1,
 * muzzle code|-1, extended magazine code|-1].
 */
export type LootRow = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export function lootRow(i: WorldItem): LootRow {
  return [
    i.id,
    itemCode(i.item),
    i.x,
    i.y,
    i.z,
    i.qty,
    i.durability !== undefined ? Math.round(i.durability * 10) / 10 : -1,
    i.mag ?? -1,
    i.optic ? itemCode(i.optic) : -1,
    i.muzzle ? itemCode(i.muzzle) : -1,
    i.extMag ? itemCode(i.extMag) : -1,
  ];
}

export class LootWorld {
  readonly items = new Map<number, WorldItem>();
  private cells = new Map<number, Set<number>>();
  private nextId = 0;
  /** Items whose row changed (quantity) since they were sent: resent to whoever knows them. */
  private changed = new Set<number>();

  constructor(initial: readonly WorldItem[] = []) {
    for (const i of initial) this.insert({ ...i });
    this.nextId = initial.reduce((m, i) => Math.max(m, i.id + 1), 0);
  }

  private insert(i: WorldItem) {
    this.items.set(i.id, i);
    const k = key(i.x, i.z);
    let c = this.cells.get(k);
    if (!c) this.cells.set(k, (c = new Set()));
    c.add(i.id);
  }

  add(loose: Loose, x: number, y: number, z: number): WorldItem {
    const i: WorldItem = {
      ...loose,
      id: this.nextId++,
      x: +x.toFixed(2),
      y: +y.toFixed(3),
      z: +z.toFixed(2),
    };
    this.insert(i);
    return i;
  }

  remove(id: number) {
    const i = this.items.get(id);
    if (!i) return;
    this.items.delete(id);
    this.cells.get(key(i.x, i.z))?.delete(id);
    this.changed.delete(id);
  }

  /** A pickup that took only part of a stack. */
  setQty(id: number, qty: number) {
    const i = this.items.get(id);
    if (!i) return;
    i.qty = qty;
    this.changed.add(id);
  }

  near(x: number, z: number, radius: number, visit: (i: WorldItem) => void) {
    const c0 = Math.floor((x - radius) / CELL),
      c1 = Math.floor((x + radius) / CELL),
      r0 = Math.floor((z - radius) / CELL),
      r1 = Math.floor((z + radius) / CELL);
    for (let a = c0; a <= c1; a++)
      for (let b = r0; b <= r1; b++) {
        const cell = this.cells.get((a + 512) * 1024 + b + 512);
        if (!cell) continue;
        for (const id of cell) {
          const i = this.items.get(id)!;
          if ((i.x - x) ** 2 + (i.z - z) ** 2 <= radius * radius) visit(i);
        }
      }
  }

  /** Clear the per-tick change list (after every view has been built). */
  flush() {
    this.changed.clear();
  }

  wasChanged(id: number) {
    return this.changed.has(id);
  }
}

/**
 * What one seat has been told about the loot. `diff` returns rows to add (new, or changed) and
 * ids to forget (gone, or out of range with some hysteresis so walking along the edge does not
 * resend items every tick).
 */
export class LootSync {
  private known = new Set<number>();
  diff(world: LootWorld, x: number, z: number) {
    const add: LootRow[] = [],
      del: number[] = [];
    const inRange = new Set<number>();
    world.near(x, z, LOOT_SEND_M, (i) => {
      inRange.add(i.id);
      if (!this.known.has(i.id) || world.wasChanged(i.id)) add.push(lootRow(i));
    });
    for (const id of this.known) {
      const i = world.items.get(id);
      if (!i) del.push(id);
      else if (!inRange.has(id) && Math.hypot(i.x - x, i.z - z) > LOOT_SEND_M + 15) del.push(id);
    }
    for (const id of del) this.known.delete(id);
    for (const r of add) this.known.add(r[0]);
    return { add, del };
  }
  reset() {
    this.known.clear();
  }
}
