import type { FeedWeapon } from "@/lib/fps/kill-feed";

export type { FeedWeapon };
const NAMES: Record<FeedWeapon, string> = {
  ak: "AK-47",
  m4: "M4A1-S",
  awp: "AWP",
  mp5: "MP5",
  deagle: "Desert Eagle",
  knife: "Karambit",
  he: "HE grenade",
  fire: "Incendiary",
  bomb: "C4",
};

/** The guns' renders (scripts/br/icons, from the game's own world models) by feed weapon. */
const GUN_RENDER: Partial<Record<FeedWeapon, string>> = {
  ak: "ak47",
  m4: "m4",
  awp: "awp",
  mp5: "mp5",
  deagle: "deagle",
};

/**
 * One of our guns as a HUD silhouette (owner, 2026-11-04 for the battle royale: "the icons should
 * look like the weapons we have"; 2026-11-12: the same in 1v1 and 5v5): its inventory render
 * (scripts/br/icons, from the same world models the matches draw) recoloured to the HUD's light
 * tone by the class's CSS filter.
 */
export function GunGlyph({ item, className }: { item: string; className: string }) {
  const name = Object.entries(GUN_RENDER).find(([, r]) => r === item)?.[0] as
    FeedWeapon | undefined;
  return (
    <img
      className={`${className}${item === "deagle" ? " is-pistol" : ""}`}
      src={`/fps/br/icons/${item}.webp`}
      alt={name ? NAMES[name] : item}
      draggable={false}
    />
  );
}

/**
 * A kill feed's or HUD's weapon: the gun renders for guns (the same pictures as the battle
 * royale's), the drawn silhouettes for the Karambit, grenades and the bomb.
 */
export function FeedWeaponIcon({ weapon }: { weapon: FeedWeapon }) {
  const gun = GUN_RENDER[weapon];
  return gun ? <GunGlyph item={gun} className="weapon-glyph" /> : <WeaponIcon weapon={weapon} />;
}

/** The equipped weapon's picture over its name in the 1v1 and 5v5 HUDs (none for a grenade). */
export function HeldWeapon({ weapon }: { weapon: FeedWeapon | null }) {
  return weapon ? (
    <span className="duel-held-weapon" key={weapon}>
      <FeedWeaponIcon weapon={weapon} />
    </span>
  ) : null;
}

/** Small, code-native silhouettes: no image download or game-model dependency in the HUD. */
export function WeaponIcon({ weapon }: { weapon: FeedWeapon }) {
  return (
    <svg className="bomb-weapon-icon" viewBox="0 0 64 24" role="img" aria-label={NAMES[weapon]}>
      <title>{NAMES[weapon]}</title>
      {weapon === "ak" && (
        <path d="M1 9h11l3-3h17l3 2h20V6h3v6H35l-5 4 3 6-5 1-6-8h-5v6h-5l1-9H1zM22 13h7l-1 7-5-1z" />
      )}
      {weapon === "m4" && (
        <path d="M1 7h12v2h9V5h10v3h13V7h17v5H34l-3 3 2 7h-6l-3-8h-6v7h-5V12H1zM24 5V3h7v2z" />
      )}
      {weapon === "awp" && (
        <path d="M1 10h19l3-3h15v2h25v3H37l-6 4 3 6h-6l-4-7H13l-3 5H2l4-8H1zM23 3h17v4H23zM27 7h3v3h-3zM45 12h2l4 9h-2z" />
      )}
      {weapon === "mp5" && (
        <path d="M2 7h12v3h5V6h25v3h9V8h3v4h-3v-1h-9v3H33l2 8h-4l-2-8h-4l-2 6h-5l2-6h-6v3H2zM20 4h3v2h-3zM40 4h2v2h-2z" />
      )}
      {weapon === "deagle" && (
        <path d="M18 5h32l1 2h2v5H35l-3 2h-4l2 9h-8l-3-10 2-2h-3l-1-2h-1zM46 3h3v2h-3zM21 3h3v2h-3z" />
      )}
      {weapon === "knife" && (
        <path
          d="M13 4c4-4 10-2 11 2l17 4c8 1 15-1 20-5-1 11-12 17-24 12L23 11c-3 5-12 3-12-2 0-2 1-4 2-5zm3 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
          fillRule="evenodd"
        />
      )}
      {weapon === "he" && (
        <>
          <path d="M28 4h9v3h-2v3c8 3 9 12-3 12S20 13 28 10V7h-2V5z" />
          <path d="m34 3 5 1 2 6h-2l-2-4-4-1z" />
        </>
      )}
      {weapon === "fire" && (
        <path d="M33 1c2 7-5 8-3 12 1-3 4-4 4-7 9 8 9 16-2 17-11-1-10-10-4-15-1 5 0 6 1 6-2-5 6-7 4-13z" />
      )}
      {weapon === "bomb" && (
        <>
          <rect x="22" y="6" width="20" height="16" rx="2" />
          <path d="M27 6V2h3v4m5 0V1h3v5" fill="none" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
