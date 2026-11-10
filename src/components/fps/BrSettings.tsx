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
import {
  detectBrTier,
  gpuLabel,
  integratedGpu,
  readBrTierChoice,
  writeBrTierChoice,
  type BrTierChoice,
  type BrTierInfo,
} from "@/lib/fps/br/quality-tier";

/**
 * The battle royale's own settings sections, shown inside the shared settings dialog
 * (GameSettings): graphics quality, view distance and key bindings (owner, 2026-11-04).
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
      <BrGraphicsChoice />
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

/**
 * Graphics quality (owner, 2026-11-10: the island looked coarse on a laptop whose browser ran
 * on the processor's graphics). Automatic picks by the graphics card; the player can force
 * either mode, and is told when the browser is on integrated graphics.
 */
function BrGraphicsChoice() {
  const [choice, setChoice] = useState<BrTierChoice>("auto");
  const [info, setInfo] = useState<BrTierInfo | null>(null);
  useEffect(() => {
    setChoice(readBrTierChoice());
    setInfo(detectBrTier());
  }, []);
  const running = info?.tier ?? "standard";
  const wanted = choice === "auto" ? null : choice;
  const pending = wanted !== null ? wanted !== running : info?.reason === "override";
  return (
    <label className="br-settings-view">
      Graphics quality
      <select
        aria-label="Graphics quality"
        value={choice}
        onChange={(e) => {
          const next = e.target.value as BrTierChoice;
          writeBrTierChoice(next);
          setChoice(next);
        }}
      >
        <option value="auto">Automatic</option>
        <option value="standard">High (full resolution, smooth edges)</option>
        <option value="balanced">Balanced (smooth edges, 900p)</option>
        <option value="low">Performance (for old computers)</option>
      </select>
      <small>
        Now running:{" "}
        {running === "low" ? "Performance" : running === "balanced" ? "Balanced" : "High"}
        {info?.gpu ? ` on ${gpuLabel(info.gpu)}` : ""}.
        {pending && (
          <>
            {" "}
            The change applies when the page is reloaded.{" "}
            <button type="button" onClick={() => location.reload()}>
              Reload now
            </button>
          </>
        )}
        {info && running !== "standard" && integratedGpu(info.gpu) && (
          <>
            {" "}
            Your browser is using the processor&apos;s built-in graphics. If this computer also has
            an NVIDIA or AMD graphics card, open Windows Settings → System → Display → Graphics, set
            your browser to &quot;High performance&quot; and restart the browser.
          </>
        )}
      </small>
    </label>
  );
}
