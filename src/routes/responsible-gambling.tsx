import { createFileRoute, Link } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/responsible-gambling")({
  head: () => ({
    meta: [
      { title: "Responsible Gambling — PVPspinArena" },
      {
        name: "description",
        content:
          "Responsible gambling on PVPspinArena: the cost of Jackpot, Coinflip, and Roulette, self-exclusion, and where to get help.",
      },
      { property: "og:title", content: "Responsible Gambling — PVPspinArena" },
      {
        property: "og:description",
        content: "How to keep play in bounds on PVPspinArena, and where to get help.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: ResponsiblePage,
});

function ResponsiblePage() {
  return (
    <LegalPage title="Responsible Gambling">
      <p>
        <strong>Last updated October 3, 2026.</strong>
      </p>
      <p>
        Jackpot, Coinflip, and Roulette are real-money games. They are not a way to make money or
        recover financial losses.
      </p>
      <p>
        Only play with money you can afford to lose, and stop if gambling stops feeling like
        entertainment.
      </p>

      <h2>What the Games Cost</h2>
      <p>
        Jackpot and Coinflip take a <strong>5% fee</strong> from the pot when the round settles. The
        winner receives the remaining 95%. P2P Slott takes a <strong>10% fee</strong> from the
        players&apos; pot when a player wins. The winner receives the remaining 90%, plus any
        promotional bonus added to that match. A draw refunds both stakes. If either player lands a
        bomb, the match ends and the house keeps both stakes.
      </p>
      <p>
        Roulette uses a 33-slot wheel (16 Purple, 16 Silver, 1 Green) that pays 2x on Purple and
        Silver and 14x on Green. A <strong>5% fee</strong> is then taken from each winning payout.
        After that fee, a Purple or Silver bet has a theoretical average return of about 92.12% of
        the stake, a <strong>7.88% house edge</strong>. A Green bet returns about 40.30%, a{" "}
        <strong>59.70% house edge</strong>.
      </p>
      <p>
        The <Link to="/terms">Terms</Link> explain the game rules and fees in more detail.
      </p>
      <p>
        A win does not change the cost of the next round. Increasing your stake to recover a
        previous loss can increase the amount you lose and the speed at which you lose it.
      </p>

      <h2>Before You Play</h2>
      <ul>
        <li>Set a spending limit before you start and stick to it.</li>
        <li>Do not deposit additional money simply to recover losses.</li>
        <li>Do not play with money needed for rent, food, bills, or other essential expenses.</li>
        <li>Do not play with borrowed money.</li>
        <li>
          Avoid gambling when you are upset, under the influence of alcohol or drugs, or trying to
          solve a financial problem.
        </li>
        <li>Take breaks and stop when you reach your personal limit.</li>
        <li>You must be 18 or older. Never allow anyone under 18 to use your account.</li>
      </ul>

      <h2>Self-Exclusion</h2>
      <p>
        If you want to stop using PVPspinArena, you can request self-exclusion for your account.
      </p>
      <p>
        Self-exclusion blocks the account from making deposits, placing wagers, and making
        withdrawals for the duration of the exclusion.
      </p>
      <p>Do not create or use another account to bypass a self-exclusion.</p>
      <p>
        Self-exclusion on PVPspinArena applies only to PVPspinArena. It does not prevent you from
        accessing other gambling services.
      </p>
      <p>
        If you need broader protection, consider using device or website blocking tools and any
        national, regional, or state self-exclusion programs available where you live.
      </p>

      <h2>Get Help</h2>
      <p>
        If gambling is causing financial, personal, or other harm, consider speaking with someone
        you trust and contacting a professional support service.
      </p>
      <p>Independent resources include:</p>
      <ul>
        <li>
          <strong>United States and Canada:</strong> <a href="tel:1-800-426-2537">1-800-GAMBLER</a>
        </li>
        <li>
          <strong>United States treatment referrals:</strong>{" "}
          <a
            href="https://www.samhsa.gov/find-help/national-helpline"
            target="_blank"
            rel="noopener noreferrer"
          >
            SAMHSA National Helpline
          </a>
        </li>
        <li>
          <strong>United Kingdom:</strong>{" "}
          <a href="https://www.gamcare.org.uk/" target="_blank" rel="noopener noreferrer">
            GamCare
          </a>
        </li>
        <li>
          <strong>International:</strong>{" "}
          <a href="https://www.gamblingtherapy.org/" target="_blank" rel="noopener noreferrer">
            Gambling Therapy
          </a>
          , which provides online support in multiple languages.
        </li>
      </ul>
      <p>You can also find practical information in our guides:</p>
      <ul>
        <li>
          <Link to="/guides/$slug" params={{ slug: "how-to-stop-gambling" }}>
            How to Stop Gambling
          </Link>
        </li>
        <li>
          <Link to="/guides/$slug" params={{ slug: "gambling-self-exclusion" }}>
            Gambling Self-Exclusion
          </Link>
        </li>
        <li>
          <Link to="/guides/$slug" params={{ slug: "gambling-budget" }}>
            Session Budget
          </Link>
        </li>
      </ul>
    </LegalPage>
  );
}
