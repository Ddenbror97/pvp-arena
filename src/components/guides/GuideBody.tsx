import { createContext, Fragment, useContext, useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LinkTargets } from "@/lib/guides/pages";

type Targets = { guides: ReadonlySet<string>; topics: ReadonlySet<string> };
const NONE: Targets = { guides: new Set(), topics: new Set() };
const TargetsCtx = createContext<Targets>(NONE);

/** Guide and topic slugs that InternalLink may turn into links on this page. */
export function GuideLinkTargets({ links, children }: { links: LinkTargets; children: ReactNode }) {
  const value = useMemo(
    () => ({ guides: new Set(links.guides), topics: new Set(links.topics) }),
    [links],
  );
  return <TargetsCtx.Provider value={value}>{children}</TargetsCtx.Provider>;
}

const SITE = new Set([
  "/",
  "/coinflip",
  "/roulette",
  "/slott",
  "/fairness",
  "/about",
  "/how-it-works",
  "/terms",
  "/privacy",
  "/responsible-gambling",
  "/wallet",
  "/profile",
  "/guides",
  "/auth",
]);

type SitePath =
  | "/"
  | "/coinflip"
  | "/roulette"
  | "/slott"
  | "/fairness"
  | "/about"
  | "/how-it-works"
  | "/terms"
  | "/privacy"
  | "/responsible-gambling"
  | "/wallet"
  | "/profile"
  | "/guides"
  | "/auth";

/** Only published guides and topic hubs (from GuideLinkTargets) and real site routes become links. Anything else stays text so a typo cannot 404. */
export function InternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const targets = useContext(TargetsCtx);
  const hashAt = href.indexOf("#");
  const hash = hashAt >= 0 ? href.slice(hashAt + 1) : undefined;
  const path =
    ((hashAt >= 0 ? href.slice(0, hashAt) : href).split("?")[0] ?? "").replace(/\/$/, "") || "/";
  const classNames = className ?? "font-medium text-primary underline-offset-4 hover:underline";
  if (path.startsWith("/guides/topics/")) {
    const topic = path.slice("/guides/topics/".length);
    if (!targets.topics.has(topic)) return <Fragment>{children}</Fragment>;
    return (
      <Link
        to="/guides/topics/$topic"
        params={{ topic }}
        {...(hash ? { hash } : {})}
        className={classNames}
      >
        {children}
      </Link>
    );
  }
  if (path.startsWith("/guides/") && path !== "/guides") {
    const slug = path.slice("/guides/".length);
    if (!slug || slug.includes("/") || !targets.guides.has(slug))
      return <Fragment>{children}</Fragment>;
    return (
      <Link to="/guides/$slug" params={{ slug }} {...(hash ? { hash } : {})} className={classNames}>
        {children}
      </Link>
    );
  }
  if (!SITE.has(path)) return <Fragment>{children}</Fragment>;
  return (
    <Link to={path as SitePath} {...(hash ? { hash } : {})} className={classNames}>
      {children}
    </Link>
  );
}

/** Inline: **bold** and [text](/path). */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((\/[^)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1])
      out.push(
        <strong key={k} className="font-semibold text-foreground">
          {m[1]}
        </strong>,
      );
    else
      out.push(
        <InternalLink key={k} href={m[3] ?? "/"}>
          {m[2]}
        </InternalLink>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function GuideInline({ text }: { text: string }) {
  return <>{inline(text, "inline")}</>;
}

export function GuideBody({ body, id }: { body: string; id: string }) {
  const blocks = body.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((b, bi) => {
        const k = `${id}-${bi}`;
        if (b.startsWith("### "))
          return (
            <h3 key={k} className="mt-8 font-display text-lg text-foreground">
              {b.slice(4)}
            </h3>
          );
        const lines = b.split("\n");
        const headerLine = lines[0];
        const separator = lines[1];
        if (
          headerLine &&
          separator &&
          lines.length >= 2 &&
          lines.every((l) => l.includes("|")) &&
          /^[\s|:-]+$/.test(separator)
        ) {
          const cells = (row: string) =>
            row
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim());
          const headers = cells(headerLine);
          return (
            <div key={k} className="overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="border-b border-border px-3 py-2 text-left font-semibold text-foreground"
                      >
                        {inline(h, `${k}-h-${h}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.slice(2).map((row, ri) => (
                    <tr key={ri} className="border-b border-border/70">
                      {cells(row).map((c, ci) => (
                        <td key={ci} className="px-3 py-2 align-top">
                          {inline(c, `${k}-${ri}-${ci}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={k} className="list-disc space-y-2 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.slice(2), `${k}-${li}`)}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\d+\. /.test(l)))
          return (
            <ol key={k} className="list-decimal space-y-2 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\d+\. /, ""), `${k}-${li}`)}</li>
              ))}
            </ol>
          );
        return <p key={k}>{inline(b, k)}</p>;
      })}
    </>
  );
}
