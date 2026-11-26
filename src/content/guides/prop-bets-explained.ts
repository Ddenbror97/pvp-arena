import type { Guide } from "./types";

export const guide: Guide = {
  slug: "prop-bets-explained",
  cluster: "Sports betting",
  keyword: "prop bets explained",
  secondary: ["what is a prop bet", "player props", "prop bet meaning", "same game parlay props"],
  title: "Prop Bets Explained: Player Props, Pricing and the Edge",
  description:
    "Prop bets explained: player and game props, how over/under prop lines are priced, the vig, correlated same game parlays, and college prop bans.",
  h1: "Prop bets explained: player props, pricing and the edge",
  answer:
    "Prop bets, short for proposition bets, are wagers on something inside a game rather than its final result: a player's points or passing yards, the first team to score, the total corners. Most are priced as over/under lines with vig on both sides, like a game total. They are popular because they are specific, but books often hold a larger margin on them, and several states restrict props on college players.",
  facts: [
    "A prop bet is on an event within a game, not the final result.",
    "Player props are usually over/under lines priced around −110 on each side, sometimes worse.",
    "−110 on both sides implies 52.4% each, so you need to win more than that to profit.",
    "Same game parlays combine correlated props; the book prices the correlation in.",
    "Ohio banned player props on college athletes in February 2024; other states restrict college props too.",
  ],
  sections: [
    {
      id: "types",
      title: "Types of prop bets",
      body: "- **Player props:** a player's statistics, such as points, rebounds, passing yards, strikeouts or anytime touchdown. See [first touchdown scorer bets](/guides/first-touchdown-scorer-bets) for one of the most popular.\n- **Game props:** events in the game that are not tied to one player: first team to score, total turnovers, will there be overtime, [both teams to score](/guides/both-teams-to-score) in soccer.\n- **Novelty or special props:** coin toss, length of the anthem, award winners. Many states do not allow these on regulated books.\n\nProps are offered for most major sports. [NFL betting](/guides/nfl-betting) and [NBA betting](/guides/nba-betting) have the deepest prop menus.",
    },
    {
      id: "pricing",
      title: "How prop lines are priced",
      body: "Most player props are an over/under line with odds on each side, just like a game [over/under](/guides/over-under-betting).\n\n**Example.** A quarterback's passing yards prop is 245.5, over −110, under −110.\n\n- −110 means you stake $110 to win $100. The break-even probability is 110 ÷ 210 = **52.4%** on each side.\n- The two sides add up to 104.8%. The extra 4.8% is the book's margin on this market.\n\nProps on less-bet players are often priced at −115/−115 or worse, a bigger margin. Some props are \"one-way\" (only a yes price, such as anytime touchdown at +150), which hides the margin; [implied probability](/guides/implied-probability) turns +150 into 40% so you can compare it with your own estimate.\n\nThe half-point (245.5) means no push is possible. Lines move as information arrives: an injury, a weather report, a change in role.",
    },
    {
      id: "parlays",
      title: "Same game parlays and correlation",
      body: "A same game parlay combines several props from one game, for example the quarterback over 245.5 passing yards and his top receiver over 70.5 receiving yards. Those outcomes are **correlated**: if one happens, the other becomes more likely. The book knows this and prices the parlay below what multiplying the individual odds would pay. Each extra leg also stacks another margin. [Parlay betting explained](/guides/parlay-betting-explained) shows how the margin compounds.",
    },
    {
      id: "rules",
      title: "Rules, voids and college props",
      body: "Read the settlement rules before you bet a prop:\n\n- **Did not play.** Many books void a player prop if the player does not take part; some settle it as a loss if he plays at all. The rule differs by book.\n- **Official stats.** Props settle on the official statistics, which can be corrected after the game.\n- **Overtime.** Most props include overtime unless the rule says otherwise.\n\nSeveral US states restrict props on college athletes because of harassment of players and integrity concerns. Ohio's regulator [banned player-specific prop bets on college sports in February 2024](https://spectrumnews1.com/oh/columbus/news/2024/02/23/player-specific-prop-bets-on-college-sports-no-longer-allowed-in-ohio) after a request from the NCAA, and other states have followed with their own limits. What a book offers you depends on the state you are in. The [sports betting topic](/guides/topics/sports-betting) has the state guides.",
    },
    {
      id: "edge",
      title: "Is there an edge in props?",
      body: "Props are the market where some bettors believe they can know more than the book: a role change, a matchup, a minutes limit. That can be true for a short time, and books respond by keeping prop limits low and moving lines quickly. Over many bets, a 52.4% break-even rate is hard to beat after the margin. Track results honestly with a [bet tracker](/guides/bet-tracker) before you believe a hot streak.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
    },
  ],
  faqs: [
    {
      q: "What is a prop bet?",
      a: "A bet on something that happens within a game rather than on the final result, such as a player's points, the first team to score or total corners.",
    },
    {
      q: "What does over 245.5 at −110 mean?",
      a: "You win if the player records 246 or more. You stake $110 to win $100, so you need to win 52.4% of such bets to break even.",
    },
    {
      q: "Are prop bets a bad bet?",
      a: "They often carry a larger margin than main lines, and limits are low. They are not automatically bad, but the break-even rate is above 50% and the margin varies by book.",
    },
    {
      q: "What happens to a player prop if the player does not play?",
      a: "It depends on the book's rules. Many void the bet, some settle it as a loss once the player takes part. Read the rule before betting.",
    },
    {
      q: "Why can't I bet on college player props?",
      a: "Several states, including Ohio since February 2024, ban or restrict props on individual college athletes.",
    },
  ],
  sources: [
    {
      label: "Spectrum News: player-specific prop bets on college sports no longer allowed in Ohio",
      url: "https://spectrumnews1.com/oh/columbus/news/2024/02/23/player-specific-prop-bets-on-college-sports-no-longer-allowed-in-ohio",
    },
    {
      label: "Wikipedia: proposition bet",
      url: "https://en.wikipedia.org/wiki/Proposition_bet",
    },
    {
      label: "GambleAware",
      url: "https://www.gambleaware.org/",
    },
  ],
  related: [
    "first-touchdown-scorer-bets",
    "over-under-betting",
    "parlay-betting-explained",
    "implied-probability",
    "nfl-betting",
  ],
  updated: "2026-11-26",
};
