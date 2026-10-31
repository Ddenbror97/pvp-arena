import { createFileRoute, Link } from "@tanstack/react-router";
import { FpsGameData, FpsMechanicsData } from "@/components/guides/FpsGameData";
import { SeoFaq } from "@/components/seo/SeoPage";
import { indexableHead } from "@/lib/seo/indexable-head";
import { OG_SITE_URL } from "@/lib/og";
import { STRIKE_SHOWCASE } from "@/lib/fps/showcase";
import { getFpsSeoSnapshot } from "@/lib/fps/seo-snapshot.functions";

const TITLE = "1v1 FPS for Real Money: PvPStrike Browser Duels";
const DESCRIPTION =
  "Play PvPStrike, a separate CS-style browser FPS. Practise first, review the 5% pot fee and compare real public cash-match results before entering a duel.";
const FAQS = [
  {
    q: "Is this Counter-Strike 2 in a browser?",
    a: "No. PvPStrike is an independent browser shooter with its own map, movement, damage and recoil. It is not affiliated with Valve or Riot.",
  },
  {
    q: "What does the winner receive?",
    a: "The winner is credited the combined entry pot after a 5% fee. With $10 each, a $20 pot yields $19 winner credit, including the winner’s original $10. Net match profit is $9.",
  },
  {
    q: "Can I practise before entering a cash match?",
    a: "Practice is a free solo match against the arena bot: first to seven wins (best of 13). Test movement, mouse capture and audio before choosing a cash match against another player.",
  },
  {
    q: "Is an FPS result provably fair like a random draw?",
    a: "No. The authoritative match server validates actions and decides the result. That is different from a commit-reveal random draw and does not guarantee every input is unaided.",
  },
  {
    q: "Does a match payout mean an instant withdrawal?",
    a: "No. Match settlement credits the account. Withdrawal eligibility, network, asset, minimum and payout availability are separate cashier conditions.",
  },
];
export const Route = createFileRoute("/fps-1v1")({
  loader: () => getFpsSeoSnapshot(),
  head: () => {
    const base = indexableHead({
      path: "/fps-1v1",
      title: TITLE,
      description: DESCRIPTION,
      crumb: "PvPStrike",
      extraLinks: [
        {
          rel: "preload",
          as: "image",
          href: STRIKE_SHOWCASE,
          type: "image/webp",
          fetchPriority: "high",
        },
      ],
    });
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
                "@type": "VideoGame",
                name: "PvPStrike",
                url: `${OG_SITE_URL}/fps-1v1`,
                description: DESCRIPTION,
                gamePlatform: "Desktop web browser",
                applicationCategory: "Game",
                playMode: "MultiPlayer",
                numberOfPlayers: { "@type": "QuantitativeValue", minValue: 2, maxValue: 2 },
                publisher: { "@type": "Organization", name: "PVPspinArena", url: OG_SITE_URL },
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQS.map((f) => ({
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
  },
  component: Page,
});
function Page() {
  const view = Route.useLoaderData();
  const link = "text-primary underline underline-offset-4";
  return (
    <article className="mx-auto max-w-6xl pb-12">
      <header className="relative isolate overflow-hidden rounded-2xl border border-border bg-card">
        <img
          src={STRIKE_SHOWCASE}
          alt="PvPStrike's purple-lit browser arena, with central cover and side containers"
          width="1672"
          height="941"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="relative bg-gradient-to-r from-background/95 via-background/85 to-background/40 px-6 py-14 sm:px-10 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            PvPStrike · desktop browser shooter
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">
            1v1 FPS for real money, with the fee clear before you play
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/85">
            Face one opponent in a best-of-five or best-of-nine aim duel. Win the series to receive
            the combined pot after the 5% fee. Start in practice and test the controls before
            choosing a cash entry.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/fps-duel"
              preload="intent"
              className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              Open lobby and practice
            </Link>
            <Link
              to="/guides/$slug"
              params={{ slug: "fps-for-money-hub" }}
              className="rounded-lg border border-border bg-background/80 px-5 py-3"
            >
              Read the match guide
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-xs text-muted-foreground">
            Independent CS-style game. Not CS2, not a Valve product. Desktop mouse and keyboard
            required. Cash play is for eligible adults where permitted; no earnings are guaranteed.
          </p>
        </div>
      </header>
      <section className="mt-10 grid gap-6 md:grid-cols-3" aria-label="Match essentials">
        {[
          [
            "One opponent, one series",
            "Each round tests positioning, rifle control and cover. Best-of-five needs three round wins; best-of-nine needs five. A winner recap separates rounds for three seconds.",
          ],
          [
            "Entries locked before play",
            "Both players review the terms. Public and private rooms are separate; only eligible public cash results enter the public sample below. Practice is not cash activity.",
          ],
          [
            "Result decided by the server",
            "The match server validates accepted movement, ammunition, hit zones and damage. A locally played shot sound does not itself prove a hit or settle a wager.",
          ],
        ].map(([title, text]) => (
          <section key={title} className="rounded-xl border border-border p-5">
            <h2 className="font-display text-xl">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </section>
        ))}
      </section>
      <section className="mt-10 rounded-2xl border border-border p-6" aria-labelledby="cost-title">
        <h2 id="cost-title" className="font-display text-2xl">
          What a win pays after the fee
        </h2>
        <p className="mt-4">
          The fee is 5% of both entries combined. These are worked examples, not recent match
          results.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <thead>
              <tr>
                {["Each entry", "Combined pot", "Fee", "Winner credit", "Winner net gain"].map(
                  (t) => (
                    <th key={t} className="p-2">
                      {t}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {[
                [1, 2, 0.1, 1.9, 0.9],
                [10, 20, 1, 19, 9],
                [25, 50, 2.5, 47.5, 22.5],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-border">
                  {row.map((n, i) => (
                    <td key={i} className="p-2">
                      ${n.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          A loss costs your full entry. Winner credit includes your own original stake. Balances use
          USD account units; crypto funding and withdrawals follow the cashier’s asset and network
          rules. A crypto FPS game does not imply a token reward or an instant on-chain payout.
        </p>
      </section>
      <FpsGameData view={view} />
      <FpsMechanicsData />
      <section className="my-8 rounded-2xl border border-border p-6">
        <h2 className="font-display text-2xl">Choose a drill before a stake</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          New to the arena? Start with{" "}
          <Link className={link} to="/guides/$slug" params={{ slug: "fps-1v1-strategy" }}>
            cover, bursts and reload timing
          </Link>
          . Comparing games? Read{" "}
          <Link className={link} to="/guides/$slug" params={{ slug: "cs2-1v1-for-money" }}>
            native CS2 versus browser duels
          </Link>
          . Check{" "}
          <Link className={link} to="/guides/$slug" params={{ slug: "cs2-anti-cheat" }}>
            what server authority can and cannot prove
          </Link>{" "}
          before treating a skill match as a provably-fair random draw.
        </p>
        <p className="mt-4">
          <Link className={link} to="/guides/topics/$topic" params={{ topic: "fps-and-aim" }}>
            All FPS and aim guides
          </Link>{" "}
          ·{" "}
          <Link className={link} to="/terms">
            Match and eligibility terms
          </Link>{" "}
          ·{" "}
          <Link className={link} to="/responsible-gambling">
            Responsible play
          </Link>
        </p>
      </section>
      <SeoFaq faqs={FAQS} />
    </article>
  );
}
