import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/og";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — PVPspinArena" },
      {
        name: "description",
        content:
          "Privacy policy for PVPspinArena, including Discord sign-in, account data, wallet records, and what other players can see.",
      },
      { property: "og:title", content: "Privacy — PVPspinArena" },
      {
        property: "og:description",
        content: "What PVPspinArena collects, why we use it, and what other players can see.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        <strong>Last updated October 7, 2026.</strong>
      </p>
      <p>
        This policy describes what PVPspinArena (pvpspinarena.com) collects, why we use it, and what
        other players can see.
      </p>

      <h2>Discord sign-in</h2>
      <p>You can create and access an account using Discord.</p>
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
        <li>game amounts and results</li>
        <li>chat messages you send</li>
      </ul>
      <p>
        Deposits and withdrawals on Bitcoin and on the Base blockchain are public blockchain
        transactions.
        Blockchain transactions may be visible to anyone on the network and cannot be removed by
        PVPspinArena.
      </p>

      <h2>What Other Players Can See</h2>
      <p>Other players may see:</p>
      <ul>
        <li>your username</li>
        <li>your chosen avatar</li>
        <li>your chat messages</li>
        <li>your stake in a live game or round</li>
      </ul>
      <p>
        Other players cannot see your private account information, authentication credentials,
        account balance, transaction history, or other information that PVPspinArena keeps private.
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
