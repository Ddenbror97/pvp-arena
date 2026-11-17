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
  gpuFellBackFrom,
  gpuLabel,
  integratedGpu,
  type BrTierInfo,
} from "@/lib/fps/br/quality-tier";

/**
 * The battle royale's own controls, under the shared sliders in the settings dialog
 * (GameSettings): graphics quality and view distance (owner, 2026-11-04).
 */
export function BrSettingsGeneral({
  value,
  onChange,
}: {
  value: BrSettings;
  onChange: (value: BrSettings) => void;
}) {
  return (
    <>
      <label className="strike-slider br-settings-view">
        <span>View distance</span>
        <output>{value.view.toLocaleString("en-US")} m</output>
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
          Far scenery, building detail and ground textures only: players, trees and rocks look the
          same for everyone.
        </small>
      </label>
      <BrGraphicsChoice />
    </>
  );
}

/** The battle royale's key bindings, across the settings dialog's full width. */
export function BrKeyBindings({
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
      if (e.repeat) return;
      onChange({ ...value, binds: rebind(value.binds, listening, e.code) });
      setListening(null);
    };
    addEventListener("keydown", f, true);
    return () => removeEventListener("keydown", f, true);
  }, [listening, value, onChange]);
  const groupOf = (a: BrAction) =>
    ["primary", "secondary", "pistol", "knife", "grenade", "medkit", "bandage", "inspect"].includes(
      a,
    )
      ? "Equipment"
      : BR_ACTIONS[a].group;
  const groups = ["Movement", "Equipment", "Actions", "Screens"];
  return (
    <section className="strike-settings-card br-settings-keys" aria-label="Key bindings">
      <div className="br-keys-head">
        <h3>Key bindings</h3>
        <small>Select a key to change it. Assigned keys swap places.</small>
        <button
          type="button"
          className="duel-secondary"
          onClick={() => {
            setListening(null);
            onChange({ ...value, binds: { ...DEFAULT_BR_SETTINGS.binds } });
          }}
        >
          Reset keys
        </button>
      </div>
      <div className="br-keys-columns">
        {groups.map((g) => (
          <div key={g} className="br-keys-group">
            <h4>{g}</h4>
            {BR_ACTION_IDS.filter((a) => groupOf(a) === g).map((a) => (
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
      </div>
      <div className="strike-fixed-keys">
        <span>
          <kbd>LMB</kbd> Fire / throw
        </span>
        <span>
          <kbd>RMB</kbd> Aim / free look
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
        {listening ? "Press a key. Escape cancels." : ""}
      </p>
    </section>
  );
}

/**
 * Graphics (owner, 2026-11-10: the island looked coarse on a laptop whose browser ran on the
 * processor's graphics). Always automatic, by the graphics card; the player is told when the
 * browser is on integrated graphics and how to move it to the card.
 */
function BrGraphicsChoice() {
  const [info, setInfo] = useState<BrTierInfo | null>(null);
  useEffect(() => setInfo(detectBrTier()), []);
  const running = info?.tier ?? "standard";
  return (
    <>
      {/* Always automatic, no choice to make (owner, 2026-11-17): only what it picked. */}
      <p className="br-graphics-auto">
        <span>Graphics</span>
        <b>
          Automatic ·{" "}
          {running === "low" ? "Performance" : running === "balanced" ? "Balanced" : "High"}
        </b>
        {info?.gpu ? <small>{gpuLabel(info.gpu)}</small> : null}
      </p>
      {info && <GpuFellBack gpu={info.gpu} />}
      {info && integratedGpu(info.gpu) && (
        <details className="strike-graphics-help">
          <summary>Graphics troubleshooting</summary>
          <GpuSwitchHelp />
        </details>
      )}
    </>
  );
}

/**
 * The browser ran the game on a dedicated card before and is not on it now (owner, 2026-11-15:
 * the screen turned white mid-match, and afterwards "my grafics card 2050 is not detected
 * anymore, even after i … hard refreshed the page"). After a crash of its graphics process a
 * browser carries on with the built-in chip or software drawing until it is restarted itself.
 */
function GpuFellBack({ gpu }: { gpu: string }) {
  const [was, setWas] = useState<string | null>(null);
  useEffect(() => setWas(gpuFellBackFrom(gpu)), [gpu]);
  if (!was) return null;
  return (
    <div className="br-gpu-help" role="status">
      <b>This browser ran the game on your {was} before, and is not using it now.</b> That happens
      when the browser&apos;s graphics crashed: it carries on with the built-in graphics, and
      reloading the page does not change that. Close every window of the browser and open it again.
      If the card is still not named here afterwards, restart the computer.
    </div>
  );
}

/**
 * How to move the browser to a laptop's NVIDIA/AMD card (owner, 2026-11-10: RTX 2050, the
 * game ran on the Intel UHD). A page cannot choose: on Windows, Chrome and Edge ignore WebGL's
 * powerPreference and use the adapter the browser started on, usually the integrated one, and
 * they do not reveal the second card either. Only the player can switch, in the browser's
 * flags or in Windows' per-app graphics setting.
 */
function GpuSwitchHelp() {
  const [copied, setCopied] = useState(false);
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const scheme = /Edg\//.test(ua)
    ? "edge"
    : /OPR\//.test(ua)
      ? "opera"
      : /Chrome\//.test(ua)
        ? "chrome"
        : null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : "your browser";
  const flag = scheme ? `${scheme}://flags/#force-high-performance-gpu` : null;
  return (
    <div className="br-gpu-help">
      <b>Has this computer an NVIDIA or AMD graphics card?</b> {browser} is using the
      processor&apos;s built-in graphics. Web pages cannot switch cards; {browser} can:
      <ol>
        {flag && (
          <li>
            Copy <code>{flag}</code>{" "}
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(flag)
                  .then(() => setCopied(true))
                  .catch(() => undefined);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            , paste it into the address bar of a new tab, set &quot;Force High Performance GPU&quot;
            to <b>Enabled</b> and press <b>Relaunch</b>.
          </li>
        )}
        <li>
          {flag ? "Or in Windows: " : "In Windows: "}Settings → System → Display → Graphics. Find{" "}
          {browser} in the list (if it is not there: &quot;Add desktop app&quot; or
          &quot;Browse&quot;, then the browser&apos;s .exe), choose Options →{" "}
          <b>High performance</b> → Save, and restart {browser}.
        </li>
      </ol>
      Afterwards this panel names the NVIDIA or AMD card and the game picks High by itself.
    </div>
  );
}
