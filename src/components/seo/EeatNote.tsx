import { Link } from "@tanstack/react-router";
import { CORRECTIONS_EMAIL } from "@/lib/seo/publisher";

export function EeatNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm leading-relaxed text-muted-foreground ${className}`}>
      No individual author is named. These pages are explainers from the site, not a specialist
      review and not legal, tax, or betting advice. The{" "}
      <Link to="/editorial" className="text-primary hover:underline">
        editorial policy
      </Link>{" "}
      says what the date and the sources mean. Send corrections to{" "}
      <a href={`mailto:${CORRECTIONS_EMAIL}`} className="text-primary hover:underline">
        {CORRECTIONS_EMAIL}
      </a>
      .
    </p>
  );
}

export function PublishedBy({ updated, label }: { updated: string; label: string }) {
  return (
    <span>
      Published by{" "}
      <Link to="/about" className="text-foreground/80 hover:text-primary">
        PVPspinArena
      </Link>{" "}
      · Updated <time dateTime={updated}>{label}</time>
    </span>
  );
}
