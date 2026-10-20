/** Root document head. Unknown URLs are noindex in the server head, not only in the body. */
export function rootHead(notFound: boolean, stylesheet: string, slotStage: string) {
  const meta: {
    charSet?: string;
    name?: string;
    property?: string;
    content?: string;
    title?: string;
  }[] = [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "theme-color", content: "#080b19" },
  ];
  if (notFound) {
    meta.push(
      { title: "Page not found | PVPspinArena" },
      { name: "description", content: "That page is not on PVPspinArena." },
      { name: "robots", content: "noindex" },
    );
  } else {
    meta.push(
      { title: "PVPspinArena — PvP Crypto Jackpot" },
      {
        name: "description",
        content: "Live PvP jackpot with provably fair, server-decided draws.",
      },
    );
  }
  return {
    meta,
    links: [
      { rel: "stylesheet", href: stylesheet },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      {
        rel: "preload",
        as: "image" as const,
        href: slotStage,
        type: "image/webp",
        fetchPriority: "high" as const,
      },
    ],
  };
}
