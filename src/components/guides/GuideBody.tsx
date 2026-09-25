import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { isPublishedGuide } from "@/content/guides";

/** Inline: **bold** and [text](/path). Links to unpublished guides render as plain text. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((\/[^)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(<strong key={k} className="font-semibold text-foreground">{m[1]}</strong>);
    else {
      const href = m[3] ?? "/";
      const label = m[2] ?? "";
      const isGuide = href.startsWith("/guides/");
      if (isGuide && !isPublishedGuide(href.slice(8))) out.push(<Fragment key={k}>{label}</Fragment>);
      else if (isGuide)
        out.push(
          <Link key={k} to="/guides/$slug" params={{ slug: href.slice(8) }} className="font-medium text-primary underline-offset-4 hover:underline">
            {label}
          </Link>,
        );
      else
        out.push(
          <Link key={k} to={href} className="font-medium text-primary underline-offset-4 hover:underline">
            {label}
          </Link>,
        );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function GuideBody({ body, id }: { body: string; id: string }) {
  const blocks = body.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((b, bi) => {
        const k = `${id}-${bi}`;
        if (b.startsWith("### ")) return <h3 key={k} className="mt-8 font-display text-lg text-foreground">{b.slice(4)}</h3>;
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={k} className="list-disc space-y-2 pl-5">
              {lines.map((l, li) => <li key={li}>{inline(l.slice(2), `${k}-${li}`)}</li>)}
            </ul>
          );
        if (lines.every((l) => /^\d+\. /.test(l)))
          return (
            <ol key={k} className="list-decimal space-y-2 pl-5">
              {lines.map((l, li) => <li key={li}>{inline(l.replace(/^\d+\. /, ""), `${k}-${li}`)}</li>)}
            </ol>
          );
        return <p key={k}>{inline(b, k)}</p>;
      })}
    </>
  );
}
