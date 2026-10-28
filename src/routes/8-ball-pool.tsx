import { createFileRoute } from "@tanstack/react-router";
import room from "@/assets/pool/room.webp";
import { PoolLobby } from "@/components/pool/PoolLobby";
import { POOL_FAQS, POOL_PAGE_DESCRIPTION, POOL_PAGE_TITLE } from "@/components/pool/PoolMoneyCopy";
import { GameFacts } from "@/components/seo/GameFacts";
import { loadPoolPaint, useQuerySeed } from "@/lib/first-paint";
import { OG_SITE_URL } from "@/lib/og";
import { indexableHead } from "@/lib/seo/indexable-head";

const PATH = "/8-ball-pool";

export const Route = createFileRoute("/8-ball-pool")({
  head: () => {
    const base = indexableHead({
      path: PATH,
      title: POOL_PAGE_TITLE,
      description: POOL_PAGE_DESCRIPTION,
      crumb: "8 Ball Pool",
      extraLinks: [
        {
          rel: "preload",
          as: "image",
          href: room,
          type: "image/webp",
          fetchPriority: "high",
        },
      ],
    });
    const url = `${OG_SITE_URL}${PATH}`;
    return {
      ...base,
      scripts: [
        ...base.scripts,
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": ["VideoGame", "Game"],
                name: "8 Ball Pool for Real Money",
                url,
                description: POOL_PAGE_DESCRIPTION,
                playMode: "MultiPlayer",
                applicationCategory: "Game",
                gamePlatform: "Web browser",
                numberOfPlayers: {
                  "@type": "QuantitativeValue",
                  minValue: 2,
                  maxValue: 2,
                },
                publisher: {
                  "@type": "Organization",
                  name: "PVPspinArena",
                  url: `${OG_SITE_URL}/`,
                },
              },
              {
                "@type": "FAQPage",
                mainEntity: POOL_FAQS.map((faq) => ({
                  "@type": "Question",
                  name: faq.q,
                  acceptedAnswer: { "@type": "Answer", text: faq.a },
                })),
              },
            ],
          }),
        },
      ],
    };
  },
  loader: ({ location }) => loadPoolPaint(location.pathname),
  component: EightBallPage,
});

function EightBallPage() {
  const paint = Route.useLoaderData();
  useQuerySeed([[["pool-lobby"], paint.lobby]]);
  return (
    <>
      <PoolLobby />
      <div className="pool-facts px-4 pb-24 sm:px-6 lg:pb-10">
        <GameFacts game="pool" />
      </div>
    </>
  );
}
