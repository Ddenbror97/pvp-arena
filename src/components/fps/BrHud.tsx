import { useEffect, useRef, useState } from "react";
import type { BrAct } from "@/lib/fps/br/actions";
import type { BrFeed, BrHud } from "@/lib/fps/br/br-arena";
import type { EquipSlot } from "@/lib/fps/br/inventory";
import {
  INVENTORY,
  ITEMS,
  RARITY,
  type ItemDef,
  type ItemId,
  type OpticDef,
  type WeaponDef,
} from "@/lib/fps/br/items";
import type { BrKitView } from "@/lib/fps/br/match";
import { PERK_IDS, PERKS, type PerkId } from "@/lib/fps/br/perks";

/**
 * Battle royale HUD and inventory (LOOT-SPEC §12–17): survival status, hotbar, ammunition,
 * pickup prompt, notifications, kill feed, hit markers, the scope view and the I inventory.
 * Every number comes from the server's loadout (`kit`) and the item table (items.ts); nothing
 * here decides what the player owns.
 */
const def = (id: string) => ITEMS[id as ItemId] as ItemDef;
const rarityColor = (id: string) => RARITY[def(id).rarity].color;
const count = (kit: BrKitView, id: string) =>
  kit.bag.reduce((n, s) => n + (s.item === id ? s.qty : 0), 0);

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  return (
    <span className="br-bar">
      <i
        style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: tone }}
      />
    </span>
  );
}

function ArmourPiece({
  label,
  piece,
}: {
  label: string;
  piece: { item: string; durability: number } | null;
}) {
  const d = piece ? (def(piece.item) as { level: number; durability: number }) : null;
  return (
    <div
      className={`br-armour ${piece ? "" : "empty"}`}
      title={piece ? def(piece.item).name : `No ${label}`}
    >
      <b style={piece ? { color: rarityColor(piece.item) } : undefined}>
        {d ? `${label}${d.level}` : label}
      </b>
      <Bar value={piece?.durability ?? 0} max={d?.durability ?? 1} tone="#cfd6c5" />
    </div>
  );
}

/** Bottom-left survival status, bottom-centre hotbar, bottom-right ammunition. */
export function BrStatus({ hud }: { hud: BrHud }) {
  const kit = hud.kit;
  const car = hud.vehicle;
  if (!kit || !hud.onFoot) return null;
  const hpTone = kit.hp > 60 ? "#7fd36b" : kit.hp > 30 ? "#e5c04b" : "#e2574c";
  const gun = kit.active >= 0 ? kit.guns[kit.active] : null;
  const gd = gun ? (def(gun.item) as WeaponDef) : null;
  const reserve = gd ? count(kit, gd.ammo) : 0;
  const hot = [
    {
      key: "1",
      label: kit.guns[0] ? def(kit.guns[0].item).name : "—",
      sub: kit.guns[0] ? `${kit.guns[0].mag}` : "",
      on: kit.active === 0,
    },
    {
      key: "2",
      label: kit.guns[1] ? def(kit.guns[1].item).name : "—",
      sub: kit.guns[1] ? `${kit.guns[1].mag}` : "",
      on: kit.active === 1,
    },
    {
      key: "3",
      label: "Bandage",
      sub: `×${count(kit, "bandage")}`,
      on: kit.heal?.item === "bandage",
    },
    {
      key: "4",
      label: hud.nade ? def(`grenade-${hud.nade}`).name.replace(" Grenade", "") : "Grenades",
      sub: hud.nade
        ? `×${count(kit, `grenade-${hud.nade}`)}`
        : `×${count(kit, "grenade-he") + count(kit, "grenade-smoke") + count(kit, "grenade-fire")}`,
      on: !!hud.nade,
    },
    { key: "5", label: "Medkit", sub: `×${count(kit, "medkit")}`, on: kit.heal?.item === "medkit" },
  ];
  return (
    <>
      <div className="br-status" aria-label="Health and armour">
        <div className="br-hp">
          <b>{Math.ceil(kit.hp)}</b>
          <Bar value={kit.hp} max={INVENTORY.maxHealth} tone={hpTone} />
        </div>
        <div className="br-armour-row">
          <ArmourPiece label="H" piece={kit.helmet} />
          <ArmourPiece label="K" piece={kit.vest} />
          {kit.plates.map((p, i) => (
            <ArmourPiece key={i} label="P" piece={p} />
          ))}
        </div>
      </div>
      <div className="br-hotbar">
        {hot.map((h) => (
          <div key={h.key} className={`br-hot ${h.on ? "on" : ""}`}>
            <kbd>{h.key}</kbd>
            <span>{h.label}</span>
            <small>{h.sub}</small>
          </div>
        ))}
      </div>
      {car && (
        <div className="br-vehicle" role="status">
          <b>{car.name.toUpperCase()}</b>
          <span>
            <em>{Math.round(car.kmh)}</em> km/h
          </span>
          <Bar
            value={car.health}
            max={car.max}
            tone={car.health / car.max > 0.4 ? "#cfd6c5" : "#e2574c"}
          />
          <small>W/S drive · A/D steer · Space brake · E exit</small>
        </div>
      )}
      {gun && gd && !car && (
        <div className="br-ammo">
          <b>{hud.mag ?? gun.mag}</b>
          <span>/ {reserve}</span>
          <small>
            {gd.name}
            {gun.optic ? ` · ${def(gun.optic).name}` : ""}
            {gun.muzzle ? ` · ${def(gun.muzzle).name}` : ""}
          </small>
        </div>
      )}
    </>
  );
}

export function BrCentre({
  hud,
  hit,
}: {
  hud: BrHud;
  hit: { at: number; head: boolean; kill: boolean } | null;
}) {
  const now = performance.now();
  const showHit = hit && now - hit.at < 220;
  const action = hud.heal ?? (hud.reload ? { item: "Reloading", ...hud.reload } : null);
  const aimed = hud.aim > 0.6;
  return (
    <>
      {!hud.scope && hud.onFoot && !aimed && <div className="br-cross" aria-hidden />}
      {hud.sight && <div className={`br-sight ${hud.sight}`} aria-hidden />}
      {showHit && (
        <div
          className={`br-hitmark ${hit!.head ? "head" : ""} ${hit!.kill ? "kill" : ""}`}
          aria-hidden
        />
      )}
      {action && (
        <div className="br-progress" role="status">
          <span>{action.item}</span>
          <Bar value={action.progress} max={1} tone="#9fd27e" />
          <small>{action.left.toFixed(1)} s</small>
        </div>
      )}
      {hud.prompt && !action && (
        <div className="br-prompt" style={{ borderLeftColor: hud.prompt.color }}>
          <b>{hud.prompt.name}</b>
          {hud.prompt.rarity && (
            <span style={{ color: hud.prompt.color }}>{hud.prompt.rarity}</span>
          )}
          <small>{hud.prompt.detail}</small>
          <em>
            <kbd>E</kbd>{" "}
            {hud.prompt.kind === "exit"
              ? "Exit"
              : hud.prompt.kind === "enter"
                ? hud.prompt.name === "Motorbike"
                  ? "Ride"
                  : "Enter"
                : "Pick up"}
          </em>
        </div>
      )}
      {hud.scope && <BrScope zoom={hud.scope.zoom} reticle={hud.scope.reticle} />}
    </>
  );
}

/** Full-screen scope: dark surround, the lens, the reticle (the pack's crosshair at the centre). */
function BrScope({ zoom, reticle }: { zoom: number; reticle: OpticDef["reticle"] | "awp" }) {
  return (
    <div className={`br-scope ${reticle}`} aria-hidden>
      <div className="br-scope-lens">
        <i className="h" />
        <i className="v" />
        {reticle === "mil-dot" &&
          [-4, -3, -2, -1, 1, 2, 3, 4].map((k) => (
            <s key={k} style={{ "--k": k } as React.CSSProperties} />
          ))}
        <b className="br-scope-centre" />
      </div>
      <small>{zoom}×</small>
    </div>
  );
}

type Toast = { id: number; text: string; tone: "ok" | "warn"; at: number };
type Kill = { id: number; text: string; mine: boolean; at: number };

/** Notifications (pickups, refusals), the kill feed and the damage direction. */
export function useBrFeed() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [kills, setKills] = useState<Kill[]>([]);
  const [hurt, setHurt] = useState<{ at: number; from: number } | null>(null);
  const [hit, setHit] = useState<{ at: number; head: boolean; kill: boolean } | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [recon, setRecon] = useState<Array<{ id: number; angle: number; at: number }>>([]);
  const id = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      const now = performance.now();
      setToasts((ts) =>
        ts.some((x) => now - x.at > 2600) ? ts.filter((x) => now - x.at <= 2600) : ts,
      );
      setKills((ks) =>
        ks.some((x) => now - x.at > 7000) ? ks.filter((x) => now - x.at <= 7000) : ks,
      );
    }, 250);
    return () => clearInterval(t);
  }, []);
  const onFeed = (e: BrFeed) => {
    const now = performance.now();
    if (e.kind === "toast")
      setToasts((ts) => [
        ...ts.slice(-3),
        { id: id.current++, text: e.text, tone: e.tone, at: now },
      ]);
    else if (e.kind === "kill")
      setKills((ks) => [
        ...ks.slice(-4),
        { id: id.current++, text: e.text, mine: e.mine, at: now },
      ]);
    else if (e.kind === "hurt") setHurt({ at: now, from: e.from });
    else if (e.kind === "hit") setHit({ at: now, head: e.head, kill: e.kill });
    else if (e.kind === "eliminated") setOut(e.by);
    else if (e.kind === "recon")
      setRecon((rs) => [
        ...rs.filter((r) => now - r.at < 1500).slice(-5),
        { id: id.current++, angle: e.angle, at: now },
      ]);
  };
  return { toasts, kills, hurt, hit, out, recon, onFeed };
}

export function BrFeedView({ feed }: { feed: ReturnType<typeof useBrFeed> }) {
  const now = performance.now();
  return (
    <>
      <div className="br-toasts" aria-live="polite">
        {feed.toasts.map((t) => (
          <div key={t.id} className={`br-toast ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
      <div className="br-killfeed">
        {feed.kills.map((k) => (
          <div key={k.id} className={k.mine ? "mine" : ""}>
            {k.text}
          </div>
        ))}
      </div>
      <BrRecon marks={feed.recon} />
      {feed.hurt && now - feed.hurt.at < 900 && (
        <div
          className="br-hurt"
          style={{ transform: `translate(-50%, -50%) rotate(${-feed.hurt.from}rad)` }}
          aria-hidden
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------ inventory (I)

type Selection = { kind: "bag"; index: number } | { kind: "equip"; slot: EquipSlot } | null;

function stats(id: string, extra: { durability?: number; mag?: number; qty?: number }) {
  const d = def(id);
  const rows: Array<[string, string]> = [["Rarity", RARITY[d.rarity].label]];
  switch (d.category) {
    case "weapon": {
      const w = d as WeaponDef;
      rows.push(
        ["Ammunition", def(w.ammo).name],
        ["Magazine", `${extra.mag ?? 0} / ${w.magazine}`],
        ["Damage (chest)", `${w.damage.chest}`],
        ["Reload", `${(w.reloadMs / 1000).toFixed(1)} s`],
      );
      break;
    }
    case "helmet":
    case "vest":
    case "plate":
      rows.push(
        ["Protection", `${Math.round(d.reduction * 100)} %`],
        ["Durability", `${Math.round(extra.durability ?? d.durability)} / ${d.durability}`],
      );
      break;
    case "heal":
      rows.push(
        ["Heals", `${d.heal} (up to ${d.upTo})`],
        ["Use time", `${d.useMs / 1000} s`],
        ["Quantity", `${extra.qty ?? 1}`],
      );
      break;
    case "ammo":
    case "grenade":
      rows.push(["Quantity", `${extra.qty ?? 1}`]);
      break;
    case "backpack":
      rows.push(["Capacity", `${d.slots} slots`]);
      break;
    case "optic":
      rows.push(["Zoom", `${d.zoom}×`], ["Fits", "AK-47, M4, AWP"]);
      break;
    case "muzzle":
      rows.push(
        ["Shot heard at", `${Math.round(d.hearScale * 100)} % range`],
        ["Recoil", `${Math.round(d.recoilScale * 100)} %`],
        ["Fits", "AK-47, M4, AWP"],
      );
      break;
  }
  return rows;
}

function equipped(
  kit: BrKitView,
  slot: EquipSlot,
): { item: string; durability?: number; mag?: number } | null {
  switch (slot) {
    case "gun0":
    case "gun1":
      return kit.guns[slot === "gun0" ? 0 : 1] ?? null;
    case "helmet":
      return kit.helmet;
    case "vest":
      return kit.vest;
    case "plate0":
    case "plate1":
    case "plate2":
      return kit.plates[+slot.slice(5)] ?? null;
    case "backpack":
      return kit.backpack ? { item: kit.backpack } : null;
    default: {
      const g = kit.guns[+slot.slice(-1)];
      const id = g ? (slot.startsWith("optic") ? g.optic : g.muzzle) : null;
      return id ? { item: id } : null;
    }
  }
}

const SLOT_LABEL: Record<EquipSlot, string> = {
  gun0: "Primary",
  gun1: "Secondary",
  helmet: "Helmet",
  vest: "Kevlar",
  plate0: "Plate 1",
  plate1: "Plate 2",
  plate2: "Plate 3",
  backpack: "Backpack",
  optic0: "Optic",
  optic1: "Optic",
  muzzle0: "Muzzle",
  muzzle1: "Muzzle",
};

export function BrInventory({
  kit,
  act,
  close,
}: {
  kit: BrKitView;
  act: (a: BrAct) => void;
  close: () => void;
}) {
  const [sel, setSel] = useState<Selection>(null);
  const picked =
    sel?.kind === "bag"
      ? (kit.bag[sel.index] ?? null)
      : sel?.kind === "equip"
        ? equipped(kit, sel.slot)
        : null;
  useEffect(() => {
    if (sel && !picked) setSel(null);
  }, [sel, picked]);
  const slotView = (slot: EquipSlot) => {
    const e = equipped(kit, slot);
    const d = e ? def(e.item) : null;
    const full = d && "durability" in d ? d.durability : 0;
    return (
      <button
        key={slot}
        className={`br-slot ${e ? "" : "empty"} ${sel?.kind === "equip" && sel.slot === slot ? "sel" : ""}`}
        style={e ? { borderColor: rarityColor(e.item) } : undefined}
        onClick={() => setSel(e ? { kind: "equip", slot } : null)}
      >
        <small>{SLOT_LABEL[slot]}</small>
        <b>{d ? d.name : "Empty"}</b>
        {e && full > 0 && <Bar value={e.durability ?? full} max={full} tone="#cfd6c5" />}
        {e && "mag" in e && e.mag !== undefined && <em>{e.mag}</em>}
      </button>
    );
  };
  const d = picked ? def(picked.item) : null;
  const actions: Array<[string, BrAct]> = [];
  if (picked && sel?.kind === "bag" && d) {
    const index = sel.index;
    if (d.category === "heal")
      actions.push([`Use`, { act: "heal", item: picked.item as "bandage" | "medkit" }]);
    if (d.category === "helmet" || d.category === "vest")
      actions.push(["Equip", { act: "equip", index, target: 0 }]);
    if (d.category === "plate")
      for (const t of [0, 1, 2])
        actions.push([`Equip in plate ${t + 1}`, { act: "equip", index, target: t }]);
    if (d.category === "optic" || d.category === "muzzle")
      for (const t of [0, 1])
        if (kit.guns[t])
          actions.push([
            `Attach to ${def(kit.guns[t]!.item).name}`,
            { act: "equip", index, target: t },
          ]);
    if ((picked as { qty: number }).qty > 1)
      actions.push(["Drop one", { act: "dropBag", index, qty: 1 }]);
    actions.push(["Drop", { act: "dropBag", index }]);
  } else if (picked && sel?.kind === "equip") {
    if (!sel.slot.startsWith("gun") && sel.slot !== "backpack")
      actions.push(["Move to bag", { act: "unequip", slot: sel.slot }]);
    actions.push(["Drop", { act: "dropEquip", slot: sel.slot }]);
  }
  return (
    <div className="br-inventory" role="dialog" aria-label="Inventory">
      <header>
        <h2>Inventory</h2>
        <span>
          {kit.bag.length} / {kit.capacity} slots
        </span>
        <button onClick={close} aria-label="Close inventory">
          I / Esc
        </button>
      </header>
      <section className="br-equip">
        <h3>Equipment</h3>
        <div className="br-guns">
          {(["gun0", "gun1"] as const).map((g, i) => (
            <div key={g} className="br-gun">
              {slotView(g)}
              <div className="br-gun-att">
                {slotView(`optic${i}` as EquipSlot)}
                {slotView(`muzzle${i}` as EquipSlot)}
              </div>
            </div>
          ))}
        </div>
        <div className="br-wear">{(["helmet", "vest", "backpack"] as const).map(slotView)}</div>
        <div className="br-plates">{(["plate0", "plate1", "plate2"] as const).map(slotView)}</div>
      </section>
      <section className="br-bag">
        <h3>Backpack</h3>
        <div className="br-grid">
          {Array.from({ length: kit.capacity }, (_, i) => {
            const s = kit.bag[i];
            if (!s) return <div key={i} className="br-cell empty" />;
            const sd = def(s.item);
            return (
              <button
                key={i}
                className={`br-cell ${sel?.kind === "bag" && sel.index === i ? "sel" : ""}`}
                style={{ borderColor: rarityColor(s.item) }}
                onClick={() => setSel({ kind: "bag", index: i })}
              >
                <b>{sd.name}</b>
                <small>{sd.category}</small>
                {s.qty > 1 && <em>×{s.qty}</em>}
                {s.durability !== undefined && "durability" in sd && (
                  <Bar value={s.durability} max={sd.durability} tone="#cfd6c5" />
                )}
              </button>
            );
          })}
        </div>
      </section>
      <section className="br-inspect">
        {picked && d ? (
          <>
            <h3 style={{ color: rarityColor(picked.item) }}>{d.name}</h3>
            <p>{d.short}</p>
            <dl>
              {stats(
                picked.item,
                picked as { durability?: number; mag?: number; qty?: number },
              ).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="br-actions">
              {actions.map(([label, a]) => (
                <button key={label} onClick={() => act(a)}>
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="br-hint-inline">Select an item to inspect, equip, use or drop it.</p>
        )}
      </section>
      <footer>
        <span>Health {Math.ceil(kit.hp)}</span>
        <span>
          Helmet {kit.helmet ? `L${(def(kit.helmet.item) as { level: number }).level}` : "—"}
        </span>
        <span>Kevlar {kit.vest ? `L${(def(kit.vest.item) as { level: number }).level}` : "—"}</span>
        <span>Plates {kit.plates.filter(Boolean).length} / 3</span>
        <span>
          Bag {kit.bag.length} / {kit.capacity}
        </span>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------ zone, minimap, end (Phase 3)

const HALF = 5000;
const toMap = (v: number) => ((v + HALF) / (2 * HALF)) * 256;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Top-right: the island with the circles and you, players left, the zone's timer. */
export function BrZone({ hud, map }: { hud: BrHud; map: string | null }) {
  const z = hud.zone;
  return (
    <>
      <div className="br-map" aria-label="Map">
        {map && <img src={map} alt="" />}
        <svg viewBox="0 0 256 256">
          {z && (
            <>
              <circle
                cx={toMap(z.x)}
                cy={toMap(z.z)}
                r={(z.r / (2 * HALF)) * 256}
                className="now"
              />
              <circle
                cx={toMap(z.nx)}
                cy={toMap(z.nz)}
                r={(z.nr / (2 * HALF)) * 256}
                className="next"
              />
            </>
          )}{" "}
          {hud.drops.map((d, i) => (
            <rect
              key={i}
              x={toMap(d.x) - 3}
              y={toMap(d.z) - 3}
              width={6}
              height={6}
              className={`drop ${d.falling ? "falling" : ""}`}
            />
          ))}
          <g
            transform={`translate(${toMap(hud.me.x)} ${toMap(hud.me.z)}) rotate(${(-hud.me.yaw * 180) / Math.PI})`}
          >
            <path d="M0 -6 L4 4 L0 2 L-4 4 Z" className="me" />
          </g>
        </svg>
      </div>
      <div className="br-zoneinfo">
        {hud.alive !== null && (
          <span>
            <b>{hud.alive}</b> alive
          </span>
        )}
        {z && z.left !== null && (
          <span className={z.shrinking ? "shrink" : ""}>
            {z.shrinking ? "Zone closing" : `Phase ${z.phase} · closes in`} {clock(z.left)}
          </span>
        )}
      </div>
      {z?.outside && (
        <div className="br-gas" role="alert">
          Outside the zone · −{z.dps} HP/s
        </div>
      )}
    </>
  );
}

/** Eliminated (spectating) and the end of the match. */
export function BrEnd({
  hud,
  out,
  leave,
}: {
  hud: BrHud;
  out: string | null;
  leave: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  const r = hud.result;
  if (r) {
    const won = r.place === 1 && !hud.kit?.dead;
    return (
      <div className="duel-game-overlay">
        <section className="duel-match-card br-end">
          <h1>{won ? "Winner — last one standing" : `#${r.place}`}</h1>
          <p>
            {won
              ? "You won the match."
              : r.winnerName
                ? `${r.winnerName} won the match.`
                : "Nobody survived the zone."}
          </p>
          <p>
            {r.kills} kill{r.kills === 1 ? "" : "s"} · {r.damage} damage
          </p>
          {leave}
        </section>
      </div>
    );
  }
  if (!out || hidden)
    return hud.watch ? <div className="br-watch">Watching {hud.watch.name}</div> : null;
  return (
    <div className="duel-game-overlay">
      <section className="duel-match-card br-end">
        <h1>Eliminated.</h1>
        <p>
          By {out} · {hud.kit?.kills ?? 0} kill{hud.kit?.kills === 1 ? "" : "s"}
          {hud.alive !== null ? ` · ${hud.alive} left` : ""}
        </p>
        <div className="br-end-actions">
          {hud.watch && (
            <button className="duel-secondary" onClick={() => setHidden(true)}>
              Watch {hud.watch.name}
            </button>
          )}
          {leave}
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ tactical tablet (T)

/** Small line icons, one per perk (no external art). */
const PERK_ICON: Record<PerkId, string> = {
  "deadly-bullets": "M4 12h10l3-3 3 3-3 3-3-3M4 9v6",
  "faster-reload": "M6 5h6v14H6zM14 8l4 4-4 4M18 12h-6",
  "ammo-efficiency": "M8 4h3v12H8zM13 4h3v12h-3zM6 19h12",
  "armor-specialist": "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z",
  "fast-revive": "M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z",
  adrenaline: "M13 3L6 13h5l-1 8 7-10h-5z",
  "combat-chip": "M5 7h14v10H5zM8 4v3M12 4v3M16 4v3M8 17v3M12 17v3M16 17v3",
  "recon-chip": "M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12l6-4M12 4v2",
  "survival-chip": "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z",
  "scavenger-chip": "M5 8h14l-1 11H6zM9 8V6a3 3 0 0 1 6 0v2",
};

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
  const [slot, setSlot] = useState(() => {
    const free = t?.active.findIndex((p) => !p) ?? 0;
    return free >= 0 ? free : 0;
  });
  if (!t) return null;
  const active = t.active.filter(Boolean).length;
  return (
    <div className="br-tablet" role="dialog" aria-label="Tactical tablet">
      <header>
        <div>
          <h2>Tactical system</h2>
          <small>Field upgrade terminal</small>
        </div>
        <dl>
          <div>
            <dt>Tactical Data</dt>
            <dd>{t.data}</dd>
          </div>
          <div>
            <dt>Unlocked</dt>
            <dd>{t.unlocked.length} / 10</dd>
          </div>
          <div>
            <dt>Active</dt>
            <dd>{active} / 3</dd>
          </div>
        </dl>
        <button onClick={close} aria-label="Close tablet">
          T / Esc
        </button>
      </header>
      <section className="br-tablet-slots">
        {t.active.map((p, i) => (
          <button
            key={i}
            className={`${slot === i ? "sel" : ""} ${p ? "on" : ""}`}
            onClick={() => setSlot(i)}
          >
            <small>
              Slot 0{i + 1} — {p ? "Active" : "Empty"}
            </small>
            <b>{p ? PERKS[p].name : "—"}</b>
            {p && (
              <em
                onClick={(e) => {
                  e.stopPropagation();
                  act({ act: "perk", op: "deactivate", slot: i });
                }}
              >
                Remove
              </em>
            )}
          </button>
        ))}
      </section>
      <section className="br-perks">
        {PERK_IDS.map((id) => {
          const p = PERKS[id];
          const unlocked = t.unlocked.includes(id);
          const on = t.active.includes(id);
          const state = on
            ? "Active"
            : unlocked
              ? p.needs
                ? "Unavailable"
                : "Unlocked"
              : t.data >= p.cost
                ? "Available"
                : "Insufficient data";
          return (
            <article key={id} className={`br-perk ${state.toLowerCase().replace(/ /g, "-")}`}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d={PERK_ICON[id]} />
              </svg>
              <div>
                <small>
                  {p.n} · {p.category} ·{" "}
                  <span style={{ color: RARITY[p.rarity].color }}>{RARITY[p.rarity].label}</span>
                </small>
                <b>{p.name}</b>
                <p>{p.description}</p>
                {p.needs && <p className="needs">{p.needs}.</p>}
              </div>
              <footer>
                <span>{state}</span>
                {!unlocked && (
                  <button
                    disabled={t.data < p.cost}
                    onClick={() => act({ act: "perk", op: "unlock", perk: id })}
                  >
                    Unlock · {p.cost} data
                  </button>
                )}
                {unlocked && !on && !p.needs && (
                  <button onClick={() => act({ act: "perk", op: "activate", perk: id, slot })}>
                    {t.active[slot] ? `Replace slot 0${slot + 1}` : `Activate in slot 0${slot + 1}`}
                  </button>
                )}
              </footer>
            </article>
          );
        })}
      </section>
      <footer className="br-tablet-foot">
        Choose a slot, then activate a perk into it. Only 3 perks work at once, and only while you
        carry the tablet. Tactical Data: Data Drives and eliminations.
      </footer>
    </div>
  );
}

/** Recon Chip: a short-lived marker toward nearby gunfire. */
export function BrRecon({ marks }: { marks: Array<{ id: number; angle: number; at: number }> }) {
  const now = performance.now();
  return (
    <>
      {marks
        .filter((m) => now - m.at < 1500)
        .map((m) => (
          <div
            key={m.id}
            className="br-recon"
            style={{ transform: `translate(-50%, -50%) rotate(${m.angle}rad)` }}
          />
        ))}
    </>
  );
}
