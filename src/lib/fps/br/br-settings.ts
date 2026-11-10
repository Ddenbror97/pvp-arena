/**
 * Battle royale settings (owner, 2026-11-04, as in other battle royales): rebindable keys and a
 * view distance. Saved on this device only (like the 1v1/5v5 settings in settings.ts); the
 * mouse buttons (fire, aim), Escape (menu) and F3 (debug overlay) are fixed.
 */
export const BR_ACTIONS = {
  forward: { label: "Move forward", group: "Movement", key: "KeyW" },
  back: { label: "Move back", group: "Movement", key: "KeyS" },
  left: { label: "Move left", group: "Movement", key: "KeyA" },
  right: { label: "Move right", group: "Movement", key: "KeyD" },
  jump: { label: "Jump / leave the plane", group: "Movement", key: "Space" },
  crouch: { label: "Crouch", group: "Movement", key: "KeyC" },
  sprint: { label: "Sprint", group: "Movement", key: "ShiftLeft" },
  walk: { label: "Walk (quiet)", group: "Movement", key: "AltLeft" },
  dive: { label: "Dive (under the parachute)", group: "Movement", key: "ControlLeft" },
  interact: { label: "Pick up / open / enter", group: "Actions", key: "KeyE" },
  reload: { label: "Reload", group: "Actions", key: "KeyR" },
  cancel: { label: "Cancel healing", group: "Actions", key: "KeyX" },
  primary: { label: "Weapon 1", group: "Actions", key: "Digit1" },
  secondary: { label: "Weapon 2", group: "Actions", key: "Digit2" },
  // The pistol has its own slot on 3 (owner, 2026-11-09, as in CS); the Karambit (always
  // carried) and the throwables and healing moved up one key for it.
  pistol: { label: "Pistol", group: "Actions", key: "Digit3" },
  knife: { label: "Knife", group: "Actions", key: "Digit4" },
  grenade: { label: "Grenade", group: "Actions", key: "Digit5" },
  medkit: { label: "Medkit", group: "Actions", key: "Digit6" },
  bandage: { label: "Bandage", group: "Actions", key: "Digit7" },
  inspect: { label: "Inspect knife", group: "Actions", key: "KeyF" },
  inventory: { label: "Inventory", group: "Screens", key: "KeyB" },
  map: { label: "Map", group: "Screens", key: "KeyM" },
  tablet: { label: "Tactical Tablet", group: "Screens", key: "KeyT" },
  camera: { label: "Canopy camera (first / third person)", group: "Screens", key: "KeyV" },
} as const;
export type BrAction = keyof typeof BR_ACTIONS;
export type BrBinds = Record<BrAction, string>;
export const BR_ACTION_IDS = Object.keys(BR_ACTIONS) as BrAction[];
/** Keys that cannot be bound (the menu, the debug overlay, the browser's own). */
export const RESERVED_KEYS = new Set(["Escape", "F3", "F5", "F11", "F12", "MetaLeft", "MetaRight"]);

/**
 * View distance (owner, 2026-11-04: one slider, like the mouse sensitivity, no graphics modes):
 * how far the player sees clearly, in metres. It changes only what is far away or how detailed
 * it is: the fog line, how far buildings and far scenery draw, trees beyond the shared cover
 * range, when buildings switch to their detailed models and how far the ground textures reach.
 * Everything that can hide a player (trees, bushes, rocks, props) draws the same for everyone
 * within the fight range at every distance (fairness, PLAN §10), and players are always drawn
 * within the range the server sends them.
 */
export const VIEW_RANGE = { min: 1300, max: 3000, step: 50, default: 1800 } as const;

/** What the slider sets, at points along it (blended in between). */
const VIEW_STOPS = [
  { at: 1300, fogFar: 6500, far: 7000, trees: 1500, detail: 0.7, ground: 80 },
  { at: 1800, fogFar: 9500, far: 14000, trees: 1500, detail: 1, ground: 140 },
  { at: 2400, fogFar: 12000, far: 15000, trees: 2100, detail: 1.3, ground: 200 },
  { at: 3000, fogFar: 14000, far: 16000, trees: 2700, detail: 1.6, ground: 260 },
] as const;

export type ViewParams = {
  fog: [number, number];
  far: number;
  trees: number;
  detail: number;
  ground: number;
};

/** The render settings for a view distance (metres of clear view, clamped to the slider). */
export function viewParams(m: number): ViewParams {
  const v = clampView(m);
  let k = 0;
  while (k < VIEW_STOPS.length - 2 && v > VIEW_STOPS[k + 1]!.at) k++;
  const a = VIEW_STOPS[k]!,
    b = VIEW_STOPS[k + 1]!;
  const t = (v - a.at) / (b.at - a.at);
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    fog: [v, Math.round(mix(a.fogFar, b.fogFar))],
    far: Math.round(mix(a.far, b.far)),
    trees: Math.round(mix(a.trees, b.trees)),
    detail: Math.round(mix(a.detail, b.detail) * 100) / 100,
    ground: Math.round(mix(a.ground, b.ground)),
  };
}

export const clampView = (m: number) =>
  Number.isFinite(m)
    ? Math.min(VIEW_RANGE.max, Math.max(VIEW_RANGE.min, Math.round(m / 50) * 50))
    : VIEW_RANGE.default;

/** Saved before the slider: the four presets, read as their distances. */
const OLD_PRESETS: Record<string, number> = { low: 1300, medium: 1800, high: 2400, ultra: 3000 };

export type BrSettings = { view: number; binds: BrBinds };
export const defaultBinds = (): BrBinds =>
  Object.fromEntries(BR_ACTION_IDS.map((a) => [a, BR_ACTIONS[a].key])) as BrBinds;
export const DEFAULT_BR_SETTINGS: BrSettings = { view: VIEW_RANGE.default, binds: defaultBinds() };

const KEY = "br-settings";
const CODE = /^[A-Za-z0-9]{1,24}$/;

/** `fallbackView`: the view distance when none is stored (the low tier starts at the minimum). */
export function readBrSettings(fallbackView: number = VIEW_RANGE.default): BrSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<{
      view: unknown;
      binds: Record<string, unknown>;
    }>;
    const view =
      typeof raw.view === "number"
        ? clampView(raw.view)
        : typeof raw.view === "string" && raw.view in OLD_PRESETS
          ? OLD_PRESETS[raw.view]!
          : clampView(fallbackView);
    const binds = defaultBinds();
    const stored = (a: BrAction) => {
      const k = raw.binds?.[a];
      return typeof k === "string" && CODE.test(k) && !RESERVED_KEYS.has(k) ? k : null;
    };
    // Stored keys first; then the actions missing from the stored set (added later: the knife,
    // inspect) or clashing take their default, or the first free spare key if it is taken.
    const used = new Set<string>();
    const pending: BrAction[] = [];
    for (const a of BR_ACTION_IDS) {
      const k = stored(a);
      if (k && !used.has(k)) {
        binds[a] = k;
        used.add(k);
      } else pending.push(a);
    }
    // Saved before the knife, with the bandage on its old 3: the knife takes 3, the bandage 6.
    if (raw.binds?.["knife"] === undefined && binds.bandage === "Digit3") {
      used.delete("Digit3");
      pending.unshift("knife", "bandage");
      pending.splice(pending.lastIndexOf("knife"), 1);
    }
    // Saved before the pistol slot (knife 3, grenade 4, medkit 5, bandage 6): the keys still on
    // those old defaults move to the new layout (pistol 3, knife 4 … bandage 7); keys the
    // player chose themselves stay.
    if (raw.binds && raw.binds["pistol"] === undefined) {
      const old: Array<[BrAction, string]> = [
        ["knife", "Digit3"],
        ["grenade", "Digit4"],
        ["medkit", "Digit5"],
        ["bandage", "Digit6"],
      ];
      for (const [a, k] of old)
        if (binds[a] === k && !pending.includes(a)) {
          used.delete(k);
          pending.push(a);
        }
      // The pistol first, so it takes the freed 3.
      pending.sort((a, b) => (a === "pistol" ? -1 : b === "pistol" ? 1 : 0));
    }
    const spare = ["Digit8", "Digit9", "Digit0", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL"];
    for (const a of pending) {
      const k = !used.has(BR_ACTIONS[a].key)
        ? BR_ACTIONS[a].key
        : spare.find((c) => !used.has(c) && !Object.values(binds).includes(c));
      if (!k) return { view, binds: defaultBinds() };
      binds[a] = k;
      used.add(k);
    }
    // A stored set with duplicates (edited by hand): back to the defaults.
    if (new Set(Object.values(binds)).size !== BR_ACTION_IDS.length)
      return { view, binds: defaultBinds() };
    return { view, binds };
  } catch {
    return { view: clampView(fallbackView), binds: defaultBinds() };
  }
}

export function saveBrSettings(value: BrSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Storage may be blocked. */
  }
}

/** Bind `code` to `action`; an action that already had it takes the old key (a swap). */
export function rebind(binds: BrBinds, action: BrAction, code: string): BrBinds {
  if (RESERVED_KEYS.has(code) || !CODE.test(code)) return binds;
  const next = { ...binds };
  const other = BR_ACTION_IDS.find((a) => a !== action && next[a] === code);
  if (other) next[other] = next[action];
  next[action] = code;
  return next;
}

/** A readable key name ("KeyW" → "W", "ShiftLeft" → "Left Shift", "Digit1" → "1"). */
export function keyLabel(code: string) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  const side = /^(Shift|Control|Alt)(Left|Right)$/.exec(code);
  if (side) return `${side[2]} ${side[1] === "Control" ? "Ctrl" : side[1]}`;
  const names: Record<string, string> = {
    Space: "Space",
    Tab: "Tab",
    CapsLock: "Caps Lock",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backslash: "\\",
    Enter: "Enter",
    Backspace: "Backspace",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  };
  return names[code] ?? code;
}

/**
 * The render budget's scale as BR's resolution (2026-11-09): its first step down (0.9) keeps
 * full resolution and turns on the lite ground shading instead (island setGroundLite), the terrain
 * being the largest GPU cost on integrated graphics; each later step lowers resolution by one.
 */
export const brResolutionScale = (budgetScale: number) => Math.min(1, budgetScale + 0.1);
