import { cn } from "@/lib/utils";

export function PlayerAvatar({ src, name, className, color }: { src?: string | null | undefined; name?: string | undefined; className?: string | undefined; color?: string | undefined }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2", className)}
      style={{ ["--tw-ring-color" as string]: color ?? "var(--border)" }}
    >
      {src ? (
        <img src={src} alt={name ?? ""} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="font-display text-xs">{name?.[0]?.toUpperCase() ?? "?"}</span>
      )}
    </span>
  );
}
