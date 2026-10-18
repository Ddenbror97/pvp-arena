import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { installGameSounds, soundMuted, subscribeSound, toggleSoundMuted } from "@/lib/sound";

/** Header control for the shared game-sound bus. First paint assumes sound is on. */
export function SoundToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    installGameSounds();
    const sync = () => setMuted(soundMuted());
    sync();
    const unsubscribe = subscribeSound(sync);
    return () => {
      unsubscribe();
    };
  }, []);

  const label = muted ? "Unmute game sounds" : "Mute game sounds";
  return (
    <button
      type="button"
      onClick={() => toggleSoundMuted()}
      aria-label={label}
      aria-pressed={muted}
      title={label}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[var(--header-muted)] transition-colors hover:bg-[var(--header-hover)] hover:text-[var(--header-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--header-accent)]"
    >
      {muted ? (
        <VolumeX className="h-5 w-5" aria-hidden />
      ) : (
        <Volume2 className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
