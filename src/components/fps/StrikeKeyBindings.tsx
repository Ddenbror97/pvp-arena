import { useEffect, useState } from "react";
import { keyLabel } from "@/lib/fps/br/br-settings";
import {
  STRIKE_ACTIONS,
  STRIKE_ACTION_IDS,
  defaultStrikeBinds,
  rebindStrike,
  type StrikeAction,
  type StrikeBinds,
} from "@/lib/fps/key-bindings";

export function StrikeKeyBindings({
  value,
  onChange,
  bomb,
}: {
  value: StrikeBinds;
  onChange: (binds: StrikeBinds) => void;
  bomb: boolean;
}) {
  const [listening, setListening] = useState<StrikeAction | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!listening) return;
    const key = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === "Escape") {
        setListening(null);
        return;
      }
      if (e.repeat) return;
      const next = rebindStrike(value, listening, e.code);
      if (next === value) {
        setNotice("That key is reserved. Choose another key.");
        return;
      }
      onChange(next);
      setNotice(`${STRIKE_ACTIONS[listening].label} set to ${keyLabel(e.code)}.`);
      setListening(null);
    };
    addEventListener("keydown", key, true);
    return () => removeEventListener("keydown", key, true);
  }, [listening, value, onChange]);
  return (
    <section className="strike-bindings" aria-label="Key bindings">
      <div className="strike-section-heading">
        <div>
          <h3>Make it your own</h3>
          <p>Select a key to change it. Assigned keys swap places.</p>
        </div>
        <button
          type="button"
          className="strike-text-button"
          onClick={() => {
            setListening(null);
            onChange(defaultStrikeBinds());
            setNotice("Default keys restored.");
          }}
        >
          Reset keys
        </button>
      </div>
      <div className="strike-binding-groups">
        {["Movement", "Equipment", "Match"].map((group) => (
          <section key={group} className="strike-binding-group">
            <h4>{group}</h4>
            {STRIKE_ACTION_IDS.filter(
              (a) =>
                STRIKE_ACTIONS[a].group === group && (bomb || (a !== "use" && a !== "scoreboard")),
            ).map((a) => (
              <div className="strike-binding-row" key={a}>
                <span>{STRIKE_ACTIONS[a].label}</span>
                <button
                  type="button"
                  className={listening === a ? "listening" : ""}
                  aria-label={`${STRIKE_ACTIONS[a].label}: ${keyLabel(value[a])}. Change`}
                  onClick={() => {
                    setListening(listening === a ? null : a);
                    setNotice("");
                  }}
                >
                  {listening === a ? "Press a key…" : keyLabel(value[a])}
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="strike-fixed-keys">
        <span>
          <kbd>LMB</kbd> Fire / throw
        </span>
        <span>
          <kbd>RMB</kbd> Aim / alternate attack
        </span>
        <span>
          <kbd>Wheel</kbd> Cycle equipment
        </span>
        <span>
          <kbd>Esc</kbd> Menu
        </span>
        <span>
          <kbd>F3</kbd> Performance
        </span>
      </div>
      <p className="strike-binding-status" role="status">
        {listening ? "Press a key. Escape cancels." : notice}
      </p>
    </section>
  );
}
