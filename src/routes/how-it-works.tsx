import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Coins, CircleDot, Dices, UserRound, Wallet, ListChecks, Server, Lock, Repeat, ScrollText, ShieldCheck, MonitorX } from "lucide-react";
import { SeoPage, SeoHero, SeoSection, SeoCard, SeoGrid, SeoFlow, SeoCallout, SeoLink, SeoFaq, SeoCta, seoHead, type Faq } from "@/components/seo/SeoPage";

const FAQS: Faq[] = [
  {
    q: "How does a PVP casino work?",
    a: "In a player-vs-player casino you compete with other players instead of betting against fixed odds set by the operator. On PVPspinArena, Jackpot and Coinflip pots are made up of the players' wagers, and the winner receives the pot minus any fee shown before entry. The platform runs the round, decides the result with a committed random seed, settles balances and publishes the data needed to verify it.",
  },
  {
    q: "How does PVPspinArena Coinflip work?",
    a: "One player creates a game, chooses heads or tails and sets a wager. A second player joins by matching that exact wager and takes the other side. The result is decided from one bit of an HMAC-SHA256 output over the game's committed seed, so each side has exactly a 50% chance. The winner receives both wagers, and the seed is revealed after settlement.",
  },
  {
    q: "How does the Jackpot game work?",
    a: "Players add money to a shared pot while the round timer runs. Every cent is one ticket, so your chance of winning equals your share of the pot. When the timer ends, entries lock, a short countdown plays and the wheel spins. The winning ticket is computed from the round's committed seed using rejection sampling, and its owner receives the pot.",
  },
  {
    q: "How does PVPspinArena Roulette work?",
    a: "Roulette runs continuously in shared rounds. During the betting phase you place bets on Purple, Silver or Green. Betting then locks and the wheel spins. The wheel has 15 slots: 7 Purple and 7 Silver pay 2x, and 1 Green pays 14x. Winning bets are paid at that fixed multiplier and a new round starts automatically.",
  },
  {
    q: "What does provably fair mean?",
    a: "Provably fair means you can check a result yourself instead of trusting the operator. Before a round, the server publishes the SHA-256 hash of a secret seed. After the round, it reveals the seed. You can hash the seed to confirm it matches the commitment, then recompute the result with the published formula. If both match, the result could not have been changed after the commitment.",
  },
  {
    q: "How are game outcomes determined?",
    a: "Outcomes are computed on the server, never in your browser. Each game uses HMAC-SHA256 with the round's secret seed as the key and a fixed message made from the game type, game id and version. Jackpot maps the output to a ticket with rejection sampling, Coinflip uses one bit, and Roulette maps the output to one of 15 slots. The animation only shows the stored result.",
  },
  {
    q: "Can I verify a completed game?",
    a: "Yes. Once a game is settled its seed is published alongside the original hash. Open the Fairness page, choose Jackpot, Coinflip or Roulette, and enter the game details. The verifier runs in your browser, recomputes the hash and the result, and shows whether they match the recorded outcome. You can also reproduce the calculation with any standard HMAC-SHA256 tool.",
  },
];

const TITLE = "How PVPspinArena Works | PVP Crypto Casino Games";
const DESC =
  "See how PVPspinArena works, from choosing a game and joining players to game outcomes, wallet balances and fairness verification.";

export const Route = createFileRoute("/how-it-works")({
  head: () => seoHead({ path: "/how-it-works", title: TITLE, description: DESC, crumb: "How it works", faqs: FAQS }),
  component: HowItWorksPage,
});

const JOURNEY = [
  ["Access your account", "Sign in with a 6-digit email code."],
  ["Fund your wallet", "Deposit USDC or ETH on Base from a verified wallet."],
  ["Choose a game", "Jackpot, Coinflip or Roulette."],
  ["Review the rules", "Wager, chance, multipliers and any fee."],
  ["Create or join", "Enter a pot, match a flip or place a bet."],
  ["Game resolves", "The server computes the committed result."],
  ["Verify", "Check the revealed seed against the result."],
];

function HowItWorksPage() {
  return (
    <SeoPage>
      <SeoHero
        crumb="How it works"
        eyebrow="How it works"
        title="How PVPspinArena Works"
        primary={{ to: "/", label: "Explore games" }}
        secondary={{ to: "/about", label: "About PVPspinArena" }}
      >
        <p>
          PVPspinArena runs fast player-vs-player rounds with a single US-dollar balance. You fund your wallet with
          digital assets, pick a game, and every result is computed on the server from a seed that was committed before
          the round began.
        </p>
        <p>Here is the whole journey, from your first sign-in to checking a finished game yourself.</p>
      </SeoHero>

      <section aria-labelledby="journey-h">
        <h2 id="journey-h" className="sr-only">The player journey</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {JOURNEY.map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-border bg-card p-4">
              <span className="tabular font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-1 font-display text-sm">{t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          The steps are the same for every game, but the mechanics in step five differ: Jackpot and Coinflip are
          player-vs-player, while Roulette is a shared round with fixed multipliers.
        </p>
      </section>

      <Step n="01" id="account" title="Your account" icon={<UserRound className="h-5 w-5" />}>
        <p>
          You sign in with your email address. We send a 6-digit code — there are no passwords to remember and no
          magic links. After your first sign-in you choose a display name and avatar, which other players see in rounds
          and in chat.
        </p>
        <p>
          Your profile shows your game history and lets you link a personal wallet. Linking is done by signing a message
          in MetaMask, which proves you control the address without sharing any private key. You can also set limits or
          self-exclude from the Responsible gambling page at any time.
        </p>
      </Step>

      <Step n="02" id="wallet" title="Your wallet" icon={<Wallet className="h-5 w-5" />} flip>
        <p>
          Your balance is held in US dollars and tracked in whole cents. There are two figures: <strong>available</strong>,
          which you can wager or withdraw, and <strong>locked</strong>, which is held while a withdrawal is being
          processed.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Deposits:</strong> send USDC or ETH on the Base network from your verified wallet to the deposit
            address on the wallet page. After the required network confirmations and a check by two independent network
            providers, the deposit is added to your balance automatically.
          </li>
          <li>
            <strong>Withdrawals:</strong> request a payout to your verified wallet. The amount is held, sent on Base, and
            only marked finished once the payment is confirmed. Daily limits apply, and larger withdrawals may be
            reviewed before sending.
          </li>
          <li>
            <strong>History:</strong> every deposit, wager, win and withdrawal is recorded as a balanced ledger entry,
            so your balance always matches its history.
          </li>
        </ul>
      </Step>

      <SeoSection
        id="choose"
        eyebrow="Step 03"
        title="Choose a game"
        intro={<p>Each game uses the same balance and fairness protocol, but plays very differently.</p>}
      >
        <SeoGrid cols={3}>
          <GameTile icon={<Dices className="h-5 w-5" />} name="Jackpot" to="/" tag="PVP · shared pot">
            Everyone adds to one pot. One cent is one ticket. One winner takes the pot.
          </GameTile>
          <GameTile icon={<Coins className="h-5 w-5" />} name="Coinflip" to="/coinflip" tag="PVP · 1v1">
            Two players, matched wagers, one random bit. Exactly 50/50.
          </GameTile>
          <GameTile icon={<CircleDot className="h-5 w-5" />} name="Roulette" to="/roulette" tag="Shared round · fixed payouts">
            Bet on Purple or Silver for 2x, or Green for 14x.
          </GameTile>
        </SeoGrid>
      </SeoSection>

      <Step n="04" id="review" title="Review your game" icon={<ListChecks className="h-5 w-5" />}>
        <p>Before you commit money, everything that affects the outcome is on screen:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Wager:</strong> the exact amount taken from your available balance.</li>
          <li><strong>Rules:</strong> minimum and maximum wagers for that game.</li>
          <li><strong>Current state:</strong> who has joined, the pot size and time remaining.</li>
          <li><strong>Possible outcomes:</strong> your share of the Jackpot pot, the 50/50 Coinflip, or Roulette multipliers.</li>
          <li><strong>Fees:</strong> any platform fee is shown before you enter. Wagers already placed cannot be changed.</li>
        </ul>
        <p>The committed seed hash for the round is visible before you join, so you can record it if you plan to verify later.</p>
      </Step>

      <Step n="05" id="play" title="Play" icon={<Repeat className="h-5 w-5" />} flip>
        <p>
          <strong>Player vs player games.</strong> In Jackpot and Coinflip your money goes into a pot with other
          players. There is no fixed payout table — you win what the other players staked. Your chance depends on your
          share of the pot (Jackpot) or is exactly half (Coinflip).
        </p>
        <p>
          <strong>Shared-round game.</strong> Roulette is not PVP in the same sense. Many players bet in the same round,
          but each bet is paid independently at a fixed multiplier. Other players' bets do not change your payout.
        </p>
        <p>All rounds are live: every screen watching the same game counts down, spins and shows the winner at the same moment.</p>
      </Step>

      <SeoSection
        id="resolution"
        eyebrow="Step 06"
        title="Game resolution"
        intro={<p>When a round ends, it goes through the same five stages regardless of the game.</p>}
      >
        <SeoFlow
          steps={[
            { label: "Game state", text: "Entries lock. No more wagers are accepted for the round." },
            { label: "Server logic", text: "The server runs the published formula on the committed seed." },
            { label: "Outcome", text: "The winning ticket, side or slot is stored on the game record." },
            { label: "Settlement", text: "Balances move in one atomic, balanced ledger transaction." },
            { label: "History", text: "The seed is revealed and the game appears in history." },
          ]}
        />
      </SeoSection>

      <Step n="07" id="verify" title="Verify" icon={<ShieldCheck className="h-5 w-5" />}>
        <p>
          Every game can be checked after it finishes. Take the revealed seed, hash it with SHA-256 and compare it to the
          hash that was published before the round. If they match, the seed was fixed in advance. Then run the published
          HMAC-SHA256 formula to recompute the winner, side or slot.
        </p>
        <p>The Fairness page includes the full protocol and a verifier that runs entirely in your browser.</p>
        <div className="pt-2">
          <SeoLink to="/fairness">Learn about game fairness</SeoLink>
        </div>
      </Step>

      <SeoSection id="games" eyebrow="Game mechanics" title="How the games work">
        <SeoGrid cols={3}>
          <SeoCard icon={<Dices className="h-5 w-5" />} title="Jackpot">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Players add to the pot while the timer runs; 1 cent = 1 ticket.</li>
              <li>The timer ends and entries lock.</li>
              <li>A 3-2-1 countdown plays, then the wheel spins.</li>
              <li>The winning ticket is computed from the committed seed.</li>
              <li>Its owner receives the pot; the seed is revealed.</li>
            </ol>
            <SeoLink to="/">Explore Jackpot</SeoLink>
          </SeoCard>
          <SeoCard icon={<Coins className="h-5 w-5" />} title="Coinflip" accent="gold">
            <ol className="list-decimal space-y-1 pl-5">
              <li><strong>Create:</strong> set a wager and pick heads or tails.</li>
              <li><strong>Join:</strong> another player matches the wager.</li>
              <li><strong>Sides:</strong> the joiner takes the opposite side.</li>
              <li><strong>Outcome:</strong> one bit of HMAC-SHA256 decides.</li>
              <li><strong>Settlement:</strong> the winner receives both wagers.</li>
            </ol>
            <SeoLink to="/coinflip">Explore Coinflip</SeoLink>
          </SeoCard>
          <SeoCard icon={<CircleDot className="h-5 w-5" />} title="Roulette" accent="rival">
            <ol className="list-decimal space-y-1 pl-5">
              <li><strong>Betting:</strong> choose Purple, Silver or Green.</li>
              <li><strong>Locked:</strong> betting closes for the round.</li>
              <li><strong>Spin:</strong> the wheel spins for a few seconds.</li>
              <li><strong>Outcome:</strong> one of 15 slots — 7 Purple, 7 Silver, 1 Green.</li>
              <li><strong>Payout:</strong> 2x for Purple or Silver, 14x for Green.</li>
            </ol>
            <SeoLink to="/roulette">Explore Roulette</SeoLink>
          </SeoCard>
        </SeoGrid>
      </SeoSection>

      <section aria-labelledby="integrity-h" className="rounded-3xl border border-border bg-card p-6 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Integrity</p>
        <h2 id="integrity-h" className="mt-2 font-display text-2xl sm:text-3xl">Built around game integrity</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
          The rules below are the principles the platform is built on. They describe what the system guarantees, not how
          its internals are configured.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [<Server key="a" className="h-5 w-5" />, "Server-authoritative logic", "Results, balances and payouts are decided on the server. The client only displays them."],
            [<Lock key="b" className="h-5 w-5" />, "Controlled settlement", "Each round settles once, in a single transaction that either fully completes or does not happen."],
            [<Repeat key="c" className="h-5 w-5" />, "Race-condition protection", "Balances are locked while being changed, so two actions can't spend the same money."],
            [<ListChecks key="d" className="h-5 w-5" />, "Idempotent money operations", "Wagers, deposits and withdrawals carry unique keys, so a retry can never apply twice."],
            [<ScrollText key="e" className="h-5 w-5" />, "Audit and history", "Every money movement is a balanced double-entry record that can be reconciled."],
            [<MonitorX key="f" className="h-5 w-5" />, "No client-side trust", "Editing the page or its requests cannot change a wager, result or balance."],
          ].map(([icon, t, d]) => (
            <div key={t as string}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
              <h3 className="mt-3 font-display text-base">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <SeoSection
        id="terms"
        eyebrow="Key terms"
        title="The words you'll see on PVPspinArena"
        intro={<p>A short glossary of the terms used across the games, the wallet and the Fairness page.</p>}
      >
        <SeoGrid cols={3}>
          <SeoCard title="Server seed">
            <p>
              A random 32-byte secret created for each round before anyone can join. It is the key that decides the
              result, and it stays hidden until the round is settled.
            </p>
          </SeoCard>
          <SeoCard title="Seed hash (commitment)" accent="gold">
            <p>
              The SHA-256 hash of the server seed, published at the start of the round. It locks the seed in place: if
              the seed were changed later, its hash would no longer match.
            </p>
          </SeoCard>
          <SeoCard title="HMAC-SHA256" accent="rival">
            <p>
              A standard cryptographic function. The seed is used as the key and a fixed message about the game as the
              input. The output is unpredictable without the seed, yet anyone with the seed gets the same answer.
            </p>
          </SeoCard>
          <SeoCard title="Rejection sampling">
            <p>
              A way of turning a random number into a ticket without favouring low numbers. Values that would create a
              bias are discarded and the next value is used, so every ticket has exactly the same chance.
            </p>
          </SeoCard>
          <SeoCard title="Escrow" accent="gold">
            <p>
              While a round is running, the wagers in it sit in a game escrow account. Nobody can spend them until the
              round settles, at which point the pot moves to the winner in one step.
            </p>
          </SeoCard>
          <SeoCard title="Confirmations" accent="rival">
            <p>
              The number of network blocks built on top of your deposit. Waiting for several confirmations, and checking
              with two independent providers, protects against a payment being reversed after it is credited.
            </p>
          </SeoCard>
        </SeoGrid>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <SeoCallout title="PVP vs house-banked, in one line">
            <p>
              In a PVP game your winnings come from the other players in the round. In a house-banked game such as
              Roulette, bets are paid at fixed multipliers regardless of what anyone else bets.
            </p>
          </SeoCallout>
          <SeoCallout title="What your browser does — and doesn't do">
            <p>
              Your browser shows timers, wheels and coins, and sends your requests to join or bet. It never picks a
              result, sets a balance or approves a payout. Those steps only happen on the server.
            </p>
          </SeoCallout>
        </div>
      </SeoSection>

      <SeoSection id="responsible" eyebrow="Play responsibly" title="Responsible gaming">
        <SeoCallout title="Real money is at risk" tone="gold">
          <p>
            PVPspinArena games are played with real value. Every game can lose, and past results do not change the odds
            of the next round. Before you play:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Make sure you understand the rules of the game you are joining.</li>
            <li>Only use money you can afford to lose.</li>
            <li>Check the laws and regulations that apply where you live. You must be 18 or older.</li>
            <li>Use deposit limits, cool-off periods or self-exclusion if you need a break.</li>
          </ul>
          <div className="pt-2">
            <SeoLink to="/responsible-gambling">Read the responsible gaming information</SeoLink>
          </div>
        </SeoCallout>
      </SeoSection>

      <SeoFaq faqs={FAQS} />

      <SeoCta
        title="Ready to play a round?"
        text="Pick a game, check the committed hash and watch the result land live."
        primary={{ to: "/", label: "Explore games" }}
        secondary={{ to: "/about", label: "About PVPspinArena" }}
      />
    </SeoPage>
  );
}

function Step(props: { n: string; id: string; title: string; icon: React.ReactNode; flip?: boolean; children: React.ReactNode }) {
  return (
    <section
      id={props.id}
      aria-labelledby={`${props.id}-h`}
      className={`grid scroll-mt-24 items-start gap-6 ${props.flip ? "md:grid-cols-[1fr_220px]" : "md:grid-cols-[220px_1fr]"}`}
    >
      <div className={props.flip ? "md:order-2" : undefined}>
        <div className="flex items-center gap-3 md:flex-col md:items-start">
          <span className="tabular font-mono text-4xl text-primary/40 sm:text-5xl">{props.n}</span>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{props.icon}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Step {props.n}</p>
        <h2 id={`${props.id}-h`} className="mt-1 font-display text-xl sm:text-2xl">{props.title}</h2>
        <div className="mt-4 space-y-3 leading-relaxed text-muted-foreground [&_strong]:text-foreground">{props.children}</div>
      </div>
    </section>
  );
}

function GameTile(props: { icon: React.ReactNode; name: string; to: string; tag: string; children: React.ReactNode }) {
  return (
    <Link to={props.to} className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">{props.icon}</div>
      <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{props.tag}</p>
      <h3 className="mt-1 font-display text-lg">{props.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{props.children}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        Explore {props.name} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
