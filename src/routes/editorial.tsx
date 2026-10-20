import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { seoHead, type Faq } from "@/components/seo/seo-head";
import { CORRECTIONS_EMAIL } from "@/lib/seo/publisher";

const TITLE = "Editorial Policy: Who Writes PVPspinArena Guides";
const DESC =
  "PVPspinArena guides are site explainers with no named author. Dates, sources, corrections, and what these pages do not claim.";

const FAQS: Faq[] = [
  {
    q: "Who writes the guides?",
    a: "No individual author is named. The guides are explainers published by PVPspinArena. They are not a specialist's signed review, and a page does not become human-reviewed because it was edited.",
  },
  {
    q: "What does the date on a guide mean?",
    a: "The date is the last material update stored for that guide. The site does not keep a separate first-published date, so the page does not show one.",
  },
  {
    q: "How do I report a mistake?",
    a: "Email contact@pvpspinarena.com with the page address and the sentence you think is wrong. A correction is not promised on a timer.",
  },
];

export const Route = createFileRoute("/editorial")({
  head: () =>
    seoHead({
      path: "/editorial",
      title: TITLE,
      description: DESC,
      crumb: "Editorial",
      faqs: FAQS,
    }),
  component: EditorialPage,
});

function EditorialPage() {
  return (
    <LegalPage title="Editorial policy">
      <p>
        <strong>Last updated October 20, 2026.</strong>
      </p>
      <p>
        This page says who is responsible for the writing on PVPspinArena and what that writing is
        allowed to claim. It does not add an author, a licence, or a review that the site does not
        have.
      </p>

      <h2>Who publishes the pages</h2>
      <p>
        Guides, game explanations, and the pages linked from the footer are published by
        PVPspinArena. No person is named as the author, because no verified biography is on file for
        these pages. Do not read a byline into the <Link to="/about">About</Link> page. The
        organization name there is the publisher, not a claim about a particular writer&apos;s
        career.
      </p>
      <p>
        Editing a page, including an edit made to correct a fee or a game list, is not a
        human-reviewed seal. Nothing on this site should be described as expert-reviewed unless a
        named person actually reviewed it and that review is stated in those words.
      </p>

      <h2>What a guide is</h2>
      <p>
        A guide explains a topic: a game rule, a wallet step, a probability, or how to read a casino
        claim. It is not legal advice, tax advice, or a betting recommendation. It is not a promise
        that a strategy makes money.
      </p>
      <p>
        Where a guide gives an example with dollars or odds, the example is there so the arithmetic
        can be checked. It is not a prediction of your result.
      </p>
      <p>
        Pages about other companies describe those companies only as far as the cited source goes. A
        blank or the words &quot;not published&quot; mean this site did not verify that cell. They
        are not a hidden yes or no.
      </p>

      <h2>Dates</h2>
      <p>
        Each guide shows one date, the last material update. There is no separate first-published
        date in the content record, so the page does not invent one, and the article markup uses
        that update as dateModified only. A date is not a claim that a lawyer, an auditor, or a
        player re-tested the page that day.
      </p>

      <h2>Sources</h2>
      <p>
        Some guides list sources under the article. A source is included when it supports a specific
        claim on that page. A link is not an endorsement of the other site, and it is not evidence
        for a sentence it does not discuss. Guides that compare outside products and cannot verify a
        fee, a licence, or a payout leave that cell as not published instead of guessing.
      </p>

      <h2>Game rules on this site</h2>
      <p>
        Statements about Jackpot, Coinflip, Roulette, P2P Slott, and Poker should match the{" "}
        <Link to="/terms">Terms</Link> and <Link to="/how-it-works">How it works</Link>. The fee
        figures in those pages are the public rules. A guide that still says this site has no poker,
        or that it has only four games, is wrong and should be reported.
      </p>
      <p>
        Provably fair, on this site, means a committed seed can be recomputed after the round on the{" "}
        <Link to="/fairness">Fairness</Link> page. It does not mean a result is favourable, that
        funds are insured, or that a wallet cannot be compromised.
      </p>

      <h2>What these pages do not claim</h2>
      <ul>
        <li>No gambling licence number is stated, because none is published here.</li>
        <li>No independent audit firm is named, because none is published here.</li>
        <li>No customer rating or review count is published as a score.</li>
        <li>No player count, revenue, or payout total is published as a statistic.</li>
        <li>No physical address or registered company number is published on the site.</li>
      </ul>
      <p>
        If one of those facts is later verified, it belongs on <Link to="/about">About</Link> or{" "}
        <Link to="/terms">Terms</Link> first, and only then in a guide.
      </p>

      <h2>Corrections</h2>
      <p>
        Send the page address and the sentence to{" "}
        <a href={`mailto:${CORRECTIONS_EMAIL}`}>{CORRECTIONS_EMAIL}</a>. That mailbox is also the
        contact address in the footer. This page does not promise a response time.
      </p>

      <h2>Questions</h2>
      {FAQS.map((faq) => (
        <div key={faq.q}>
          <h3>{faq.q}</h3>
          <p>{faq.a}</p>
        </div>
      ))}
    </LegalPage>
  );
}
