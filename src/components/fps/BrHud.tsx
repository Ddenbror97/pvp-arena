import { useEffect, useRef, useState } from "react";
import type { BrAct } from "@/lib/fps/br/actions";
import type { BrFeed, BrHud, BrKillWeapon, BrNearby } from "@/lib/fps/br/br-arena";
import { WeaponIcon } from "./WeaponIcon";
import type { EquipSlot } from "@/lib/fps/br/inventory";
import {
  INVENTORY,
  fitsGun,
  ITEMS,
  magSize,
  RARITY,
  type ItemDef,
  type ItemId,
  type OpticDef,
  type WeaponDef,
  type WeaponId,
} from "@/lib/fps/br/items";
import { BR_RULES, type BrKitView } from "@/lib/fps/br/match";
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

/**
 * Our own guns as HUD silhouettes (owner, 2026-11-04: the icons should look like the weapons we
 * have): the inventory renders (scripts/br/icons) recoloured to the HUD's light tone, so the
 * hotbar, the switch card and the kill feed show the real guns' shapes.
 */
function GunGlyph({ item }: { item: string }) {
  const d = ITEMS[item as ItemId];
  return (
    <img
      className={`br-gun-glyph ${(d as WeaponDef | undefined)?.slot === "pistol" ? "is-pistol" : ""}`}
      src={`/fps/br/icons/${item}.webp`}
      alt={d?.name ?? item}
      draggable={false}
    />
  );
}

/** Fire mode of a weapon (the AWP is bolt-action, the Deagle semi-automatic, the rest auto). */
const fireMode = (w: WeaponDef) => (w.model === "awp" ? "BOLT" : w.semiAuto ? "SEMI" : "AUTO");

/**
 * Bottom-left survival status (health bar, armour pieces), bottom-centre hotbar, bottom-right
 * weapon and ammunition (the magazine dominant, reserve and fire mode small), and a short
 * weapon-switch card when the active weapon changes. Owner's UI spec §2, §6.
 */
/**
 * Hotbar silhouettes (original), in hotbar order: a rifle outline for empty gun slots, a pistol
 * outline for the empty pistol slot, the Karambit (ring and hooked blade), a grenade, a medkit,
 * a bandage roll.
 */
const SLOT_ICON = [
  "M2 11h12l2-2h7l1 1h0v4h-8l-3 2 1 4h-3l-2-4H2z",
  "M2 11h12l2-2h7l1 1h0v4h-8l-3 2 1 4h-3l-2-4H2z",
  "M3 7h19v5h-9l-1 2h-2l1 6H6l1-8H3z",
  "M6 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zm0 2a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM9.2 10.6C14 11 19.5 9.3 24 4.5c-.6 6.4-6.7 11.6-14.6 10.6l.4-1.9c4.3.2 7.6-1 10-3.2-3.1 1.4-6.5 1.9-10.6 1.6z",
  "M12 3h2v3h-2zM9 7h8v2a6 6 0 0 1 2 4.5V17a6 6 0 0 1-12 0v-3.5A6 6 0 0 1 9 9z",
  "M9 4h8v3h5v13H4V7h5zm2 2v1h4V6zm1 4v3H9v2h3v3h2v-3h3v-2h-3v-3z",
  "M5 8h12a4 4 0 0 1 0 8H5a4 4 0 0 1 0-8zm0 3v2h12v-2z",
];

export function BrStatus({ hud }: { hud: BrHud }) {
  const kit = hud.kit;
  const car = hud.vehicle;
  // Weapon switch card: shown for 1.4 s when the active slot or its weapon changes (the
  // Karambit, 4, whenever no gun is drawn; not on the first loadout).
  const active = !kit
    ? ""
    : kit.active >= 0
      ? `${kit.active}:${kit.guns[kit.active]?.item ?? ""}`
      : "knife";
  const [switched, setSwitched] = useState<{ key: string; at: number } | null>(null);
  const lastActive = useRef(active);
  useEffect(() => {
    if (active && lastActive.current && active !== lastActive.current)
      setSwitched({ key: active, at: performance.now() });
    lastActive.current = active;
  }, [active]);
  useEffect(() => {
    if (!switched) return;
    const t = setTimeout(() => setSwitched(null), 1400);
    return () => clearTimeout(t);
  }, [switched]);
  if (!kit || !hud.onFoot) return null;
  const hp = Math.ceil(kit.hp);
  const hpTone = kit.hp > 60 ? "#e9eef0" : kit.hp > 30 ? "#f0c24b" : "#ff5a4e";
  const gun = kit.active >= 0 ? kit.guns[kit.active] : null;
  const gd = gun ? (def(gun.item) as WeaponDef) : null;
  const reserve = gd ? count(kit, gd.ammo) : 0;
  const mag = hud.mag ?? gun?.mag ?? 0;
  const low = !!gun && mag <= Math.max(1, Math.floor(magSize(gun) * 0.25));
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
    // The pistol's own slot (the Desert Eagle).
    {
      key: "3",
      label: kit.guns[2] ? def(kit.guns[2].item).name : "—",
      sub: kit.guns[2] ? `${kit.guns[2].mag}` : "",
      on: kit.active === 2,
    },
    // The Karambit: always carried, drawn whenever no gun (or grenade) is.
    { key: "4", label: "Karambit", sub: "", on: kit.active === -1 && !hud.nade },
    {
      key: "5",
      label: hud.nade ? def(`grenade-${hud.nade}`).name.replace(" Grenade", "") : "Grenade",
      sub: hud.nade
        ? `${count(kit, `grenade-${hud.nade}`)}`
        : `${count(kit, "grenade-he") + count(kit, "grenade-smoke") + count(kit, "grenade-fire")}`,
      on: !!hud.nade,
    },
    { key: "6", label: "Medkit", sub: `${count(kit, "medkit")}`, on: kit.heal?.item === "medkit" },
    {
      key: "7",
      label: "Bandage",
      sub: `${count(kit, "bandage")}`,
      on: kit.heal?.item === "bandage",
    },
  ];
  const switchGun = switched && gun && gd;
  const switchKnife = switched?.key === "knife" && kit.active === -1;
  // Worn armour in the HUD's small caps ("HELMET 2 · VEST 1 · PLATES 2"), as 5v5 shows KEVLAR.
  const lvl = (w: { item: string } | null) => (w ? (def(w.item) as { level?: number }).level : 0);
  // Plates only protect inside a vest.
  const plates = kit.vest ? kit.plates.filter(Boolean).length : 0;
  const worn = [
    kit.helmet ? `HELMET ${lvl(kit.helmet)}` : "",
    kit.vest ? `VEST ${lvl(kit.vest)}` : "",
    plates ? `PLATES ${plates}` : "",
  ].filter(Boolean);
  /** Hotbar positions 0–2 are the gun slots (main, main, pistol); the knife follows. */
  const GUN_SLOTS = 3;
  return (
    <>
      {/* The 1v1 / 5v5 bottom HUD (duel.css): health left, ammo right, on one dark gradient. */}
      <footer className={`duel-hud-bottom br-bottom ${car ? "in-car" : ""}`}>
        <div
          className={`duel-health ${kit.hp <= 30 ? "br-low" : ""}`}
          aria-label="Health and armour"
        >
          <small>HEALTH</small>
          <small className="br-worn">{worn.length ? worn.join(" · ") : "NO ARMOUR"}</small>
          <strong style={{ color: kit.hp <= 30 ? hpTone : undefined }}>
            {hp}
            <span>/{INVENTORY.maxHealth}</span>
          </strong>
          <div>
            <i style={{ width: `${Math.max(0, Math.min(100, kit.hp))}%` }} />
          </div>
        </div>
        <div className="br-slots" aria-label="Hotbar">
          {hot.map((h, i) => {
            const gunSlot = i < GUN_SLOTS;
            const g = gunSlot ? kit.guns[i as 0 | 1 | 2] : null;
            const empty = gunSlot ? !g : i === GUN_SLOTS ? false : h.sub === "0";
            return (
              <span
                key={h.key}
                className={`br-slot-hud ${h.on ? "is-drawn" : ""} ${empty ? "is-empty" : ""} ${gunSlot ? "is-gun" : ""} ${i === 2 ? "is-pistol" : ""}`}
                aria-label={`${h.key}: ${h.label}`}
              >
                <kbd>{h.key}</kbd>
                {g ? (
                  <GunGlyph item={g.item} />
                ) : (
                  <svg viewBox="0 0 26 24" aria-hidden>
                    <path d={SLOT_ICON[i] ?? SLOT_ICON[0]!} fillRule="evenodd" />
                  </svg>
                )}
                <small>
                  {gunSlot
                    ? g
                      ? def(g.item).name.toUpperCase()
                      : i === 2
                        ? "PISTOL"
                        : "EMPTY"
                    : h.label.toUpperCase()}
                </small>
                {!gunSlot && Number(h.sub) > 0 ? <b>{h.sub}</b> : null}
              </span>
            );
          })}
        </div>
        <div className={`duel-ammo ${low ? "br-low" : ""}`}>
          {gun && gd && !car ? (
            <>
              <small>
                {gd.name.toUpperCase()} · {fireMode(gd)}
                {gun.optic ? ` · ${def(gun.optic).name.toUpperCase()}` : ""}
                {gun.muzzle ? ` · ${def(gun.muzzle).short.toUpperCase()}` : ""}
                {gun.extMag ? " · EXT MAG" : ""}
              </small>
              <strong>
                {mag}
                <span>/ {reserve}</span>
              </strong>
              {hud.reload ? (
                <em>RELOADING</em>
              ) : low ? (
                <em className="br-low-ammo">LOW AMMO</em>
              ) : null}
            </>
          ) : !car ? (
            <>
              <small>KARAMBIT · {kit.guns.some(Boolean) ? "SLASH / STAB" : "FIND A WEAPON"}</small>
              <strong>
                ∞<span />
              </strong>
            </>
          ) : null}
        </div>
      </footer>
      {car && <BrSpeedometer car={car} />}
      {switchGun && (
        <div className="br-switch" key={switched.key} role="status">
          <kbd>{kit.active + 1}</kbd>
          <GunGlyph item={gun.item} />
          <b>{gd.name}</b>
          <small>
            {mag} / {reserve}
          </small>
        </div>
      )}
      {switchKnife && (
        <div className="br-switch" key="knife" role="status">
          <kbd>4</kbd>
          <WeaponIcon weapon="knife" />
          <b>Karambit</b>
          <small>SLASH · STAB · F INSPECT</small>
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
  const action = hud.heal;
  const aimed = hud.aim > 0.6;
  return (
    <>
      {!hud.scope && hud.onFoot && !hud.vehicle && !aimed && (
        <div className="br-cross" aria-hidden />
      )}
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
      {/* Driving: the vehicle panel already says "E exit"; the view stays clear. */}
      {hud.prompt && !action && hud.prompt.kind !== "exit" && (
        <div className="br-prompt" style={{ borderLeftColor: hud.prompt.color }}>
          <b>{hud.prompt.name}</b>
          {hud.prompt.rarity && (
            <span style={{ color: hud.prompt.color }}>{hud.prompt.rarity}</span>
          )}
          <small>{hud.prompt.detail}</small>
          <em>
            <kbd>E</kbd>{" "}
            {hud.prompt.kind === "enter"
              ? /bike/i.test(hud.prompt.name)
                ? "Ride"
                : "Enter"
              : hud.prompt.kind === "zip"
                ? "Use Zip-Line"
                : hud.prompt.kind === "ladder"
                  ? hud.prompt.detail.startsWith("Down")
                    ? "Climb Down"
                    : "Climb Ladder"
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
type Kill = {
  id: number;
  mine: boolean;
  at: number;
  killer: string | null;
  victim: string;
  weapon: BrKillWeapon;
  self: boolean;
};

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
        {
          id: id.current++,
          mine: e.mine,
          at: now,
          killer: e.killer,
          victim: e.victim,
          weapon: e.weapon,
          self: e.self,
        },
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
      <div className="br-killfeed" aria-live="polite">
        {feed.kills.map((k) => (
          <div
            key={k.id}
            className={`${k.mine ? "mine" : ""} ${now - k.at > 6000 ? "fading" : ""}`}
          >
            {k.killer && !k.self && <span className="who">{k.killer}</span>}
            <KillIcon weapon={k.weapon} />
            <span className="whom">{k.victim}</span>
            {k.self && <em>self</em>}
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

/** The kill feed's weapon: the arena's silhouettes, plus the gas and vehicles. */
function KillIcon({ weapon }: { weapon: BrKillWeapon }) {
  if (weapon === "gas")
    return (
      <svg className="br-kill-icon gas" viewBox="0 0 24 24" role="img" aria-label="Gas">
        <title>Gas</title>
        <path d="M4 15a4 4 0 0 1 3-6 6 6 0 0 1 11 1 3.5 3.5 0 0 1 1 7H7a3 3 0 0 1-3-2zM6 20h12" />
      </svg>
    );
  if (weapon === "fall")
    return (
      <svg className="br-kill-icon" viewBox="0 0 24 24" role="img" aria-label="Fall">
        <title>Fall</title>
        <path d="M4 4h8v6M12 10v10M8 16l4 4 4-4M4 20h3" />
      </svg>
    );
  if (weapon === "vehicle")
    return (
      <svg className="br-kill-icon" viewBox="0 0 24 24" role="img" aria-label="Vehicle">
        <title>Vehicle</title>
        <path d="M3 14l2-5h12l3 5v4H3zM6 18a2 2 0 1 0 4 0M14 18a2 2 0 1 0 4 0" />
      </svg>
    );
  if (
    weapon === "ak" ||
    weapon === "m4" ||
    weapon === "awp" ||
    weapon === "mp5" ||
    weapon === "deagle"
  )
    return <GunGlyph item={weapon === "ak" ? "ak47" : weapon} />;
  return <WeaponIcon weapon={weapon} />;
}

const BEARINGS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
/**
 * Top centre: the compass strip (where you look, the waypoint's bearing and distance) and the
 * match status: "32 ALIVE | ZONE 3 | 0:42" with the zone's state, and short notices when the
 * next zone is marked, the gas advances, the final circle starts (owner's spec §6, §8).
 */
export function BrTopStatus({ hud }: { hud: BrHud }) {
  const z = hud.zone;
  const final = !!z && z.phase >= z.of;
  const state = !z
    ? null
    : z.outside
      ? { cls: "out", text: "OUTSIDE THE SAFE ZONE" }
      : z.shrinking
        ? { cls: "adv", text: `GAS ADVANCING${z.left !== null ? ` — ${Math.ceil(z.left)}s` : ""}` }
        : final
          ? { cls: "final", text: "FINAL CIRCLE" }
          : { cls: "wait", text: "SAFE ZONE MARKED" };
  // A notice for a few seconds whenever the zone's state or phase changes.
  const key = z ? `${z.phase}:${z.shrinking ? 1 : 0}` : "";
  const [notice, setNotice] = useState<string | null>(null);
  const lastKey = useRef(key);
  useEffect(() => {
    if (!z || key === lastKey.current) return;
    lastKey.current = key;
    setNotice(
      z.shrinking
        ? `GAS ADVANCING — ${Math.ceil(z.left ?? 0)}s`
        : final
          ? "FINAL CIRCLE"
          : "SAFE ZONE MARKED",
    );
    const t = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(t);
  }, [key, z, final]);
  const deg = (hud.heading * 180) / Math.PI;
  return (
    <div className="br-top">
      <div className="br-compass" aria-label={`Heading ${Math.round(deg)}°`}>
        <div className="br-compass-strip" style={{ transform: `translateX(${-deg * 2}px)` }}>
          {Array.from({ length: 3 * 24 }, (_, i) => {
            const d = (i - 24) * 15;
            const n = ((d % 360) + 360) % 360;
            return (
              <span key={i} style={{ left: `${d * 2}px` }} className={n % 45 === 0 ? "major" : ""}>
                {n % 45 === 0 ? BEARINGS[n / 45] : ""}
              </span>
            );
          })}
        </div>
        <i className="br-compass-tick" />
        {hud.waypoint && Math.abs(hud.waypoint.angle) < 1.5 && (
          <b
            className="br-compass-wp"
            style={{ transform: `translateX(${((hud.waypoint.angle * 180) / Math.PI) * 2}px)` }}
          >
            {Math.round(hud.waypoint.dist)} m
          </b>
        )}
      </div>
      {z && (
        <div className={`br-matchbar ${state?.cls ?? ""}`}>
          <span>
            <b>{hud.alive ?? "—"}</b> ALIVE
          </span>
          <i />
          <span>{final ? "FINAL" : `ZONE ${z.phase}`}</span>
          <i />
          <span className="mono">{z.left !== null ? clock(z.left) : "—"}</span>
        </div>
      )}
      {state && <div className={`br-zonestate ${state.cls}`}>{state.text}</div>}
      {notice && (
        <div className="br-notice" key={notice}>
          {notice}
        </div>
      )}
    </div>
  );
}

/** The atmosphere outside the zone: a tinted vignette that pulses with the gas damage. */
/**
 * Under the canopy (owner's parachute reference): altitude on the left, airspeed on the right,
 * each a tall scale with a marker and its reading.
 */
export function BrCanopyGauges({ hud }: { hud: BrHud }) {
  if (!hud.canopy) return null;
  const { agl, kmh } = hud.canopy;
  const scale = (value: number, max: number) =>
    `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  return (
    <div className="br-canopy-gauges" aria-label="Parachute gauges">
      <div className="br-gauge left">
        <div className="br-gauge-scale">
          <i style={{ bottom: scale(agl, 800) }} />
        </div>
        <b>
          {agl}
          <small>meters</small>
        </b>
        <span>Altitude</span>
      </div>
      <div className="br-gauge right">
        <div className="br-gauge-scale">
          <i style={{ bottom: scale(kmh, 100) }} />
        </div>
        <b>
          {kmh}
          <small>km/h</small>
        </b>
        <span>Speed</span>
      </div>
    </div>
  );
}

export function BrGasFx({ hud }: { hud: BrHud }) {
  if (!hud.zone?.outside) return null;
  return (
    <>
      <div className="br-gasfx" aria-hidden />
      <div className="br-gas" role="alert">
        Outside the zone · −{hud.zone.hurt ?? hud.zone.dps} HP/s
      </div>
    </>
  );
}

// ------------------------------------------------------------------ pre-match lobby

const LOBBY_TIPS = [
  "Warm-up: shoot anything, nobody is hurt. Everyone starts fresh on the plane.",
  "Jump with Space when the doors open, glide with WASD; the canopy opens itself at 300 m.",
  "Plates fit into a vest: up to three, spares ride in the bag (B).",
  "Every airdrop carries a Tactical Tablet. Eliminations earn its Tactical Data.",
  "Stay ahead of the gas: the next circle shows on the map (M) as a dashed ring.",
  "A pistol has its own slot (3): the Desert Eagle takes a red dot and needs a trigger pull per shot.",
  "Bullets drop over distance: at 200 m and beyond, aim a little above the target.",
];

/**
 * The warm-up bar before take-off (owner, 2026-11-04): solo matches start a one-minute
 * countdown when the first real player joins; players warm up on the airfield, and bots take
 * every seat left, so a match can be one player and 99 bots.
 */
export function BrLobbyCard({ hud }: { hud: BrHud }) {
  if (hud.phase !== "waiting" && hud.phase !== "starting") return null;
  const humans = Math.max(1, hud.humans ?? 1);
  const left = Math.ceil(hud.countdown ?? 0);
  const total = BR_RULES.countdownMs / 1000;
  const tip = LOBBY_TIPS[Math.floor((total - left) / 12) % LOBBY_TIPS.length]!;
  const waiting = hud.phase === "waiting";
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  // Owner, 2026-11-09: "not modern, less windows, clean": no card, just type on the scene.
  return (
    <section className="br-lobby" aria-live="polite">
      <small>{waiting ? "Waiting for players" : "Take-off in"}</small>
      <b className={waiting ? "waiting" : ""}>{waiting ? "· · ·" : clock}</b>
      <i aria-hidden="true">
        <i style={{ transform: `scaleX(${waiting ? 0 : Math.min(1, 1 - left / total)})` }} />
      </i>
      <span>
        Solo · <b>{humans}</b> {humans === 1 ? "player" : "players"} · <b>{100 - humans}</b> bots
      </span>
      <p key={tip}>{tip}</p>
    </section>
  );
}

// ------------------------------------------------------------------ inventory (B / I)

type Selection = { kind: "bag"; index: number } | { kind: "equip"; slot: EquipSlot } | null;

/** The guns an attachment fits, by name ("AK-47, M4, AWP, MP5, Desert Eagle"). */
const GUN_IDS = (Object.keys(ITEMS) as ItemId[]).filter((k) => ITEMS[k].category === "weapon");
const fitsList = (id: string) =>
  GUN_IDS.filter((g) => fitsGun(g as WeaponId, id as ItemId))
    .map((g) => ITEMS[g].name)
    .join(", ");

function stats(
  id: string,
  extra: { durability?: number; mag?: number; qty?: number; extMag?: ItemId | null },
) {
  const d = def(id);
  const rows: Array<[string, string]> = [["Rarity", RARITY[d.rarity].label]];
  switch (d.category) {
    case "weapon": {
      const w = d as WeaponDef;
      rows.push(
        ["Ammunition", def(w.ammo).name],
        [
          "Magazine",
          `${extra.mag ?? 0} / ${magSize({ item: id as WeaponId, extMag: extra.extMag ?? null })}`,
        ],
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
      rows.push(["Zoom", `${d.zoom}×`], ["Fits", fitsList(id)]);
      break;
    case "muzzle":
      rows.push(
        ["Shot heard at", `${Math.round(d.hearScale * 100)} % range`],
        ["Recoil", `${Math.round(d.recoilScale * 100)} %`],
        ["Fits", fitsList(id)],
      );
      break;
    case "magazine":
      // Per gun: AK-47 +10, M4 +10, AWP +5, MP5 +10, Desert Eagle +5.
      for (const g of GUN_IDS) {
        const w = def(g) as WeaponDef;
        rows.push([w.name, `${w.magazine} → ${w.magazine + w.extMag} rounds`]);
      }
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
    case "gun2":
      return kit.guns[+slot.slice(3) as 0 | 1 | 2] ?? null;
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
      const g = kit.guns[+slot.slice(-1) as 0 | 1 | 2];
      const id = g
        ? slot.startsWith("optic")
          ? g.optic
          : slot.startsWith("mag")
            ? (g.extMag ?? null)
            : g.muzzle
        : null;
      return id ? { item: id } : null;
    }
  }
}

const SLOT_LABEL: Record<EquipSlot, string> = {
  gun0: "Primary",
  gun1: "Secondary",
  gun2: "Pistol",
  helmet: "Helmet",
  vest: "Kevlar",
  plate0: "Plate 1",
  plate1: "Plate 2",
  plate2: "Plate 3",
  backpack: "Backpack",
  optic0: "Optic",
  optic1: "Optic",
  optic2: "Optic",
  muzzle0: "Muzzle",
  muzzle1: "Muzzle",
  mag0: "Magazine",
  mag1: "Magazine",
  mag2: "Magazine",
};

type Drag =
  | { kind: "bag"; index: number }
  | { kind: "equip"; slot: EquipSlot }
  | { kind: "near"; id: number };
const CATEGORIES: Array<[string, string, (c: string) => boolean]> = [
  ["all", "All", () => true],
  ["ammo", "Ammo", (c) => c === "ammo"],
  ["med", "Medical", (c) => c === "heal"],
  ["nade", "Grenades", (c) => c === "grenade"],
  ["armour", "Armour", (c) => c === "helmet" || c === "vest" || c === "plate"],
  ["att", "Attachments", (c) => c === "optic" || c === "muzzle" || c === "magazine"],
  ["other", "Other", (c) => c === "backpack" || c === "tablet"],
];
/** Where a bag item goes when equipped (null: it cannot be equipped). */
function equipTarget(kit: BrKitView, item: string, slot?: EquipSlot): number | null {
  const c = def(item).category;
  if (c === "helmet" || c === "vest") return slot === undefined || slot === c ? 0 : null;
  if (c === "plate") {
    if (!kit.vest) return null; // plates fit into a worn vest
    if (slot?.startsWith("plate")) return +slot.slice(5);
    const free = kit.plates.findIndex((p) => !p);
    return slot === undefined ? Math.max(0, free) : null;
  }
  if (c === "optic" || c === "muzzle" || c === "magazine") {
    // Only onto a gun it fits (the Desert Eagle takes a red dot, the magazine, nothing else).
    const onto = (i: number) => {
      const g = kit.guns[i as 0 | 1 | 2];
      return g && fitsGun(g.item, item as ItemId) ? i : null;
    };
    if (slot?.startsWith(c === "magazine" ? "mag" : c)) return onto(+slot.slice(-1));
    if (slot === "gun0" || slot === "gun1" || slot === "gun2") return onto(+slot.slice(-1));
    if (slot !== undefined) return null;
    for (const i of [kit.active, 0, 1, 2]) if (i >= 0 && onto(i) !== null) return i;
    return null;
  }
  return null;
}

/** The inventory icon of an item (scripts/br/icons renders them from the game's models). */
function ItemIcon({ id, ghost = false }: { id: string; ghost?: boolean }) {
  return (
    <img
      className={ghost ? "br-inv-icon ghost" : "br-inv-icon"}
      src={`/fps/br/icons/${id}.webp`}
      alt=""
      draggable={false}
      loading="lazy"
    />
  );
}
/** Faint stand-ins for empty equipment slots. */
const GHOST: Record<EquipSlot, string> = {
  gun0: "ak47",
  gun1: "m4",
  gun2: "deagle",
  helmet: "helmet-1",
  vest: "vest-2",
  backpack: "backpack-1",
  plate0: "plate",
  plate1: "plate",
  plate2: "plate",
  optic0: "sight-red",
  optic1: "sight-red",
  optic2: "sight-red",
  muzzle0: "silencer",
  muzzle1: "silencer",
  mag0: "mag-ext",
  mag1: "mag-ext",
  mag2: "mag-ext",
};
/** A cell's name: levelled gear drops the "level N" (the badge shows it). */
const shortName = (id: string) => def(id).name.replace(/ level \d$/, "");

function PanelIcon({ kind }: { kind: "near" | "bag" | "equip" }) {
  const d = {
    near: "M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Zm0 2.2 6.4 3.2L12 11.6 5.6 8.4 12 5.2ZM5 10l6 3v5.8l-6-3V10Zm8 8.8V13l6-3v5.8l-6 3Z",
    bag: "M9 4a3 3 0 0 1 6 0v1h1.5A3.5 3.5 0 0 1 20 8.5V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8.5A3.5 3.5 0 0 1 7.5 5H9V4Zm2 1h2V4a1 1 0 0 0-2 0v1ZM7.5 7A1.5 1.5 0 0 0 6 8.5V11h12V8.5A1.5 1.5 0 0 0 16.5 7h-9ZM18 13h-5v1h-2v-1H6v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5Z",
    equip:
      "M8 3h8l1 2 3 1v6c0 4.4-3.4 7.9-8 9-4.6-1.1-8-4.6-8-9V6l3-1 1-2Zm1.3 2-.8 1.6L6 7.4V12c0 3.3 2.4 6 6 7 3.6-1 6-3.7 6-7V7.4l-2.5-.8-.8-1.6H9.3Z",
  }[kind];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/**
 * Your operator in the equipment panel (owner, 2026-11-04: "look more like our character"):
 * the officer as the battle royale shows him, wearing what you wear and holding what you hold
 * (owner, 2026-11-08), rendered live by the arena (operator-figure.ts). Until that first picture
 * is ready, the studio render from scripts/br/icons stands in.
 */
function Operator({ figure }: { figure: string | null }) {
  return (
    <div className="br-inv-figure">
      <img
        src={figure ?? "/fps/br/icons/char-police.webp"}
        alt="Your operator, as equipped"
        draggable={false}
      />
    </div>
  );
}

/**
 * The B inventory (owner's UI spec §1): nearby loot on the left (within reach, nearest first;
 * click or drag into the bag to take it), the bag in the middle (compact cells, category
 * filters, capacity), equipment on the right (guns with their attachments, helmet, kevlar,
 * backpack, plates). Drag between the panels to take, equip, unequip or drop, and within the
 * equipment panel to swap the main guns or move attachments and plates; click an item for
 * its details and actions. Every action goes to the server (BrAct); the panels show its answer.
 */
export function BrInventory({
  kit,
  nearby,
  act,
  close,
  figure = null,
}: {
  kit: BrKitView;
  nearby: BrNearby[];
  act: (a: BrAct) => void;
  close: () => void;
  /** Your operator as equipped (BrArenaControls.operatorFigure), or null for the stand-in. */
  figure?: string | null;
}) {
  const [sel, setSel] = useState<Selection>(null);
  const [filter, setFilter] = useState("all");
  const [over, setOver] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const picked =
    sel?.kind === "bag"
      ? (kit.bag[sel.index] ?? null)
      : sel?.kind === "equip"
        ? equipped(kit, sel.slot)
        : null;
  useEffect(() => {
    if (sel && !picked) setSel(null);
  }, [sel, picked]);
  const dropOn = (target: "bag" | "near" | EquipSlot) => {
    const d = drag.current;
    drag.current = null;
    setOver(null);
    if (!d) return;
    if (d.kind === "near" && target !== "near") act({ act: "pickup", id: d.id });
    else if (d.kind === "bag" && target === "near") act({ act: "dropBag", index: d.index });
    else if (d.kind === "bag" && target !== "bag" && target !== "near") {
      const t = equipTarget(kit, kit.bag[d.index]?.item ?? "", target);
      if (t !== null) act({ act: "equip", index: d.index, target: t });
    } else if (d.kind === "equip" && target === "near") act({ act: "dropEquip", slot: d.slot });
    else if (d.kind === "equip" && target !== "bag" && target !== d.slot) {
      // Between equipment slots: swap the main guns, move an attachment or plate. An
      // attachment dropped on another gun's card goes to that gun's matching slot.
      // A gun dropped on another gun's attachment tile means that gun.
      const gunDrag = d.slot.startsWith("gun");
      const onGun = /^(gun|optic|muzzle|mag)\d$/.test(target);
      const to = (
        gunDrag && onGun
          ? `gun${target.slice(-1)}`
          : !gunDrag && target.startsWith("gun")
            ? `${d.slot.replace(/\d$/, "")}${target.slice(-1)}`
            : target
      ) as EquipSlot;
      if (to !== d.slot && to in GHOST) act({ act: "move", slot: d.slot, to });
    } else if (
      d.kind === "equip" &&
      target === "bag" &&
      !d.slot.startsWith("gun") &&
      d.slot !== "backpack"
    )
      act({ act: "unequip", slot: d.slot });
  };
  // Handlers stop at the innermost target, so an attachment tile wins over its weapon card.
  const zone = (target: "bag" | "near" | EquipSlot) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (over !== target) setOver(target);
    },
    onDragLeave: () => setOver((o) => (o === target ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropOn(target);
    },
  });
  const start = (d: Drag) => (e: React.DragEvent) => {
    e.stopPropagation();
    drag.current = d;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "item");
  };
  const select = (s: Selection) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setSel(s);
  };
  /** An equipment tile (armour, backpack, plates, attachments): the item's icon or a ghost. */
  const tile = (slot: EquipSlot) => {
    const e = equipped(kit, slot);
    const d = e ? def(e.item) : null;
    const full = d && "durability" in d ? d.durability : 0;
    const level = d && d.category !== "plate" && "level" in d ? d.level : 0;
    const off = slot.startsWith("plate") && !kit.vest;
    return (
      <button
        type="button"
        key={slot}
        className={`br-inv-tile ${e ? "" : "empty"} ${off ? "off" : ""} ${sel?.kind === "equip" && sel.slot === slot ? "sel" : ""} ${over === slot ? "over" : ""}`}
        style={e ? ({ "--rar": rarityColor(e.item) } as React.CSSProperties) : undefined}
        title={d ? d.name : off ? "Plates need a vest" : SLOT_LABEL[slot]}
        onClick={select(e ? { kind: "equip", slot } : null)}
        draggable={!!e}
        onDragStart={start({ kind: "equip", slot })}
        {...zone(slot)}
      >
        <ItemIcon id={e ? e.item : GHOST[slot]} ghost={!e} />
        {level ? <i className="br-inv-lv">Lv.{level}</i> : null}
        {e && full > 0 && <Bar value={e.durability ?? full} max={full} tone="#cfd6c5" />}
      </button>
    );
  };
  /** A weapon card: number, name, ammunition, magazine / reserve, the gun, its attachments. */
  const gunCard = (i: 0 | 1 | 2) => {
    const slot = `gun${i}` as EquipSlot;
    const g = kit.guns[i];
    const w = g ? (def(g.item) as WeaponDef) : null;
    return (
      <div
        key={slot}
        role="button"
        tabIndex={0}
        className={`br-inv-gun ${g ? "" : "empty"} ${kit.active === i ? "on" : ""} ${sel?.kind === "equip" && sel.slot === slot ? "sel" : ""} ${over === slot ? "over" : ""}`}
        onClick={select(g ? { kind: "equip", slot } : null)}
        draggable={!!g}
        onDragStart={start({ kind: "equip", slot })}
        {...zone(slot)}
      >
        <header>
          <kbd>{i + 1}</kbd>
          <b>{w ? w.name : "Empty"}</b>
          {g && w && (
            <span className="br-inv-mag">
              <small>{def(w.ammo).name.replace(" ammo", "")}</small>
              <strong>{g.mag}</strong>
              <span>{count(kit, w.ammo)}</span>
            </span>
          )}
        </header>
        <div className="br-inv-gun-art">
          <ItemIcon id={g ? g.item : i === 2 ? "deagle" : "ak47"} ghost={!g} />
        </div>
        <div className="br-inv-att">
          {tile(`optic${i}` as EquipSlot)}
          {/* The pistol takes no muzzle device. */}
          {i < 2 && tile(`muzzle${i}` as EquipSlot)}
          {tile(`mag${i}` as EquipSlot)}
        </div>
      </div>
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
    if (d.category === "plate" && kit.vest)
      for (const t of [0, 1, 2])
        actions.push([`Plate ${t + 1}`, { act: "equip", index, target: t }]);
    if (d.category === "optic" || d.category === "muzzle" || d.category === "magazine")
      for (const t of [0, 1, 2] as const) {
        const g = kit.guns[t];
        if (g && fitsGun(g.item, picked.item as ItemId))
          actions.push([`On ${def(g.item).name}`, { act: "equip", index, target: t }]);
      }
    if ((picked as { qty: number }).qty > 1)
      actions.push(["Drop one", { act: "dropBag", index, qty: 1 }]);
    actions.push(["Drop", { act: "dropBag", index }]);
  } else if (picked && sel?.kind === "equip") {
    if (!sel.slot.startsWith("gun") && sel.slot !== "backpack")
      actions.push(["To bag", { act: "unequip", slot: sel.slot }]);
    actions.push(["Drop", { act: "dropEquip", slot: sel.slot }]);
  }
  const keep = CATEGORIES.find(([k]) => k === filter)![2];
  const shown = kit.bag.map((s, i) => [s, i] as const).filter(([s]) => keep(def(s.item).category));
  const nades = count(kit, "grenade-he") + count(kit, "grenade-smoke") + count(kit, "grenade-fire");
  const nadeIcon =
    (["grenade-he", "grenade-smoke", "grenade-fire"] as const).find((g) => count(kit, g) > 0) ??
    "grenade-he";
  const quick: Array<[string, string, string, number, (() => void) | null]> = [
    ["5", "Grenades", nadeIcon, nades, null],
    ["6", "Medkit", "medkit", count(kit, "medkit"), () => act({ act: "heal", item: "medkit" })],
    ["7", "Bandage", "bandage", count(kit, "bandage"), () => act({ act: "heal", item: "bandage" })],
  ];
  return (
    <div className="br-inventory" role="dialog" aria-label="Inventory" onClick={() => setSel(null)}>
      <section
        className={`br-inv-panel br-inv-near ${over === "near" ? "over" : ""}`}
        {...zone("near")}
      >
        <h3>
          <PanelIcon kind="near" /> Nearby
        </h3>
        <p className="br-inv-sub">Ground ({nearby.length})</p>
        {nearby.length ? (
          <ul>
            {nearby.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="br-inv-row"
                  draggable
                  onDragStart={start({ kind: "near", id: n.id })}
                  onClick={(e) => {
                    e.stopPropagation();
                    act({ act: "pickup", id: n.id });
                  }}
                  style={{ "--rar": n.color } as React.CSSProperties}
                  title={`Take ${n.name}`}
                >
                  <span className="br-inv-thumb">
                    <ItemIcon id={n.item} />
                  </span>
                  <span className="br-inv-row-text">
                    <b>{n.name}</b>
                    <small>{n.detail}</small>
                  </span>
                  {n.qty > 1 && <em>{n.qty}</em>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="br-inv-note">Nothing within reach. Walk up to loot to see it here.</p>
        )}
        <footer className="br-inv-note">
          Click or drag into the bag to take · drag here to drop
        </footer>
      </section>

      <section
        className={`br-inv-panel br-inv-bag ${over === "bag" ? "over" : ""}`}
        {...zone("bag")}
      >
        <h3>
          <PanelIcon kind="bag" /> Inventory
          <span className="br-inv-cap">
            <span>
              <b>{kit.bag.length}</b> / {kit.capacity} slots
            </span>
            <Bar
              value={kit.bag.length}
              max={kit.capacity}
              tone={kit.bag.length >= kit.capacity ? "#f0c24b" : "#6fcf5a"}
            />
          </span>
        </h3>
        <nav className="br-inv-tabs">
          {CATEGORIES.map(([k, label]) => (
            <button
              type="button"
              key={k}
              className={filter === k ? "on" : ""}
              onClick={(e) => {
                e.stopPropagation();
                setFilter(k);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="br-inv-grid">
          {shown.map(([s, i]) => {
            const sd = def(s.item);
            const level = sd.category !== "plate" && "level" in sd ? sd.level : 0;
            return (
              <button
                type="button"
                key={i}
                draggable
                onDragStart={start({ kind: "bag", index: i })}
                className={`br-inv-cell ${sel?.kind === "bag" && sel.index === i ? "sel" : ""}`}
                style={{ "--rar": rarityColor(s.item) } as React.CSSProperties}
                title={sd.name}
                onClick={select({ kind: "bag", index: i })}
                onDoubleClick={() => {
                  if (sd.category === "heal")
                    act({ act: "heal", item: s.item as "bandage" | "medkit" });
                  else {
                    const t = equipTarget(kit, s.item);
                    if (t !== null) act({ act: "equip", index: i, target: t });
                  }
                }}
              >
                <ItemIcon id={s.item} />
                {level ? <i className="br-inv-lv">Lv.{level}</i> : null}
                <b>{shortName(s.item)}</b>
                {s.qty > 1 && <em>{s.qty}</em>}
                {s.durability !== undefined && "durability" in sd && (
                  <Bar value={s.durability} max={sd.durability} tone="#cfd6c5" />
                )}
              </button>
            );
          })}
          {Array.from(
            { length: filter === "all" ? Math.max(0, kit.capacity - kit.bag.length) : 0 },
            (_, i) => (
              <div key={`e${i}`} className="br-inv-cell empty" />
            ),
          )}
        </div>
        <div className="br-inv-detail" onClick={(e) => e.stopPropagation()}>
          {picked && d ? (
            <>
              <span className="br-inv-thumb big">
                <ItemIcon id={picked.item} />
              </span>
              <div className="br-inv-detail-text">
                <h4>
                  {d.name}{" "}
                  <small style={{ color: rarityColor(picked.item) }}>
                    {RARITY[d.rarity].label}
                  </small>
                </h4>
                <dl>
                  {stats(
                    picked.item,
                    picked as {
                      durability?: number;
                      mag?: number;
                      qty?: number;
                      extMag?: ItemId | null;
                    },
                  )
                    .slice(1)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>
              </div>
              <div className="br-inv-actions">
                {actions.map(([label, a]) => (
                  <button type="button" key={label} onClick={() => act(a)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="br-inv-note">
              Select an item for details · double-click to use or equip · drag to move
            </p>
          )}
        </div>
      </section>

      <section className="br-inv-panel br-inv-equip">
        <h3>
          <PanelIcon kind="equip" /> Equipment
          <button
            type="button"
            className="br-inv-close"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close inventory"
          >
            <kbd>B</kbd>
          </button>
        </h3>
        <div className="br-inv-body">
          <div className="br-inv-wear">{(["helmet", "vest", "backpack"] as const).map(tile)}</div>
          <Operator figure={figure} />
          <div className={`br-inv-plates ${kit.vest ? "" : "off"}`}>
            <small>Plates</small>
            {(["plate0", "plate1", "plate2"] as const).map(tile)}
          </div>
          <div className="br-inv-guns">{([0, 1, 2] as const).map(gunCard)}</div>
        </div>
        <div className="br-inv-quick">
          {quick.map(([key, label, icon, n, use]) => (
            <button
              type="button"
              key={key}
              className={`br-inv-q ${n ? "" : "empty"}`}
              disabled={!use || !n}
              onClick={(e) => {
                e.stopPropagation();
                use?.();
              }}
              title={use && n ? `Use ${label.toLowerCase()}` : label}
            >
              <kbd>{key}</kbd>
              <b>{label}</b>
              <ItemIcon id={icon} ghost={!n} />
              <em>{n}</em>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ zone, minimap, end (Phase 3)

const HALF = 5000;
const toMap = (v: number) => ((v + HALF) / (2 * HALF)) * 256;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Top-right minimap: the island with the gas, the current (white) and next (yellow) circles,
 * supply drops, your marker and you. Compact; M opens the full tactical map.
 */
export function BrZone({
  hud,
  map,
  waypoint,
}: {
  hud: BrHud;
  map: string | null;
  waypoint: [number, number] | null;
}) {
  const z = hud.zone;
  return (
    <div className="br-map" aria-label="Map">
      {map && <img src={map} alt="" />}
      <svg viewBox="0 0 256 256">
        <defs>
          <mask id="br-gas-mask">
            <rect width="256" height="256" fill="white" />
            {z && z.r > 0 && (
              <circle cx={toMap(z.x)} cy={toMap(z.z)} r={(z.r / (2 * HALF)) * 256} fill="black" />
            )}
          </mask>
        </defs>
        {z && <rect width="256" height="256" className="gas" mask="url(#br-gas-mask)" />}
        {z && (
          <>
            <circle cx={toMap(z.x)} cy={toMap(z.z)} r={(z.r / (2 * HALF)) * 256} className="now" />
            {z.nr > 0 && (z.nr !== z.r || z.nx !== z.x || z.nz !== z.z) && (
              <circle
                cx={toMap(z.nx)}
                cy={toMap(z.nz)}
                r={(z.nr / (2 * HALF)) * 256}
                className="next"
              />
            )}
          </>
        )}
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
        {waypoint && (
          <circle cx={toMap(waypoint[0])} cy={toMap(waypoint[1])} r={3.5} className="wp" />
        )}
        <g
          transform={`translate(${toMap(hud.me.x)} ${toMap(hud.me.z)}) rotate(${(-hud.me.yaw * 180) / Math.PI})`}
        >
          <path d="M0 -6 L4 4 L0 2 L-4 4 Z" className="me" />
        </g>
      </svg>
      <span className="br-map-key">
        <kbd>M</kbd>
      </span>
    </div>
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
    const won = r.place === 1;
    return (
      <div className="br-result">
        <section className={`br-result-card ${won ? "won" : ""}`}>
          <small>{won ? "Winner winner" : "Match over"}</small>
          <h1>{won ? "#1 — Last one standing" : `#${r.place}`}</h1>
          <p>
            {won
              ? "You won the match."
              : r.winnerName
                ? `${r.winnerName} won the match.`
                : "Nobody survived the zone."}
          </p>
          <dl>
            <div>
              <dt>Place</dt>
              <dd>#{r.place}</dd>
            </div>
            <div>
              <dt>Eliminations</dt>
              <dd>{r.kills}</dd>
            </div>
            <div>
              <dt>Damage</dt>
              <dd>{r.damage}</dd>
            </div>
          </dl>
          <div className="br-end-actions">{leave}</div>
        </section>
      </div>
    );
  }
  if (!out || hidden)
    return hud.watch ? <div className="br-watch">Watching {hud.watch.name}</div> : null;
  return (
    <div className="br-result">
      <section className="br-result-card out">
        <small>Eliminated</small>
        <h1>
          {out === "the gas"
            ? "The gas got you"
            : out === "a fall"
              ? "You fell to your death"
              : `Killed by ${out}`}
        </h1>
        <dl>
          <div>
            <dt>Eliminations</dt>
            <dd>{hud.kit?.kills ?? 0}</dd>
          </div>
          <div>
            <dt>Still alive</dt>
            <dd>{hud.alive ?? "—"}</dd>
          </div>
        </dl>
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
        carry the tablet. Tactical Data comes from eliminations.
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

/**
 * Driving (owner, 2026-11-09: "modern design for the km/h, no windows"): no panel, just the
 * speed in large figures over a thin arc that fills toward the vehicle's top speed, its name and
 * a hairline for its health under it; the keys show for a few seconds after you get in.
 */
function BrSpeedometer({ car }: { car: NonNullable<BrHud["vehicle"]> }) {
  const r = 46,
    sweep = 240,
    arc = (Math.PI * 2 * r * sweep) / 360;
  const fill = Math.min(1, car.kmh / Math.max(1, car.top));
  const hp = car.health / Math.max(1, car.max);
  return (
    <div className="br-speed" role="status" aria-label={`${car.name} ${Math.round(car.kmh)} km/h`}>
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle
          className="br-speed-track"
          cx="60"
          cy="60"
          r={r}
          strokeDasharray={`${arc} 999`}
          transform="rotate(150 60 60)"
        />
        <circle
          className="br-speed-fill"
          cx="60"
          cy="60"
          r={r}
          strokeDasharray={`${arc * fill} 999`}
          transform="rotate(150 60 60)"
        />
      </svg>
      <div className="br-speed-read">
        <b>{Math.round(car.kmh)}</b>
        <small>km/h</small>
      </div>
      <div className="br-speed-name">
        <span>{car.name}</span>
        <i className={hp < 0.4 ? "low" : ""}>
          <i style={{ width: `${Math.max(0, Math.min(1, hp)) * 100}%` }} />
        </i>
      </div>
      <div className="br-speed-keys" key={car.id}>
        <span>
          <kbd>W</kbd>
          <kbd>S</kbd> drive
        </span>
        <span>
          <kbd>A</kbd>
          <kbd>D</kbd> steer
        </span>
        <span>
          <kbd>Space</kbd> {car.bike ? "brake" : "handbrake"}
        </span>
        <span>
          <kbd>E</kbd> exit
        </span>
      </div>
    </div>
  );
}
