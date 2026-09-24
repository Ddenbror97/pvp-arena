import { useState } from "react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";

export function PlayerAvatar({ src, name, className, color }: { src?: string | null | undefined; name?: string | undefined; className?: string | undefined; color?: string | undefined }) {
  const safe = avatarSrc(src);
  const [failed, setFailed] = useState<string | null>(null);
  const show = safe && failed !== safe;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2", className)}
      style={{ ["--tw-ring-color" as string]: color ?? "var(--border)" }}
    >
      {show ? (
        <img src={safe} alt={name ?? ""} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(safe)} />
      ) : (
        <span className="font-display text-xs">{name?.[0]?.toUpperCase() ?? "?"}</span>
      )}
    </span>
  );
}
