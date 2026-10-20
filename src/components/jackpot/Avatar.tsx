import { useState } from "react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";

// Avatars that have already painted. A new <img> starts transparent until
// onLoad, so navigating between the game pages faded every face back in.
const paintedAvatars = new Set<string>();

/**
 * The one avatar renderer for every surface. `previewSrc` is only for the
 * player's own unsaved crop preview and accepts local `blob:` URLs only.
 */
export function PlayerAvatar({
  src,
  name,
  className,
  color,
  previewSrc,
}: {
  src?: string | null | undefined;
  name?: string | undefined;
  className?: string | undefined;
  color?: string | undefined;
  previewSrc?: string | null | undefined;
}) {
  const safe = previewSrc?.startsWith("blob:") ? previewSrc : avatarSrc(src);
  const known = !!safe && paintedAvatars.has(safe);
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const show = safe && failed !== safe;
  const visible = known || loaded === safe;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-clip rounded-[8%] bg-muted ring-2",
        className,
      )}
      style={{ ["--tw-ring-color" as string]: color ?? "var(--border)" }}
    >
      {show && !visible ? (
        <span className="absolute inset-0 grid place-items-center font-display text-xs">
          {name?.[0]?.toUpperCase() ?? "?"}
        </span>
      ) : null}
      {show ? (
        <img
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0 && loaded !== safe) setLoaded(safe);
          }}
          src={safe}
          alt={name ?? ""}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            visible ? "opacity-100" : "opacity-0",
          )}
          loading={known ? "eager" : "lazy"}
          decoding={known ? "sync" : "async"}
          draggable={false}
          referrerPolicy="no-referrer"
          onLoad={() => {
            if (safe) paintedAvatars.add(safe);
            setLoaded(safe);
          }}
          onError={() => setFailed(safe)}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center font-display text-xs">
          {name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </span>
  );
}
