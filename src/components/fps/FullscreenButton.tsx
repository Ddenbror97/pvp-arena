import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";

/** Fullscreen the document so portalled Esc menus remain available in every FPS mode. */
export function FullscreenButton({
  className,
  onError,
}: {
  className?: string;
  onError?: (message: string) => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, setPending] = useState(false);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    sync();
    setAvailable(
      document.fullscreenEnabled !== false &&
        typeof document.documentElement.requestFullscreen === "function",
    );
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={fullscreen}
      disabled={pending || !available}
      title={!available ? "Fullscreen is unavailable in this browser" : undefined}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
          setFullscreen(!!document.fullscreenElement);
        } catch {
          onError?.("Fullscreen is unavailable in this browser.");
        } finally {
          setPending(false);
        }
      }}
    >
      {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
      {fullscreen ? "Exit fullscreen" : "Fullscreen"}
    </button>
  );
}
