import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-base [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:font-display [&_h3]:text-sm [&_h3]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <h1 className="font-display text-3xl text-foreground">{title}</h1>
      {children}
    </article>
  );
}
