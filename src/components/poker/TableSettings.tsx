import { useSyncExternalStore } from "react";
import { Settings2, Volume2, VolumeX } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { setSoundMuted, soundMuted, subscribeSound } from "@/lib/sound";
import { setPokerPrefs, usePokerPrefs } from "@/lib/poker/prefs";
import { playPokerSfx } from "@/lib/poker/audio";
import { DEALER_LINES } from "@/lib/poker/dealer-lines";
import { previewDealerVoice } from "./usePresentation";

function Range({
  label,
  value,
  onChange,
  onCommit,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** Fires when the user releases the slider. */
  onCommit?: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-foreground/85">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="poker-slider w-28"
        aria-label={`${label} volume`}
      />
    </label>
  );
}

/** Sound, dealer voice and motion preferences for the table. */
export function TableSettings({ voiceAvailable }: { voiceAvailable: boolean }) {
  const prefs = usePokerPrefs();
  const muted = useSyncExternalStore(subscribeSound, soundMuted, () => false);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="poker-icon-btn"
          aria-label="Table sound and motion settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm">Sound</span>
          <button
            type="button"
            className="poker-icon-btn"
            onClick={() => setSoundMuted(!muted)}
            aria-label={muted ? "Unmute all sound" : "Mute all sound"}
            aria-pressed={muted}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
        <Range
          label="Effects"
          value={prefs.effectsVolume}
          disabled={muted}
          onChange={(v) => {
            setPokerPrefs({ effectsVolume: v });
            playPokerSfx("chip");
          }}
        />
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Dealer voice
            {!voiceAvailable ? (
              <span className="block text-[11px] text-muted-foreground">
                Not supported in this browser
              </span>
            ) : null}
          </span>
          <Switch
            checked={prefs.voice && voiceAvailable}
            disabled={!voiceAvailable}
            onCheckedChange={(v) => {
              setPokerPrefs({ voice: v });
              if (v) previewDealerVoice();
            }}
            aria-label="Dealer voice"
          />
        </label>
        <Range
          label="Voice"
          value={prefs.voiceVolume}
          disabled={!prefs.voice || muted}
          onChange={(v) => setPokerPrefs({ voiceVolume: v })}
          onCommit={() => previewDealerVoice(DEALER_LINES.voiceLevel)}
        />
        {prefs.voice && muted ? (
          <p className="text-[11px] text-amber-300/90">Sound is muted, so the dealer is silent.</p>
        ) : null}
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Fast animations</span>
          <Switch
            checked={prefs.fast}
            onCheckedChange={(v) => setPokerPrefs({ fast: v })}
            aria-label="Fast animations"
          />
        </label>
        <p className="text-[11px] leading-snug text-muted-foreground">
          The dealer voice uses your device's speech engine. Your system's reduced-motion setting
          turns card flights off.
        </p>
      </PopoverContent>
    </Popover>
  );
}
