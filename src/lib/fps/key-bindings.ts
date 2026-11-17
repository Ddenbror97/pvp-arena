/** Device-local controls shared by 1v1 and Bomb Defusal. Wire inputs stay unchanged. */
export const STRIKE_ACTIONS = {
  forward: { label: "Move forward", group: "Movement", key: "KeyW" },
  back: { label: "Move back", group: "Movement", key: "KeyS" },
  left: { label: "Move left", group: "Movement", key: "KeyA" },
  right: { label: "Move right", group: "Movement", key: "KeyD" },
  jump: { label: "Jump", group: "Movement", key: "Space" },
  walk: { label: "Walk quietly", group: "Movement", key: "ShiftLeft" },
  crouch: { label: "Crouch", group: "Movement", key: "ControlLeft" },
  primary: { label: "Primary weapon", group: "Equipment", key: "Digit1" },
  pistol: { label: "Desert Eagle", group: "Equipment", key: "Digit2" },
  knife: { label: "Karambit", group: "Equipment", key: "Digit3" },
  grenade: { label: "Grenade / next type", group: "Equipment", key: "Digit4" },
  reload: { label: "Reload", group: "Equipment", key: "KeyR" },
  inspect: { label: "Inspect weapon", group: "Equipment", key: "KeyF" },
  buy: { label: "Buy menu", group: "Match", key: "KeyB" },
  use: { label: "Plant / defuse (hold)", group: "Match", key: "KeyE" },
  scoreboard: { label: "Scoreboard (hold)", group: "Match", key: "Tab" },
} as const;
export type StrikeAction = keyof typeof STRIKE_ACTIONS;
export type StrikeBinds = Record<StrikeAction, string>;
export const STRIKE_ACTION_IDS = Object.keys(STRIKE_ACTIONS) as StrikeAction[];
export const defaultStrikeBinds = (): StrikeBinds =>
  Object.fromEntries(STRIKE_ACTION_IDS.map((a) => [a, STRIKE_ACTIONS[a].key])) as StrikeBinds;
const reserved = new Set(["Escape", "F3", "F5", "F11", "F12", "MetaLeft", "MetaRight"]);
const valid = (code: string) => /^[A-Za-z0-9]{1,24}$/.test(code) && !reserved.has(code);
export function rebindStrike(binds: StrikeBinds, action: StrikeAction, code: string): StrikeBinds {
  if (!valid(code)) return binds;
  const next = { ...binds };
  const other = STRIKE_ACTION_IDS.find((a) => a !== action && binds[a] === code);
  if (other) next[other] = binds[action];
  next[action] = code;
  return next;
}
export function readStrikeBinds(): StrikeBinds {
  const defaults = defaultStrikeBinds();
  try {
    const raw = JSON.parse(localStorage.getItem("strike-key-bindings") ?? "{}");
    const next = { ...defaults };
    for (const a of STRIKE_ACTION_IDS)
      if (typeof raw?.[a] === "string" && valid(raw[a])) next[a] = raw[a];
    return new Set(Object.values(next)).size === STRIKE_ACTION_IDS.length ? next : defaults;
  } catch {
    return defaults;
  }
}
export function saveStrikeBinds(binds: StrikeBinds) {
  try {
    localStorage.setItem("strike-key-bindings", JSON.stringify(binds));
  } catch {
    /* Device storage can be unavailable. */
  }
}
/** Translate physical keys into the existing client input vocabulary, including old aliases. */
export function strikeKey(code: string, binds: StrikeBinds): string {
  const action = STRIKE_ACTION_IDS.find((a) => binds[a] === code);
  if (action) return STRIKE_ACTIONS[action].key;
  if (code === "ShiftRight" && binds.walk === "ShiftLeft") return "ShiftLeft";
  if (code === "ControlRight" && binds.crouch === "ControlLeft") return "ControlLeft";
  if (code === "Digit5" && binds.grenade === "Digit4") return "Digit4";
  // A rebound default must no longer activate its old action.
  return STRIKE_ACTION_IDS.some((a) => STRIKE_ACTIONS[a].key === code) ||
    ["ShiftRight", "ControlRight", "Digit5"].includes(code)
    ? ""
    : code;
}
