import { useEffect, useState } from "react";
import {
  BR_ACTION_IDS,
  BR_ACTIONS,
  DEFAULT_BR_SETTINGS,
  RESERVED_KEYS,
  VIEW_RANGE,
  keyLabel,
  rebind,
  type BrAction,
  type BrSettings,
} from "@/lib/fps/br/br-settings";

/**
 * The battle royale's own settings sections, shown inside the shared settings dialog
 * (GameSettings): view distance and key bindings (owner, 2026-11-04).
 */
export function BrSettingsSections({
  value,
  onChange,
}: {
  value: BrSettings;
  onChange: (value: BrSettings) => void;
}) {
  const [listening, setListening] = useState<BrAction | null>(null);
  // Waiting for a key: the next key press is the binding (Escape cancels); nothing else sees it.
  useEffect(() => {
    if (!listening) return;
    const f = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === "Escape") return setListening(null);
      if (RESERVED_KEYS.has(e.code)) return;
      onChange({ ...value, binds: rebind(value.binds, listening, e.code) });
      setListening(null);
    };
    addEventListener("keydown", f, true);
    return () => removeEventListener("keydown", f, true);
  }, [listening, value, onChange]);
  const groups = [...new Set(BR_ACTION_IDS.map((a) => BR_ACTIONS[a].group))];
  return (
    <>
      <label className="br-settings-view">
        View distance <output>{value.view.toLocaleString("en-US")} m</output>
        <input
          aria-label="View distance"
          type="range"
          min={VIEW_RANGE.min}
          max={VIEW_RANGE.max}
          step={VIEW_RANGE.step}
          value={value.view}
          onChange={(e) => onChange({ ...value, view: Number(e.target.value) })}
        />
        <small>
          Lower it on slower computers, raise it on faster ones. It changes far scenery, building
          detail and ground textures only: players, trees, bushes and rocks look the same for
          everyone.
        </small>
      </label>
      <fieldset className="br-settings-keys">
        <legend>Key bindings</legend>
        {groups.map((g) => (
          <div key={g} className="br-keys-group">
            <h4>{g}</h4>
            {BR_ACTION_IDS.filter((a) => BR_ACTIONS[a].group === g).map((a) => (
              <div key={a} className="br-key-row">
                <span>{BR_ACTIONS[a].label}</span>
                <button
                  type="button"
                  className={listening === a ? "listening" : ""}
                  aria-label={`${BR_ACTIONS[a].label}: ${keyLabel(value.binds[a])}. Change`}
                  onClick={() => setListening(listening === a ? null : a)}
                >
                  {listening === a ? "Press a key…" : keyLabel(value.binds[a])}
                </button>
              </div>
            ))}
          </div>
        ))}
        <div className="br-keys-foot">
          <small>Fire and aim stay on the mouse buttons; Escape opens this menu.</small>
          <button
            type="button"
            className="duel-secondary"
            onClick={() => onChange({ ...value, binds: { ...DEFAULT_BR_SETTINGS.binds } })}
          >
            Reset keys
          </button>
        </div>
      </fieldset>
    </>
  );
}
