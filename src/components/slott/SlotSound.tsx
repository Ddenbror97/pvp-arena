import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundMuted, subscribeSound, toggleSoundMuted } from "@/lib/sound";
import { setSlotVolume, slotVolume, subscribeSlotVolume } from "./sfx";

/** Mute uses the site-wide preference. The slider is the slot mix, saved on this device. */
export function SlotSoundControl() {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  useEffect(() => {
    const sync = () => {
      setMuted(soundMuted());
      setVolume(slotVolume());
    };
    sync();
    const unsubMute = subscribeSound(sync);
    const unsubVolume = subscribeSlotVolume(sync);
    return () => {
      unsubMute();
      unsubVolume();
    };
  }, []);
  const silent = muted || volume <= 0;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => toggleSoundMuted()}
        aria-label={muted ? "Unmute game sounds" : "Mute game sounds"}
        aria-pressed={muted}
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-foreground"
      >
        {silent ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(volume * 100)}
        disabled={muted}
        aria-label="Slot volume"
        onChange={(e) => setSlotVolume(Number(e.target.value) / 100)}
        className="h-5 w-14 cursor-pointer accent-primary disabled:opacity-40 sm:w-20"
      />
    </div>
  );
}
