import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Coins,
  CircleDot,
  Dices,
  Swords,
  Timer,
  Eye,
  ShieldCheck,
  Wallet,
  History,
  Globe,
  Network,
  ArrowRight,
  Spade,
  Circle,
} from "lucide-react";
import {
  SeoPage,
  SeoHero,
  SeoSection,
  SeoCard,
  SeoGrid,
  SeoFlow,
  SeoCallout,
  SeoLink,
  SeoFaq,
  SeoCta,
} from "@/components/seo/SeoPage";
import { seoHead, type Faq } from "@/components/seo/seo-head";

const FAQS: Faq[] = [
  {
    q: "What is PVPspinArena?",
    a: "PVPspinArena has seven games: Jackpot, Coinflip, Roulette, P2P Slott, six-max Texas Hold'em poker, 1v1 8-ball pool and PvPStrike, our browser FPS. Cash games use one US-dollar balance funded with Bitcoin, or USDC or ETH on Base. Random draws use committed seeds; pool follows the shots and rules; PvPStrike is decided by an authoritative match server. Free FPS Practice is against a bot.",
  },
  {
    q: "What does PVP mean on PVPspinArena?",
    a: "PVP stands for player vs player. Jackpot, Coinflip, P2P Slott, poker, 8-ball and PvPStrike use player-funded pots. PvPStrike cash matches are human-only; its free Practice mode uses a bot. Roulette is a shared round with fixed payout multipliers. Each format has its own rules and fee.",
  },
  {
    q: "Is PVPspinArena a crypto casino?",
    a: "PVPspinArena offers real-value casino-style games and competitive pool and FPS matches funded with digital assets. The main formats use player-funded pots, and balances are tracked in US dollars in a double-entry ledger. Seed verification applies to the random games; it does not decide a PvPStrike winner. Check the laws where you live and only use funds you can afford to lose.",
  },
  {
    q: "What games are available?",
    a: "Seven games are available: Jackpot, Coinflip, Roulette, P2P Slott, six-max No-Limit Texas Hold'em, 1v1 8-ball pool and PvPStrike. Pool follows the published shot rules. PvPStrike offers best-of-thirteen human cash matches and free first-to-seven bot Practice. Both pool and FPS charge 5% of a winning cash-match pot; Practice has no stake or payout.",
  },
  {
    q: "How is PVPspinArena inspired by the CS:GO betting era?",
    a: "Around 2015, community sites built around CS:GO skins popularised fast social formats like jackpot pots and coinflips, where players watched each round resolve together. PVPspinArena takes inspiration from that pace and sense of competition. It is an independent platform, uses US-dollar balances funded by digital assets instead of skins, and is not affiliated with Valve, Counter-Strike, Steam or any historical betting site.",
  },
  {
    q: "How does PVPspinArena approach game fairness?",
    a: "Random games commit a seed before play and reveal it for verification. Poker also mixes players' secrets into the shuffle. In 8-ball the seed fixes the rack, while shots, timeouts and forfeits determine the winner. PvPStrike validates movement, ammunition, hits and results on the match server; it is not a seed-based provably fair draw or a guarantee against cheating.",
  },
  {
    q: "Where can I learn how PVPspinArena works?",
    a: "The How It Works page walks through the full journey step by step: account access, wallet balances, deposits and withdrawals, choosing and reviewing a game, how each game resolves, and how to verify a completed result. The Fairness page contains the exact protocol and an in-browser verifier, and the Responsible gambling page covers limits and self-exclusion.",
  },
];

const TITLE = "About PVPspinArena: FPS, Pool and Crypto Games";
const DESC =
  "Meet PVPspinArena: PvPStrike browser FPS, 8-ball pool, poker, Jackpot, Coinflip, Roulette and Slott. Learn the game formats, fees and fairness differences.";

export const Route = createFileRoute("/about")({
  head: () =>
    seoHead({ path: "/about", title: TITLE, description: DESC, crumb: "About", faqs: FAQS }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SeoPage>
      <SeoHero
        crumb="About"
        eyebrow="About PVPspinArena"
        title="About PVPspinArena"
        primary={{ to: "/", label: "Explore the games" }}
        secondary={{ to: "/how-it-works", label: "Learn how it works" }}
      >
        <p>
          PVPspinArena brings together seven games: PvPStrike browser FPS, 1v1 8-ball pool, six-max
          Hold'em poker, Jackpot, Coinflip, Roulette and P2P Slott. Try free FPS Practice against a
          bot, or review the rules and fee before choosing a cash game.
        </p>
        <p>
          Balances are shown in US dollars and funded with Bitcoin, or with USDC or ETH on the Base
          network.
        </p>
      </SeoHero>

      <SeoSection
        id="what"
        eyebrow="The platform"
        title="What is PVPspinArena?"
        intro={
          <>
            <p>
              PVPspinArena is a crypto gaming platform where the main opponent is another player,
              not the house. When you join a Jackpot, a Coinflip, a Slott duel or a poker table, the
              money in play comes from the players there. The same applies to 8-ball and human
              PvPStrike cash matches. Winners receive the pot after the applicable fee. That is what
              we mean by a PVP casino: the games are about competing with people, in a format
              everyone in the room can watch resolve at the same moment.
            </p>
            <p>
              Everything that matters happens on the server. Your browser shows the wheel and the
              coin, but it never decides a result, a balance or a payout. Game logic, wallet
              balances and settlement are handled by server-side systems. PvPStrike runs on a
              dedicated authoritative match server, and every movement of money is written as a
              balanced ledger entry. This keeps the experience quick on screen while the accounting
              stays strict behind it.
            </p>
            <p>
              Cash games share one wallet and one balance in US dollars. Draws use a
              commit-and-reveal seed. Pool follows its shot rules. PvPStrike follows validated
              gameplay and round scores, with a Police/Terrorist side switch at halftime.
            </p>
          </>
        }
      >
        <SeoGrid cols={3}>
          <SeoCard icon={<Swords className="h-5 w-5" />} title="Players, not the house">
            <p>
              Jackpot, Coinflip, Slott, poker, 8-ball and PvPStrike cash pots are player funded.
            </p>
          </SeoCard>
          <SeoCard icon={<ShieldCheck className="h-5 w-5" />} title="Published rules" accent="gold">
            <p>The browser shows the result. It does not file the winner or the payout.</p>
          </SeoCard>
          <SeoCard icon={<Wallet className="h-5 w-5" />} title="One USD balance" accent="rival">
            <p>Fund with Bitcoin, or with USDC or ETH on Base. Play and withdraw in US dollars.</p>
          </SeoCard>
        </SeoGrid>
      </SeoSection>

      <SeoSection
        id="pvp"
        eyebrow="Design principles"
        title="Built around player vs player gaming"
        intro={
          <p>
            Player vs player games work differently from house-banked games. Instead of betting
            against fixed odds set by the operator, you are matched with other people, and the size
            of the pot and the game's rules determine the payout. Four principles shape play on the
            platform.
          </p>
        }
      >
        <SeoGrid cols={4}>
          <SeoCard icon={<Swords className="h-5 w-5" />} title="Player competition">
            <p>
              In Jackpot every player adds to a shared pot and one winner takes it. In Coinflip two
              players match wagers and one of them wins both. At a poker table you play hand after
              hand against the other seated players. The competition is visible: you see who joined,
              how much they staked and what chance each player holds.
            </p>
          </SeoCard>
          <SeoCard icon={<Timer className="h-5 w-5" />} title="Fast rounds" accent="gold">
            <p>
              Rounds are designed to be short. A Jackpot closes on a timer, a Coinflip resolves as
              soon as the second player joins, Roulette runs continuously with a new round after
              each spin, and poker gives each player 20 seconds to act.
            </p>
          </SeoCard>
          <SeoCard icon={<Eye className="h-5 w-5" />} title="Transparent mechanics" accent="rival">
            <p>
              Your chance in a Jackpot is your share of the pot. A Coinflip is exactly 50/50.
              Roulette multipliers are fixed and shown on the table. Nothing depends on hidden odds.
            </p>
          </SeoCard>
          <SeoCard icon={<ShieldCheck className="h-5 w-5" />} title="Fairness">
            <p>
              Random draws have seed verification. Pool has a shot replay. PvPStrike validates
              gameplay on the match server and records the series result.
            </p>
          </SeoCard>
        </SeoGrid>
      </SeoSection>

      <SeoSection
        id="history"
        eyebrow="Where the idea comes from"
        title="Inspired by the 2015-era CS:GO betting culture"
        intro={
          <>
            <p>
              Around 2015, a wave of community sites grew up around CS:GO skins. Two formats became
              especially popular: the jackpot, where players added skins to a shared pot and a wheel
              picked one winner, and the coinflip, where two players put up items of similar value
              and a flip decided who took both. Rounds were quick, the action was social, and people
              often watched together in chat as each result landed.
            </p>
            <p>
              PVPspinArena takes inspiration from the fast, competitive formats that became popular
              during the early CS:GO betting era — the shared pot, the head-to-head flip and the
              feeling of a room watching the same spin. What we changed is everything underneath:
              balances in US dollars instead of items, digital-asset deposits on a public network,
              and separate explanations of random-draw verification and gameplay-based results.
            </p>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <ol className="relative space-y-4 border-l border-border pl-6">
            {[
              ["2015", "CS:GO skin communities take off"],
              ["Formats", "Jackpot pots and coinflips become the staples"],
              ["Style", "Fast, social rounds watched together in chat"],
              ["Today", "Modern wallet and verification infrastructure"],
              ["Now", "PVPspinArena"],
            ].map(([k, v], i, arr) => (
              <li key={k} className="relative">
                <span
                  className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ${i === arr.length - 1 ? "bg-primary" : "bg-border"}`}
                />
                <div className="tabular font-mono text-xs text-primary">{k}</div>
                <div className="font-display text-base">{v}</div>
              </li>
            ))}
          </ol>
          <SeoCallout title="Independent — not affiliated" tone="gold">
            <p>
              PVPspinArena is an independent platform. It is not affiliated with, endorsed by or
              connected to Valve, Counter-Strike, Steam, or any historical CS:GO betting website. We
              do not accept Counter-Strike skins as stakes. Game-asset credits are available from
              the PvPStrike lobby.
            </p>
            <p>
              The reference is about format and pace only — a piece of gaming history that shaped
              the games we build.
            </p>
          </SeoCallout>
        </div>
      </SeoSection>

      <SeoSection
        id="then-now"
        eyebrow="Then and now"
        title="From skin-based betting to modern crypto gaming"
        intro={
          <p>
            The formats feel familiar, but the systems are different. We are not claiming the two
            are technically or legally equivalent — only that the games people enjoyed then inform
            the games we build now.
          </p>
        }
      >
        <div className="grid overflow-hidden rounded-2xl border border-border sm:grid-cols-2">
          <div className="bg-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Then
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "Skins and game items as stakes",
                "Shared player pools",
                "Jackpot wheels",
                "Coinflips",
                "Community competition in chat",
              ].map((x) => (
                <li key={x} className="text-muted-foreground">
                  — {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-border bg-primary/5 p-6 sm:border-l sm:border-t-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Now</p>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "USD balances funded with Bitcoin, or USDC or ETH on Base",
                "Wallet verification and a double-entry ledger",
                "PvPStrike, 8-ball pool, poker and casino-style games",
                "Seed verification for draws; server-validated competitive play",
                "Live, synchronized game interfaces",
              ].map((x) => (
                <li key={x}>— {x}</li>
              ))}
            </ul>
          </div>
        </div>
      </SeoSection>

      <SeoSection
        id="games"
        eyebrow="The games"
        title="Seven games, one balance"
        intro={
          <p>
            Cash games use the same wallet balance. Draws commit a seed, pool follows the shots, and
            PvPStrike follows the round scores. FPS Practice is free and pays no prize.
          </p>
        }
      >
        <SeoGrid cols={3}>
          <GameCard icon={<Dices className="h-5 w-5" />} name="Jackpot" to="/" cta="Play Jackpot">
            A shared pot where one cent equals one ticket. When the timer ends, entries lock, the
            wheel spins and one ticket wins the whole pot. Your chance is simply your share of the
            total.
          </GameCard>
          <GameCard
            icon={<Coins className="h-5 w-5" />}
            name="Coinflip"
            to="/coinflip"
            cta="Play Coinflip"
          >
            A one-on-one match. Create a game and choose a side, or join someone else's by matching
            their wager. A single random bit decides heads or tails — exactly 50/50.
          </GameCard>
          <GameCard
            icon={<CircleDot className="h-5 w-5" />}
            name="Roulette"
            to="/roulette"
            cta="Play Roulette"
          >
            A continuous shared round. Bet on Purple or Silver for 2x, or Green for 14x. Betting
            closes, the wheel spins, and winning bets are paid at the fixed multiplier.
          </GameCard>
          <GameCard
            icon={<Swords className="h-5 w-5" />}
            name="P2P Slott"
            to="/slott"
            cta="Play P2P Slott"
          >
            A 1 vs 1 slot duel. Both players stake the same amount and take six spins each on the
            same grid. The higher score takes the pot, unless a bomb ends the match.
          </GameCard>
          <GameCard icon={<Spade className="h-5 w-5" />} name="Poker" to="/poker" cta="Play Poker">
            Six-max No-Limit Texas Hold'em cash tables from $0.02/$0.05 to $5/$10. Every player
            dealt in helps shuffle the deck, and the 5% fee applies only to hands that see a flop.
          </GameCard>
          <GameCard
            icon={<Circle className="h-5 w-5" />}
            name="8-ball"
            to="/8-ball-pool"
            cta="Play 8-ball"
          >
            A 1v1 match from $1 to $50. The winner is whoever the rules name after the shots. The
            rack seed only places the balls. Cash wins have a 5% pot fee. Free Practice is against a
            dedicated bot, with no stake or payout.
          </GameCard>
          <GameCard
            icon={<Swords className="h-5 w-5" />}
            name="PvPStrike FPS"
            to="/fps-duel"
            cta="Open PvPStrike"
          >
            A desktop browser shooter on Dustfront. Play best-of-thirteen cash duels against another
            person, or free first-to-seven Practice against a bot. Cash wins pay the combined pot
            after a 5% fee.
          </GameCard>
        </SeoGrid>
      </SeoSection>

      <SeoSection
        id="fairness"
        eyebrow="Fairness"
        title="Fairness and transparency"
        intro={
          <>
            <p>
              Fairness on PVPspinArena is something you can check, not something you have to take on
              trust. Before a random-draw round opens, the server creates a secret seed and
              publishes its SHA-256 hash. That hash is a commitment: it fixes the seed without
              revealing it.
            </p>
            <p>
              When a draw resolves, the result is computed from the seed with HMAC-SHA256. For
              Jackpot, rejection sampling maps the output to a ticket with no modulo bias. After
              settlement, the seed is published. Anyone can hash it, confirm it matches the earlier
              commitment, and recompute the winner. 8-ball uses the same commitment for the rack
              only. The winner is a replay of the shots, timeouts and forfeits.
            </p>
            <p>
              PvPStrike is different: an authoritative match server validates actions and determines
              the winner. Its results cannot be verified by entering a seed in the draw calculator.
              See the{" "}
              <Link to="/fps-1v1" className="text-primary hover:underline">
                FPS rules and public results
              </Link>
              .
            </p>
          </>
        }
      >
        <SeoFlow
          steps={[
            { label: "Commit", text: "Random games publish a seed hash before entries open." },
            { label: "Play", text: "Players join; the server validates every entry." },
            { label: "Outcome", text: "Draws use the seed; competitive games follow gameplay." },
            { label: "Settle", text: "The pot is paid in one balanced ledger transaction." },
            { label: "Review", text: "Check the game's available verification or match record." },
          ]}
        />
        <div className="mt-6">
          <SeoLink to="/fairness">Learn about game fairness</SeoLink>
        </div>
      </SeoSection>

      <SeoSection
        id="crypto"
        eyebrow="Payments"
        title="Why crypto?"
        intro={
          <p>
            We use digital assets because they give players and the platform a shared, public record
            of money moving in and out. Inside the site, everything is tracked in US dollars so
            balances are easy to read.
          </p>
        }
      >
        <SeoGrid cols={4}>
          <SeoCard icon={<Wallet className="h-5 w-5" />} title="Digital wallet infrastructure">
            <p>
              You link a wallet you control and deposit from it; deposits are matched to your
              verified address.
            </p>
          </SeoCard>
          <SeoCard
            icon={<History className="h-5 w-5" />}
            title="Transparent transaction history"
            accent="gold"
          >
            <p>
              Deposits and withdrawals are on-chain transactions you can look up on a public block
              explorer.
            </p>
          </SeoCard>
          <SeoCard
            icon={<Globe className="h-5 w-5" />}
            title="Digital-asset ecosystem"
            accent="rival"
          >
            <p>
              Bitcoin, USDC, and ETH are widely held assets, so you can fund your balance from a
              wallet you already use.
            </p>
          </SeoCard>
          <SeoCard icon={<Network className="h-5 w-5" />} title="Modern payment rails">
            <p>
              Bitcoin deposits and cashouts use the Bitcoin network. USDC and ETH use Base, where
              fees are typically low compared with Ethereum mainnet.
            </p>
          </SeoCard>
        </SeoGrid>
      </SeoSection>

      <SeoSection
        id="principles"
        eyebrow="In practice"
        title="What PVP crypto gaming means here"
        intro={
          <p>
            "Crypto casino" can mean many things. These are the specific commitments behind the way
            PVPspinArena runs, written plainly so you know what to expect before you play.
          </p>
        }
      >
        <SeoGrid cols={2}>
          <SeoCard title="Money is counted in cents, not guesses">
            <p>
              Every balance is an integer number of US cents. Wagers, pots and payouts are
              whole-cent amounts, so there is no rounding drift between what you see and what is
              stored. When a Jackpot pot is $12.34, there are exactly 1,234 tickets in that draw.
            </p>
          </SeoCard>
          <SeoCard title="Every movement is double-entry" accent="gold">
            <p>
              When you join a round, money moves from your balance into the game's escrow. When the
              round settles, it moves from escrow to the winner. Each step is recorded twice — once
              leaving an account, once arriving in another — so the totals always balance and can be
              reconciled at any time.
            </p>
          </SeoCard>
          <SeoCard title="Deposits come from wallets you prove you own" accent="rival">
            <p>
              Before a deposit is credited, the sending address must be a wallet you verified by
              signing a message. That links on-chain money to the right account without asking for
              personal banking details, and it stops funds from an unknown sender being credited to
              the wrong player.
            </p>
          </SeoCard>
          <SeoCard title="The animation follows the result, never the reverse">
            <p>
              By the time a wheel starts spinning or a coin starts flipping, the outcome is already
              stored. Every viewer's screen is timed from the same server clock, so everyone
              watching sees the same result land at the same moment — whether they joined the round
              or are just watching.
            </p>
          </SeoCard>
        </SeoGrid>
        <p className="mt-6 max-w-3xl leading-relaxed text-muted-foreground">
          Random games depend on chance; pool and PvPStrike also depend on gameplay. Any cash entry
          can be lost, and skill does not guarantee a profit. The rules are shown before you join,
          the figures are recorded afterwards, and the available verification depends on the game.
          Player competition, clear rules and accountable settlement are what PVPspinArena is built
          to deliver.
        </p>
      </SeoSection>

      <SeoSection
        id="next"
        eyebrow="Direction"
        title="Where we're going"
        intro={
          <p>
            We would rather ship a few things well than many things loosely. The areas we keep
            working on are simple to state.
          </p>
        }
      >
        <SeoGrid cols={4}>
          <SeoCard title="More game formats">
            <p>New PVP formats that fit the same fast, verifiable model.</p>
          </SeoCard>
          <SeoCard title="Better verification">
            <p>Easier ways to check a finished game without leaving the site.</p>
          </SeoCard>
          <SeoCard title="Player experience">
            <p>Clearer rounds, smoother live updates and a calmer interface.</p>
          </SeoCard>
          <SeoCard title="Transparent tools">
            <p>More visibility into your own history, wagers and results.</p>
          </SeoCard>
        </SeoGrid>
      </SeoSection>

      <SeoFaq faqs={FAQS} />

      <p className="text-center text-sm text-muted-foreground">
        Read our{" "}
        <Link
          to="/guides/$slug"
          params={{ slug: "pvp-gambling" }}
          className="text-primary hover:underline"
        >
          guide to PvP gambling
        </Link>
        , or browse all{" "}
        <Link to="/guides" className="text-primary hover:underline">
          crypto casino guides
        </Link>
        .
      </p>
      <SeoCta
        title="Explore PVPspinArena"
        text="Pick a game, watch a round or read exactly how results are decided."
        primary={{ to: "/", label: "Explore games" }}
        secondary={{ to: "/how-it-works", label: "How it works" }}
      />
    </SeoPage>
  );
}

function GameCard(props: {
  icon: React.ReactNode;
  name: string;
  to: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        {props.icon}
      </div>
      <h3 className="mt-4 font-display text-lg">{props.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{props.children}</p>
      <Link
        to={props.to}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        {props.cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
