import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-base [&_h2]:text-foreground">
      <h1 className="font-display text-3xl text-foreground">{title}</h1>
      <p className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-gold">
        Draft placeholder. This page must be reviewed by counsel for each jurisdiction before any real-money launch.
      </p>
      {children}
    </article>
  );
}
