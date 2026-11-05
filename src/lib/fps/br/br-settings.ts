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
  jump: { label: "Jump / leave the plane / open the canopy", group: "Movement", key: "Space" },
  crouch: { label: "Crouch", group: "Movement", key: "KeyC" },
  sprint: { label: "Sprint", group: "Movement", key: "ShiftLeft" },
  walk: { label: "Walk (quiet)", group: "Movement", key: "AltLeft" },
  dive: { label: "Dive (freefall)", group: "Movement", key: "ControlLeft" },
  interact: { label: "Pick up / open / enter", group: "Actions", key: "KeyE" },
  reload: { label: "Reload", group: "Actions", key: "KeyR" },
  cancel: { label: "Cancel healing", group: "Actions", key: "KeyX" },
  primary: { label: "Weapon 1", group: "Actions", key: "Digit1" },
  secondary: { label: "Weapon 2", group: "Actions", key: "Digit2" },
  bandage: { label: "Bandage", group: "Actions", key: "Digit3" },
  grenade: { label: "Grenade", group: "Actions", key: "Digit4" },
  medkit: { label: "Medkit", group: "Actions", key: "Digit5" },
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
 * View distance (other battle royales' setting). It changes only what is far away or how
 * detailed it is: the fog line, how far buildings and far scenery draw, trees beyond the
 * shared cover range, when buildings switch to their detailed models and how far the ground
 * textures reach. Everything that can hide a player (trees, bushes, rocks, props) draws the
 * same for everyone within the fight range at every level (fairness, PLAN §10), and players
 * are always drawn within the range the server sends them.
 */
export const VIEW_DISTANCES = {
  low: { label: "Low", fog: [1300, 6500], far: 7000, trees: 1500, detail: 0.7, ground: 80 },
  medium: { label: "Medium", fog: [1800, 9500], far: 14000, trees: 1500, detail: 1, ground: 140 },
  high: { label: "High", fog: [2400, 12000], far: 15000, trees: 2100, detail: 1.3, ground: 200 },
  ultra: { label: "Ultra", fog: [3000, 14000], far: 16000, trees: 2700, detail: 1.6, ground: 260 },
} as const;
export type ViewDistance = keyof typeof VIEW_DISTANCES;

export type BrSettings = { view: ViewDistance; binds: BrBinds };
export const defaultBinds = (): BrBinds =>
  Object.fromEntries(BR_ACTION_IDS.map((a) => [a, BR_ACTIONS[a].key])) as BrBinds;
export const DEFAULT_BR_SETTINGS: BrSettings = { view: "medium", binds: defaultBinds() };

const KEY = "br-settings";
const CODE = /^[A-Za-z0-9]{1,24}$/;

export function readBrSettings(): BrSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<{
      view: unknown;
      binds: Record<string, unknown>;
    }>;
    const view =
      typeof raw.view === "string" && raw.view in VIEW_DISTANCES
        ? (raw.view as ViewDistance)
        : "medium";
    const binds = defaultBinds();
    const used = new Set<string>();
    for (const a of BR_ACTION_IDS) {
      const k = raw.binds?.[a];
      if (typeof k === "string" && CODE.test(k) && !RESERVED_KEYS.has(k) && !used.has(k))
        binds[a] = k;
      used.add(binds[a]);
    }
    // A stored set with duplicates (edited by hand): back to the defaults.
    if (new Set(Object.values(binds)).size !== BR_ACTION_IDS.length)
      return { view, binds: defaultBinds() };
    return { view, binds };
  } catch {
    return { view: "medium", binds: defaultBinds() };
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
