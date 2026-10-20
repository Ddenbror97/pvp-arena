import { useState } from "react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";

/**
 * The one avatar renderer for every surface. `previewSrc` is only for the
 * player's own unsaved crop preview and accepts local `blob:` URLs only.
 * The photo is in the document at full opacity, with the letter behind it, so a
 * hard refresh paints the face as soon as the bytes arrive. It does not wait
 * for hydration to flip an opacity gate.
 */
export function PlayerAvatar({
  src,
  name,
  className,
  color,
  previewSrc,
  priority = false,
}: {
  src?: string | null | undefined;
  name?: string | undefined;
  className?: string | undefined;
  color?: string | undefined;
  previewSrc?: string | null | undefined;
  /** Eager, high-priority fetch for faces that are on screen at first paint. */
  priority?: boolean | undefined;
}) {
  const safe = previewSrc?.startsWith("blob:") ? previewSrc : avatarSrc(src);
  const [failed, setFailed] = useState<string | null>(null);
  const show = !!safe && failed !== safe;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-clip rounded-[8%] bg-muted ring-2",
        className,
      )}
      style={{ ["--tw-ring-color" as string]: color ?? "var(--border)" }}
    >
      <span className="absolute inset-0 grid place-items-center font-display text-xs">
        {name?.[0]?.toUpperCase() ?? "?"}
      </span>
      {show ? (
        <img
          src={safe}
          alt={name ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailed(safe)}
        />
      ) : null}
    </span>
  );
}
