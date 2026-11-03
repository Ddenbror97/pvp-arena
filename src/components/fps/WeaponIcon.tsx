export type FeedWeapon = "ak" | "m4" | "awp" | "knife" | "he" | "fire" | "bomb";
const NAMES: Record<FeedWeapon, string> = {
  ak: "AK-47",
  m4: "M4A1-S",
  awp: "AWP",
  knife: "Karambit",
  he: "HE grenade",
  fire: "Incendiary",
  bomb: "C4",
};

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
