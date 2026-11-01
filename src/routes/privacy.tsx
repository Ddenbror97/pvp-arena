import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { indexableHead } from "@/lib/seo/indexable-head";

export const Route = createFileRoute("/privacy")({
  head: () =>
    indexableHead({
      path: "/privacy",
      title: "Privacy Policy: What PVPspinArena Collects and Shows",
      description:
        "PVPspinArena privacy: sign-in, wallet and game records, pool shots, FPS gameplay and connection data, public match results and leaderboard visibility.",
      crumb: "Privacy",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        <strong>Last updated November 1, 2026.</strong>
      </p>
      <p>
        This policy describes what PVPspinArena (pvpspinarena.com) collects, why we use it, and what
        other players can see.
      </p>

      <h2>Sign-in</h2>
      <p>
        Email sign-in uses your email address and a verification code. When Discord sign-in is
        offered and you choose it, Discord supplies the account information described below.
      </p>
      <p>
        When you use Discord, Discord provides the account id, username, avatar, and email needed to
        authenticate your PVPspinArena account and recognize you when you sign in again.
      </p>
      <p>
        That Discord information is not displayed publicly to other players. Other players see your
        PVPspinArena username and avatar.
      </p>

      <h2>Account Data</h2>
      <p>
        Depending on how you create your account, PVPspinArena may store information necessary to
        operate your account, including:
      </p>
      <ul>
        <li>account identification information</li>
        <li>username and avatar</li>
        <li>authentication information</li>
        <li>age confirmation</li>
      </ul>
      <p>
        Passwords, where applicable, are stored using secure authentication methods rather than as
        readable passwords.
      </p>

      <h2>Wallet and Play</h2>
      <p>When you use the wallet or games, we may store:</p>
      <ul>
        <li>your available and locked balance</li>
        <li>transaction and ledger records</li>
        <li>deposits and withdrawals</li>
        <li>the wallet address used for transactions</li>
        <li>Jackpot entries</li>
        <li>Coinflip games</li>
        <li>Roulette bets</li>
        <li>P2P Slott matches and spins, and poker hands and seating records</li>
        <li>8-ball matches, shot commands, table states, timeouts and results</li>
        <li>PvPStrike cash and Practice match records, round scores and game statistics</li>
        <li>game amounts and results</li>
        <li>chat messages you send</li>
      </ul>
      <h2>Real-Time Gameplay and Connection Data</h2>
      <p>
        To operate pool and PvPStrike, servers process the actions sent by your browser and the
        state needed to run the match. FPS actions include movement, aim, firing and reloading; pool
        actions include aiming, shot power and ball placement. Authentication and session checks
        control who may play a seat.
      </p>
      <p>
        Connection and performance measurements, such as round-trip timing, regional connection
        information and server processing times, help diagnose lag and service failures. Game
        records and operational logs support result settlement, security and dispute investigation.
        This does not mean a complete replay of every FPS match is published or retained.
      </p>
      <p>
        Deposits and withdrawals on Bitcoin and on the Base blockchain are public blockchain
        transactions. Blockchain transactions may be visible to anyone on the network and cannot be
        removed by PVPspinArena.
      </p>

      <h2>Browser Preferences</h2>
      <p>
        FPS mouse sensitivity, sound volume and crosshair preferences are saved in your browser's
        local storage so they can be reused on that browser. These preferences are not a public
        profile field.
      </p>
      <h2>What Other Players Can See</h2>
      <p>Other players may see:</p>
      <ul>
        <li>your username</li>
        <li>your chosen avatar</li>
        <li>your chat messages</li>
        <li>your stake in a live game or round</li>
        <li>
          public match results, scores, entry amounts, fees and winner credits where displayed
        </li>
        <li>public PvPStrike ladder information, including rating, matches played and wins</li>
      </ul>
      <p>
        Other players cannot see your private account information, authentication credentials, full
        account balance or private wallet ledger. Public game history is separate from that private
        ledger. Eligible public cash results and aggregate game activity may also appear on
        game-information and guide pages. Private FPS rooms and Practice do not enter the public
        cash ladder or its public-results sample.
      </p>

      <h2>How We Use Information</h2>
      <p>We use information to:</p>
      <ul>
        <li>operate accounts and authentication</li>
        <li>operate and settle games</li>
        <li>process deposits and withdrawals</li>
        <li>maintain account and transaction records</li>
        <li>detect fraud, abuse, and prohibited activity</li>
        <li>enforce self-exclusion and responsible-gambling measures</li>
        <li>provide customer support</li>
        <li>comply with applicable legal obligations</li>
      </ul>

      <h2>Data Retention</h2>
      <p>
        We retain account, game, and transaction information for as long as necessary to operate the
        service, resolve disputes, maintain security, complete financial records, and comply with
        legal obligations.
      </p>
      <p>
        Information that forms part of a completed financial or blockchain transaction may need to
        be retained even after an account is closed.
      </p>

      <h2>Children</h2>
      <p>PVPspinArena is intended for users aged 18 and older.</p>
      <p>
        We do not knowingly allow anyone under 18 to use the service. If we become aware that an
        account belongs to someone under 18, we may take steps to close the account and remove
        personal information where legally permitted.
      </p>

      <h2>Changes</h2>
      <p>If this Privacy Policy changes, the date at the top of the policy will be updated.</p>
      <p>The current version is available at:</p>
      <p>
        <a href="https://pvpspinarena.com/privacy">https://pvpspinarena.com/privacy</a>
      </p>
    </LegalPage>
  );
}
