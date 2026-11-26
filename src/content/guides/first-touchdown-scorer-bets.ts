import type { Guide } from "./types";

export const guide: Guide = {
  slug: "first-touchdown-scorer-bets",
  cluster: "Sports betting",
  keyword: "first touchdown scorer",
  secondary: ["anytime touchdown"],
  title: "First Touchdown Scorer Bets: Rules and Examples",
  description:
    "Understand first touchdown scorer bets, anytime and team-first markets, quarterback scoring, defensive returns, inactive players and payout examples.",
  h1: "First touchdown scorer bets: who must score, and when",
  answer:
    "A first touchdown scorer bet wins when your selected player scores the game’s first touchdown. A later touchdown can win an anytime scorer bet but loses a game-first ticket. A touchdown pass counts for the receiver, not the passer; a quarterback can qualify by rushing or receiving. A field goal before the first touchdown does not settle a touchdown-scorer market.",
  facts: [
    "Game-first, team-first and anytime touchdown bets have different winning conditions.",
    "A passing touchdown does not make the quarterback the touchdown scorer.",
    "Rushing, receiving and eligible return touchdowns can count; read the selection and market rules.",
    "Participation, unlisted scorers and no-touchdown outcomes follow the operator’s published terms.",
  ],
  sections: [
    {
      id: "what",
      title: "First, anytime and team-first are different markets",
      body: "The market title determines which sequence matters. In a game-first market, a touchdown by either team can settle the bet. Team-first asks who scores that team’s first touchdown, even if the opponent has already scored. Anytime asks whether the player scores at least once during the covered game period.\n\n| Market | Winning condition | If the opponent scores a touchdown first |\n| --- | --- | --- |\n| Game-first scorer | Your player scores the first touchdown of the game | Your selection loses |\n| Team-first scorer | Your player scores their team’s first touchdown | Your selection can still win |\n| Anytime scorer | Your player scores at least one qualifying touchdown | Your selection can still win |\n\nA first-score market is different again: field goals and safeties can settle it. A first-touchdown market waits for a touchdown. For the surrounding markets, see [NFL betting](/guides/nfl-betting), [player props](/guides/prop-bets-explained) and the [sports betting topic](/guides/topics/sports-betting).",
    },
    {
      id: "scorer",
      title: "Does a touchdown pass count for the quarterback?",
      body: "DraftKings’ published football rules define the scorer as the player in possession of the ball in the opponent’s end zone and exclude the player who throws the touchdown pass. A receiver catching a touchdown qualifies; the quarterback throwing it does not qualify through that pass. A quarterback sneak or scramble into the end zone can qualify as a rushing touchdown.\n\nDefensive and special-teams touchdowns need particular care. A return can be the first touchdown even if the returner is absent from the player list. DraftKings’ Kansas rules say an unlisted scorer can make all listed selections lose; a D/ST selection has its own attribution rules. A list of offensive players is not a promise that only offensive touchdowns count. Check whether the ticket offers a D/ST, any-other-player or similar selection.\n\nTwo-point conversions are tries, not touchdowns. A touchdown nullified by penalty or overturned on review does not remain a scoring touchdown in the official result.",
    },
    {
      id: "sequence",
      title: "A scoring sequence that separates the tickets",
      body: "Consider this hypothetical sequence: the home team kicks a field goal, the away receiver scores a receiving touchdown, and the home running back scores a rushing touchdown.\n\nThe away receiver is the game’s first touchdown scorer. The earlier field goal does not disqualify that result. The home running back loses a game-first bet but can win both a home-team-first bet and an anytime bet. The away quarterback does not win a scorer bet merely for throwing the pass.\n\nIf that first touchdown is overturned, follow the corrected official sequence and the sportsbook’s settlement rules. Save the bet receipt and the relevant play-by-play if a grade appears inconsistent.",
    },
    {
      id: "price",
      title: "Payout and break-even at an example price",
      body: "At hypothetical odds of +800, a $10 winning stake earns $80 profit and returns $90 including the stake. The break-even probability is 10 / 90 = 11.11%, before considering uncertainty in your estimate.\n\nThat percentage is a price calculation, not a forecast for a player. Anytime usually has a lower payout for the same player because the player has more ways to qualify, but compare the actual accepted odds and identical participation rules. [Implied probability](/guides/implied-probability) explains the conversion. A first-touchdown loss stays a loss even if the player later scores three touchdowns.",
    },
    {
      id: "checks",
      title: "Participation and settlement checks",
      body: "Before placing a ticket, confirm the game, selected player, game-first versus team-first label, overtime treatment, participation requirement, unlisted-scorer rule and no-touchdown outcome. “Did not play” and “played but did not score” are different cases. A player who takes a snap and then leaves injured may have a losing active bet rather than a refund. Injury promotions can add separate conditions.\n\nRules differ by operator and jurisdiction; the DraftKings Kansas document cited below is an attributed example, not a rule for every book. Check the rules attached to the accepted wager. First-touchdown bets can resolve after one early drive, so set a total spending limit before kickoff; [responsible gambling tools](/responsible-gambling) can help prevent rapid replacement bets.",
    },
  ],
  faqs: [
    {
      q: "Does a field goal before a touchdown lose my first-touchdown bet?",
      a: "No. A first-touchdown market waits for the first touchdown. A market labelled first score can instead settle on a field goal or safety.",
    },
    {
      q: "Does the quarterback get credit for throwing a touchdown?",
      a: "Not in the touchdown-scorer rule described here. The receiver is the scorer; a quarterback needs a qualifying rushing, receiving or other scoring touchdown.",
    },
    {
      q: "Can my player score later and still win?",
      a: "A later score can win an anytime bet or, depending on the sequence, a team-first bet. It cannot win a game-first ticket once someone else has scored the first touchdown.",
    },
    {
      q: "What happens if a defensive player scores first?",
      a: "A defensive return can settle the game-first market. Read the unlisted-player and D/ST terms: under the cited DraftKings rules, an unlisted scorer can make listed player selections lose.",
    },
    {
      q: "Is a non-playing player automatically a losing selection?",
      a: "Check the participation terms. Inactive or did-not-play selections can be void, while a player who participates and fails to score can lose. An injury after participation does not automatically mean a refund.",
    },
  ],
  sources: [
    {
      label: "DraftKings Kansas: football player props and touchdown-scorer settlement",
      url: "https://boothillcasino.com/wp-content/uploads/2026/10/KS-DKE-House-Rules-v13.0-EN-CLEAN-9.2.26.pdf",
    },
    {
      label: "DraftKings: football markets and anytime touchdown examples",
      url: "https://sportsbook.draftkings.com/help/how-to-bet/football-betting-guide",
    },
  ],
  related: ["nfl-betting", "prop-bets-explained", "house-edge", "ats-in-betting", "pk-in-betting"],
  updated: "2026-11-26",
};
