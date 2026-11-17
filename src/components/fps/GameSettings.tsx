import { FullscreenButton } from "./FullscreenButton";
import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Crosshair,
  Keyboard,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { StrikeSettings } from "@/lib/fps/settings";
export const CROSSHAIRS = ["Dynamic cross", "Dot", "Circle", "Cross and dot", "Static cross"];
const COLORS = ["#ffffff", "#4ade80", "#67e8f9", "#c084fc", "#facc15", "#ef4444"];
const TABS = [
  { id: "game", label: "Game", icon: SlidersHorizontal },
  { id: "crosshair", label: "Crosshair", icon: Crosshair },
  { id: "keys", label: "Key bindings", icon: Keyboard },
] as const;
export function StrikeCrosshair({
  settings,
  preview = false,
}: {
  settings: StrikeSettings;
  preview?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`duel-crosshair crosshair-${settings.crosshair}${preview ? " crosshair-preview" : ""}`}
      style={{ "--crosshair-color": settings.color } as CSSProperties}
    >
      <i />
      <i />
      <i />
      <i />
      <b />
    </div>
  );
}
export function GameSettings({
  open,
  onOpenChange,
  settings,
  onChange,
  onResume,
  matchNotice,
  onLeavePractice,
  leavingPractice = false,
  leaveError,
  leaveAction,
  displayActions,
  general,
  extra,
  mode = "1v1 Duel",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: StrikeSettings;
  onChange: (value: StrikeSettings) => void;
  onResume: () => void;
  matchNotice?: ReactNode;
  onLeavePractice?: (() => void) | undefined;
  leavingPractice?: boolean;
  leaveError?: string | null;
  leaveAction?: ReactNode;
  displayActions?: ReactNode;
  general?: ReactNode;
  extra?: ReactNode;
  mode?: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("game");
  const id = useId();
  const lastVolume = useRef(settings.volume || 1);
  const tabs = TABS.filter((t) => t.id !== "keys" || extra);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (!leavingPractice) onResume();
        } else onOpenChange(next);
      }}
    >
      <DialogContent className="strike-settings" onCloseAutoFocus={(e) => e.preventDefault()}>
        <header className="strike-settings-head">
          <div>
            <span className="strike-settings-eyebrow">
              PVPSTRIKE <i /> {mode}
            </span>
            <DialogTitle>Game settings</DialogTitle>
            <DialogDescription>Fine-tune your game. Changes save automatically.</DialogDescription>
          </div>
          <span className="strike-live-badge">
            <i /> Match live
          </span>
        </header>
        <div className="strike-settings-layout">
          <nav className="strike-settings-nav" aria-label="Settings sections" role="tablist">
            {tabs.map(({ id: key, label, icon: Icon }, index) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`${id}-tab-${key}`}
                aria-controls={`${id}-panel-${key}`}
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={(e) => {
                  let next = index;
                  if (e.key === "ArrowDown" || e.key === "ArrowRight")
                    next = (index + 1) % tabs.length;
                  else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
                    next = (index + tabs.length - 1) % tabs.length;
                  else if (e.key === "Home") next = 0;
                  else if (e.key === "End") next = tabs.length - 1;
                  else return;
                  e.preventDefault();
                  setTab(tabs[next]!.id);
                  document.getElementById(`${id}-tab-${tabs[next]!.id}`)?.focus();
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
                <ArrowUpRight size={14} />
              </button>
            ))}
            <p className="strike-settings-local">
              <Check size={14} /> Saved on this device
            </p>
          </nav>
          <div className="strike-settings-scroll">
            <section
              role="tabpanel"
              tabIndex={0}
              id={`${id}-panel-${tab}`}
              aria-labelledby={`${id}-tab-${tab}`}
            >
              {tab === "game" && (
                <>
                  <div className="strike-section-heading">
                    <div>
                      <h3>Stay in control</h3>
                      <p>Your aim, audio and display.</p>
                    </div>
                  </div>
                  {matchNotice}
                  <div className="strike-quick-actions">
                    {displayActions ?? (
                      <div>
                        <button
                          type="button"
                          aria-pressed={settings.volume === 0}
                          onClick={() => {
                            if (settings.volume > 0) lastVolume.current = settings.volume;
                            onChange({
                              ...settings,
                              volume: settings.volume > 0 ? 0 : lastVolume.current,
                            });
                          }}
                        >
                          {settings.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                          {settings.volume === 0 ? "Enable audio" : "Mute audio"}
                        </button>
                        <FullscreenButton />
                      </div>
                    )}
                  </div>
                  <section className="strike-settings-card" aria-label="Controls">
                    <label className="strike-slider">
                      <span>Mouse sensitivity</span>
                      <output>{settings.sensitivity.toFixed(2)}×</output>
                      <input
                        aria-label="Mouse sensitivity"
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.05"
                        value={settings.sensitivity}
                        onChange={(e) =>
                          onChange({ ...settings, sensitivity: Number(e.target.value) })
                        }
                      />
                      <small>
                        Slower, precise aim <span>Faster turns</span>
                      </small>
                    </label>
                    <label className="strike-slider">
                      <span>Sound volume</span>
                      <output>{Math.round(settings.volume * 100)}%</output>
                      <input
                        aria-label="Sound volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={settings.volume}
                        onChange={(e) => onChange({ ...settings, volume: Number(e.target.value) })}
                      />
                    </label>
                    {general}
                  </section>
                </>
              )}
              {tab === "crosshair" && (
                <>
                  <div className="strike-section-heading">
                    <div>
                      <h3>Find your focus</h3>
                      <p>A clear sight, your way.</p>
                    </div>
                  </div>
                  <div className="strike-crosshair-stage">
                    <StrikeCrosshair settings={settings} preview />
                    <span>LIVE PREVIEW</span>
                    <small>{CROSSHAIRS[settings.crosshair]}</small>
                  </div>
                  <fieldset className="strike-crosshair-field">
                    <legend>Style</legend>
                    <div className="strike-crosshair-options">
                      {CROSSHAIRS.map((name, index) => (
                        <button
                          type="button"
                          key={name}
                          aria-label={name}
                          aria-pressed={settings.crosshair === index}
                          onClick={() => onChange({ ...settings, crosshair: index })}
                        >
                          <StrikeCrosshair settings={{ ...settings, crosshair: index }} preview />
                          <span>{name}</span>
                          {settings.crosshair === index && (
                            <Check className="strike-option-check" size={12} />
                          )}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="strike-crosshair-colors">
                    <span>Color</span>
                    <div>
                      {COLORS.map((color) => (
                        <button
                          type="button"
                          key={color}
                          aria-label={`Crosshair color ${color}`}
                          aria-pressed={settings.color.toLowerCase() === color}
                          style={{ "--swatch": color } as CSSProperties}
                          onClick={() => onChange({ ...settings, color })}
                        />
                      ))}
                    </div>
                    <label>
                      <span className="sr-only">Custom crosshair color</span>
                      <input
                        aria-label="Custom crosshair color"
                        type="color"
                        value={settings.color}
                        onChange={(e) => onChange({ ...settings, color: e.target.value })}
                      />
                      <span>Custom</span>
                    </label>
                  </div>
                </>
              )}
              {tab === "keys" && extra}
            </section>
          </div>
        </div>
        <footer className="strike-settings-actions">
          <span className="strike-resume-hint">
            <kbd>Esc</kbd> Back to the action
          </span>
          {onLeavePractice && (
            <button
              type="button"
              className="duel-secondary"
              onClick={onLeavePractice}
              disabled={leavingPractice}
              aria-busy={leavingPractice}
            >
              {leavingPractice ? "Leaving…" : "Leave practice"}
            </button>
          )}
          {leaveAction}
          <button
            type="button"
            className="duel-primary"
            onClick={onResume}
            disabled={leavingPractice}
          >
            <ArrowLeft size={16} /> Resume game
          </button>
          {onLeavePractice && leaveError && (
            <p className="duel-error" role="alert">
              {leaveError}
            </p>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
