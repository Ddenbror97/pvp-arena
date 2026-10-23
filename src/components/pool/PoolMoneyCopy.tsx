import { Link } from "@tanstack/react-router";

export const POOL_PAGE_TITLE = "8 Ball Pool for Real Money: Crypto PvP Matches";
export const POOL_PAGE_DESCRIPTION =
  "Play 1v1 8 ball for a cash stake. The winner is the rules replay of the shots. A 5% fee comes off the pot. Stakes run from $1 to $50.";

export const POOL_FAQS = [
  {
    q: "Can you play 8 ball pool for real money?",
    a: "Yes. Two players stake the same amount from a US-dollar balance. The winner is whoever the published 8-ball rules name after the shots. The rack seed does not pick a winner.",
  },
  {
    q: "What fee does the match take?",
    a: "When a match settles, 5% of the pot is the fee and the winner receives the other 95%. A $10 versus $10 match is a $20 pot, a $1 fee, and $19 to the winner. A cancel before the break refunds both stakes with no fee.",
  },
  {
    q: "How do you prove a match was fair?",
    a: "The server publishes the SHA-256 hash of a 32-byte rack seed before the table opens. The seed is revealed once the match is playing. The fairness page replays the shot list under the physics id stored with that rack.",
  },
  {
    q: "What does a crypto 8 ball pool wager cost?",
    a: "The stakes are $1, $2, $5, $10, $25 and $50. Bitcoin, USDC or ETH on Base can fund the US-dollar balance. They are not a separate playable balance. Promo credit and partner credit can fund a stake. Deposited or won money is used first, and bonus you lose to the other player stays bonus.",
  },
  {
    q: "Is betting on pool legal?",
    a: "That depends on where you live. This page is not legal advice. You must be 18 or older and allowed to play for money where you are. Some places ban skill games for money even when the balls are not a random draw.",
  },
  {
    q: "Does the 8 on the break win?",
    a: "On this table, the 8 on the break wins unless the cue ball is scratched. That scratch loses. That is this site's rule. It is not the World Pool-Billiard Association rule, which spots the 8 or rebreaks.",
  },
] as const;

/** Crawlable copy under the lobby. The figures match the published rules. */
export function PoolMoneyCopy() {
  return (
    <article className="mx-auto mt-8 max-w-3xl px-4 text-sm leading-relaxed text-[#efeaff]">
      <p>
        Can you play 8 ball pool for real money? Yes. This page is a 1v1 match. You and one other
        person stake the same amount from a US-dollar balance. The buttons are $1, $2, $5, $10, $25
        and $50. There is no house opponent. The winner is whoever the published rules name after
        the shots. Pocketing the 8 legally wins. An early 8, the 8 in the wrong pocket, or a scratch
        on the 8 loses. Three shot-clock timeouts, or an explicit forfeit, give the match to the
        other seat. The shot clock is 30 seconds. When the match settles, 5% of the pot is the fee
        and the winner receives the other 95%. A $10 versus $10 match is a $20 pot, a $1 fee, and
        $19 to the winner. A $5 versus $5 match is a $10 pot, a $0.50 fee, and $9.50 to the winner.
        A waiting table that is cancelled before the break refunds both stakes and charges nothing.
      </p>
      <p className="mt-3">
        The rack is not the result. Before the table opens, the server publishes the SHA-256 hash of
        a 32-byte seed. The seed stays hidden until the match is playing, so a player cannot read
        the rack and then take a refund. That seed only shuffles the coloured balls. The 8 stays in
        the centre of the rack. Shots are not given a random error. A new match stores physics id
        pool-phys-v2. The playing surface is 2.54 m by 1.27 m. Anyone can replay the shot list, the
        timeouts and the forfeits on the{" "}
        <Link to="/fairness" className="font-semibold text-primary hover:underline">
          fairness page
        </Link>
        . A paid winner that disagrees with that replay is not a verified result. The check does not
        move money back.
      </p>
      <p className="mt-3">
        A crypto 8 ball pool match on this page is a bitcoin pool game only because Bitcoin can fund
        the dollar balance. There is no 8 ball pool nft and no 8 ball pool web3 token. An 8 ball
        pool usdt transfer, an 8 ball pool solana transfer, and an 8 ball pool ethereum transfer are
        deposits into that same balance, not a second table. An 8 ball pool wager is the stake both
        players post. An 8 ball pool bitcoin label does not change the 5% fee. Crypto billiards and
        a billiards crypto game are this table. 8 ball pool pvp means the opponent is a person. A
        pvp pool game is not a wheel. This is not an 8 ball pool stake casino under another brand.
        People who want to gamble on pool or bet on pool games are looking for a match like this.
        Whether the question is pool gambling legal, or is betting on pool legal, depends on where
        you live. This page is not a statute and not legal advice. An 8 ball pool legit check is the
        replay. An 8 ball pool payout is the 95% credited when the match settles. Promo credit and
        partner credit can fund a stake. Deposited or won money is used first. Bonus you lose to
        the other player stays bonus.
      </p>
      <p className="mt-3">
        You must be 18 or older, and permitted to play for money where you live. Only use money you
        can afford to lose. Limits and self-exclusion are on the{" "}
        <Link to="/responsible-gambling" className="font-semibold text-primary hover:underline">
          responsible gambling page
        </Link>
        . The longer notes are the{" "}
        <Link
          to="/guides/$slug"
          params={{ slug: "8-ball-pool-hub" }}
          className="font-semibold text-primary hover:underline"
        >
          8 ball pool hub
        </Link>
        ,{" "}
        <Link
          to="/guides/$slug"
          params={{ slug: "8-ball-pool-for-money" }}
          className="font-semibold text-primary hover:underline"
        >
          8 ball pool for money
        </Link>
        , and{" "}
        <Link
          to="/guides/$slug"
          params={{ slug: "pool-payday-review" }}
          className="font-semibold text-primary hover:underline"
        >
          Pool Payday review
        </Link>
        . Those reviews do not print another app&apos;s fee, because this site has not published
        one.
      </p>
      <h2 className="mt-6 font-display text-lg text-white">Questions</h2>
      <dl className="mt-3 space-y-3">
        {POOL_FAQS.map((faq) => (
          <div key={faq.q}>
            <dt className="font-semibold text-white">{faq.q}</dt>
            <dd className="mt-0.5 text-[#d7c4ff]">{faq.a}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
