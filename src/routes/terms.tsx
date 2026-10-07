import { createFileRoute, Link } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — PVPspinArena" },
      {
        name: "description",
        content:
          "Terms for PVPspinArena: eligibility, the 5% fee on Jackpot, Coinflip and Roulette, the 10% fee on P2P Slott, Bitcoin and Base deposits, and account rules.",
      },
      { property: "og:title", content: "Terms — PVPspinArena" },
      {
        property: "og:description",
        content:
          "Rules for using PVPspinArena, including the 5% fee on Jackpot, Coinflip and Roulette and the 10% fee on P2P Slott.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms">
      <p>
        <strong>Last updated October 7, 2026.</strong>
      </p>
      <p>
        These terms are the rules for using PVPspinArena at pvpspinarena.com. By creating an account
        or using the service, you agree to these terms. If you do not agree, do not use the site.
      </p>

      <h2>The Service</h2>
      <p>PVPspinArena offers three games: Jackpot, Coinflip, and Roulette.</p>
      <p>
        Your playable balance is maintained as a US-dollar ledger, counted in cents. Bitcoin, and
        USDC and ETH on the Base network, can be used to add funds and cash out. They are not
        separate playable balances.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be 18 or older and legally permitted to use a real-money gaming service where you
        live.
      </p>
      <p>
        You confirm your age when creating an account. You are responsible for determining whether
        you are permitted to use PVPspinArena under the laws and regulations that apply to you.
      </p>
      <p>We may restrict or close an account that does not meet these requirements.</p>

      <h2>Your Account</h2>
      <p>
        You may create and access an account using the authentication methods provided on the site,
        including Discord.
      </p>
      <p>
        You choose your username and avatar. These are the identifying details displayed to other
        players.
      </p>
      <p>
        Keep your account credentials and access methods secure. You are responsible for activity
        carried out through your account, including wagers and withdrawals.
      </p>
      <p>
        One person may maintain only one account unless PVPspinArena expressly permits otherwise.
      </p>
      <p>
        The <Link to="/privacy">Privacy Policy</Link> explains how account and authentication
        information is handled.
      </p>

      <h2>Fees</h2>
      <p>
        Jackpot and Coinflip charge a <strong>5% fee</strong> on the pot when the round settles.
        Roulette charges a <strong>5% fee</strong> on each winning payout when the round settles.
        P2P Slott charges a <strong>10% fee</strong> on the players&apos; pot when a player wins.
        If either player lands a bomb, the match ends and the house keeps both stakes.
      </p>

      <h3>Jackpot</h3>
      <p>
        Players contribute to one pot. Every cent contributed represents one ticket, so each
        player&apos;s chance of winning corresponds to their share of the total pot.
      </p>
      <p>
        At settlement, 5% of the pot is retained as the game fee. The winner receives the remaining
        95%.
      </p>

      <h3>Coinflip</h3>
      <p>
        Two players stake the same amount. One random result determines the winner, with each side
        having a 50% chance.
      </p>
      <p>
        At settlement, 5% of the combined pot is retained as the game fee. The winner receives the
        remaining 95%.
      </p>
      <p>
        The game fee is not charged again when depositing or withdrawing. It is taken from the
        Jackpot, Coinflip or P2P Slott pot, or from a Roulette winning payout, at settlement.
      </p>
      <p>If a round is cancelled, the affected stakes are refunded without the game fee.</p>

      <h3>P2P Slott</h3>
      <p>Two players stake the same amount and take turns spinning. The higher score wins.</p>
      <p>
        At settlement, 10% of the players&apos; pot is retained as the game fee. The winner receives
        the remaining 90%, plus any promotional bonus added to that match. A draw refunds both
        stakes with no fee. If either player lands a bomb, the match ends immediately, both stakes
        stay with the house, and any promotional bonus is returned. A match already open keeps the
        rules it was created with.
      </p>

      <h3>Roulette</h3>
      <p>Roulette uses a 33-slot wheel:</p>
      <ul>
        <li>16 Purple slots pay 2x</li>
        <li>16 Silver slots pay 2x</li>
        <li>1 Green slot pays 14x</li>
      </ul>
      <p>
        Each bet is settled independently. Other players&apos; bets do not change the payout of your
        bet. At settlement, 5% of a winning payout is retained as the game fee. The winner receives
        the remaining 95%. A losing bet is unaffected by this fee.
      </p>
      <p>
        Before the fee, a Purple or Silver bet returns 32/33 of the stake and a Green bet returns
        14/33. After the 5% fee on winnings, the theoretical average return is about 92.12% on
        Purple or Silver (a house edge of about 7.88%) and about 40.30% on Green (a house edge of
        about 59.70%).
      </p>
      <p>
        Each round uses the wheel that was active when the round opened, and that wheel is recorded
        on the round. A round that opened on an earlier wheel settles and verifies on that wheel.
      </p>

      <h2>How Results Are Decided</h2>
      <p>Game results are determined by the server.</p>
      <p>
        Before a round begins, PVPspinArena publishes the SHA-256 hash of a secret seed. After the
        round, the seed is revealed.
      </p>
      <p>
        You can use the <Link to="/fairness">Fairness</Link> page to verify the published hash and
        recompute the result.
      </p>
      <p>The game animation displays the stored result. It does not determine the outcome.</p>

      <h2>Deposits and Withdrawals</h2>
      <p>
        Bitcoin deposits and withdrawals use the Bitcoin network. USDC and ETH deposits and
        withdrawals are supported on the Base network.
      </p>
      <p>
        Deposits are credited to your dollar balance after the required network confirmations and
        applicable processing checks.
      </p>
      <p>
        Withdrawals use your available dollar balance and are sent to a verified wallet using the
        asset you select.
      </p>
      <p>A withdrawal does not have to use the same asset that was previously deposited.</p>
      <p>
        Minimums, limits, processing status, and any applicable review are shown in the wallet
        interface.
      </p>
      <p>
        Network fees for Bitcoin and for Base transactions are separate from the PVPspinArena game
        fees.
      </p>
      <p>
        If available funds for a particular withdrawal asset are temporarily insufficient, a
        withdrawal may remain pending until sufficient funds are available.
      </p>
      <p>Your PVPspinArena balance is not a bank deposit and is not a bank-insured deposit.</p>

      <h2>What You Can See and What Others Can See</h2>
      <p>Other players may see:</p>
      <ul>
        <li>your username</li>
        <li>your chosen avatar</li>
        <li>your chat messages</li>
        <li>your stake in a live round</li>
      </ul>
      <p>
        Private account information, authentication information, your dollar balance, transaction
        history, and wallet information are not displayed to other players.
      </p>
      <p>
        Chat is plain text. Do not post private keys, seed phrases, passwords, or another
        person&apos;s personal information.
      </p>

      <h2>Responsible Play</h2>
      <p>Only use money you can afford to lose.</p>
      <p>Jackpot, Coinflip, and Roulette involve real money and can result in losses.</p>
      <p>
        The <Link to="/responsible-gambling">Responsible Gambling</Link> page provides information
        about self-exclusion and available support resources.
      </p>
      <p>While a self-exclusion is active, the account cannot deposit, wager, or withdraw.</p>

      <h2>Availability</h2>
      <p>
        The service is provided on an availability basis and may occasionally be unavailable or
        delayed.
      </p>
      <p>
        Maintenance, blockchain conditions, network delays, technical problems, or temporarily
        limited funds may delay deposits, withdrawals, or game activity.
      </p>
      <p>
        The game rules and figures displayed to you before you place a wager are the terms
        applicable to that wager.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms from time to time.</p>
      <p>The date at the top of this page will be updated when material changes are made.</p>
      <p>
        Your continued use of PVPspinArena after an updated version becomes effective constitutes
        acceptance of the updated terms.
      </p>
      <p>
        The fee applicable to a game round is the fee recorded for that round and is fixed before
        settlement.
      </p>
    </LegalPage>
  );
}
