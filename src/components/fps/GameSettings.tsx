import type { CSSProperties, ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { StrikeSettings } from "@/lib/fps/settings";
export const CROSSHAIRS = ["Dynamic cross", "Dot", "Circle", "Cross and dot", "Static cross"];
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
  extra,
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
  /** Mode-specific sections (the battle royale's view distance and key bindings). */
  extra?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="strike-settings" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle>Game settings</DialogTitle>
        {matchNotice}
        <DialogDescription>
          Changes apply immediately and are saved on this device. The match continues while this
          menu is open.
        </DialogDescription>
        {displayActions}
        <label>
          Mouse sensitivity <output>{settings.sensitivity.toFixed(2)}×</output>
          <input
            aria-label="Mouse sensitivity"
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={settings.sensitivity}
            onChange={(e) => onChange({ ...settings, sensitivity: Number(e.target.value) })}
          />
        </label>
        <label>
          Sound volume <output>{Math.round(settings.volume * 100)}%</output>
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
        <fieldset>
          <legend>Crosshair</legend>
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
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          Crosshair color{" "}
          <input
            aria-label="Crosshair color"
            type="color"
            value={settings.color}
            onChange={(e) => onChange({ ...settings, color: e.target.value })}
          />
        </label>
        <label>
          Reduced motion (calmer knife animations){" "}
          <input
            aria-label="Reduced motion"
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => onChange({ ...settings, reducedMotion: e.target.checked })}
          />
        </label>
        {extra}
        {/* Always in view at the foot of the menu (owner, 2026-11-05: leave from Esc). */}
        <div className="strike-settings-actions">
          <button
            type="button"
            className="duel-primary"
            onClick={onResume}
            disabled={leavingPractice}
          >
            Resume game
          </button>
          {onLeavePractice && (
            <>
              <button
                type="button"
                className="duel-secondary"
                onClick={onLeavePractice}
                disabled={leavingPractice}
                aria-busy={leavingPractice}
              >
                {leavingPractice ? "Leaving practice…" : "Leave practice"}
              </button>
              {leaveError && (
                <p className="duel-error" role="alert">
                  {leaveError}
                </p>
              )}
            </>
          )}
          {leaveAction}
        </div>
      </DialogContent>
    </Dialog>
  );
}
