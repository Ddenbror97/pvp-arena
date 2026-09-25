import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { OG_SITE_URL, ogImageMeta } from "@/lib/og";

export type Faq = { q: string; a: string };

/** Builds head() for an SEO content page: meta, canonical and JSON-LD (WebPage, BreadcrumbList, FAQPage). */
export function seoHead(opts: { path: string; title: string; description: string; crumb: string; faqs: Faq[] }) {
  const url = `${OG_SITE_URL}${opts.path}`;
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", "@id": url, url, name: opts.title, description: opts.description, inLanguage: "en" },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${OG_SITE_URL}/` },
                { "@type": "ListItem", position: 2, name: opts.crumb, item: url },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: opts.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  };
}

export function SeoPage({ children }: { children: ReactNode }) {
  return <article className="mx-auto w-full max-w-6xl space-y-16 pb-8 sm:space-y-24">{children}</article>;
}

export function SeoHero(props: {
  crumb: string;
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
  primary: { to: string; label: string };
  secondary: { to: string; label: string };
}) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-10 sm:px-10 sm:py-16">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-rival/10 blur-3xl" />
      <nav aria-label="Breadcrumb" className="relative text-xs text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li><Link to="/" className="hover:text-primary">Home</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">{props.crumb}</li>
        </ol>
      </nav>
      <p className="relative mt-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>
      <h1 className="relative mt-3 max-w-3xl font-display text-3xl leading-tight sm:text-5xl">{props.title}</h1>
      <div className="relative mt-5 max-w-2xl space-y-3 text-base leading-relaxed text-muted-foreground">{props.children}</div>
      <div className="relative mt-8 flex flex-wrap items-center gap-5">
        <Link to={props.primary.to} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          {props.primary.label} <ArrowRight className="h-4 w-4" />
        </Link>
        <SeoLink to={props.secondary.to}>{props.secondary.label}</SeoLink>
      </div>
    </header>
  );
}

export function SeoSection(props: { id?: string; eyebrow?: string; title: string; intro?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section id={props.id} aria-labelledby={props.id ? `${props.id}-h` : undefined} className={cn("scroll-mt-24", props.className)}>
      {props.eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">{props.eyebrow}</p>}
      <h2 id={props.id ? `${props.id}-h` : undefined} className="mt-2 max-w-3xl font-display text-2xl leading-tight sm:text-3xl">{props.title}</h2>
      {props.intro && <div className="mt-4 max-w-3xl space-y-3 leading-relaxed text-muted-foreground">{props.intro}</div>}
      {props.children && <div className="mt-8">{props.children}</div>}
    </section>
  );
}

export function SeoCard(props: { icon?: ReactNode; title: string; children: ReactNode; className?: string; accent?: "primary" | "rival" | "gold" }) {
  const tone = props.accent === "rival" ? "text-rival bg-rival/10" : props.accent === "gold" ? "text-gold bg-gold/10" : "text-primary bg-primary/10";
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", props.className)}>
      {props.icon && <div className={cn("mb-4 grid h-10 w-10 place-items-center rounded-xl", tone)}>{props.icon}</div>}
      <h3 className="font-display text-base">{props.title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{props.children}</div>
    </div>
  );
}

export function SeoGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = cols === 2 ? "sm:grid-cols-2" : cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return <div className={cn("grid gap-4", c)}>{children}</div>;
}

/** Vertical/horizontal flow of labelled stages. */
export function SeoFlow({ steps }: { steps: { label: string; text: string }[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-5">
      {steps.map((s, i) => (
        <li key={s.label} className="relative rounded-2xl border border-border bg-card p-4">
          <span className="tabular font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="mt-1 font-display text-sm uppercase tracking-wider">{s.label}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function SeoCallout({ title, children, tone = "primary" }: { title: string; children: ReactNode; tone?: "primary" | "gold" }) {
  return (
    <aside className={cn("rounded-2xl border p-5 sm:p-6", tone === "gold" ? "border-gold/30 bg-gold/5" : "border-primary/30 bg-primary/5")}>
      <h3 className={cn("font-display text-base", tone === "gold" ? "text-gold" : "text-primary")}>{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </aside>
  );
}

export function SeoLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
      {children} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function SeoFaq({ faqs, title = "Frequently asked questions" }: { faqs: Faq[]; title?: string }) {
  return (
    <SeoSection id="faq" eyebrow="FAQ" title={title}>
      <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5">
        {faqs.map((f, i) => (
          <AccordionItem key={f.q} value={`f${i}`} className={i === faqs.length - 1 ? "border-b-0" : undefined}>
            <AccordionTrigger className="text-left font-display text-sm sm:text-base">{f.q}</AccordionTrigger>
            <AccordionContent className="leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SeoSection>
  );
}

export function SeoCta(props: { title: string; text: string; primary: { to: string; label: string }; secondary: { to: string; label: string } }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card px-5 py-12 text-center sm:px-10">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-2/3 rounded-full bg-primary/20 blur-3xl" />
      <h2 className="relative font-display text-2xl sm:text-3xl">{props.title}</h2>
      <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">{props.text}</p>
      <div className="relative mt-7 flex flex-wrap items-center justify-center gap-5">
        <Link to={props.primary.to} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {props.primary.label} <ArrowRight className="h-4 w-4" />
        </Link>
        <SeoLink to={props.secondary.to}>{props.secondary.label}</SeoLink>
      </div>
    </section>
  );
}
