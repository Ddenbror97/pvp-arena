import type { Guide } from "./types";

export const guide: Guide = {
  slug: "belmont-stakes-betting",
  cluster: "Horse racing",
  keyword: "belmont stakes betting",
  secondary: ["belmont stakes 2027", "belmont park tickets", "belmont stakes day admission"],
  title: "Belmont Stakes Betting: Schedule and Pool Rules",
  description:
    "Understand Belmont Stakes betting, the announced 2027 festival date, how to read the actual race card and why admission prices are not betting odds.",
  h1: "Belmont Stakes betting: schedule, race card and ticket costs",
  answer:
    "Belmont Stakes betting uses the wager menu and official race conditions for that year’s running. NYRA’s calendar lists the 2027 festival for June 3–5, with Stakes Day on June 5. Confirm the current venue, race distance, entries and betting menu on the official card before placing a ticket; an admission price is not a tote price.",
  facts: [
    "Use the official card for the correct year and venue.",
    "Morning-line forecasts and final tote payoffs are different.",
    "Admission buys entry to the event, not a wager.",
    "Combination tickets cost the number of combinations times the permitted base stake.",
  ],
  sections: [
    {
      id: "schedule",
      title: "Separate the event announcement from betting information",
      body: "The cited organizer announcement supplies the schedule information above. It does not by itself supply a complete betting card. Check the final race conditions, runners, post positions, scratches and wager minimums when the card is issued. A prior year’s field, distance or morning line cannot substitute for the upcoming edition.\n\nFor the Preakness in particular, the 2027 Sunday date differs from the older Saturday pattern. The explicit year prevents mixing the 2026 Laurel event with the planned Pimlico return.",
    },
    {
      id: "wagers",
      title: "Calculate the ticket’s cost",
      body: "A win bet selects the first finisher. An exacta requires the first two in order; a trifecta requires the first three in order. A three-horse trifecta box has 3 × 2 × 1 = six combinations. At a hypothetical $1 base, it costs $6. That is the purchase cost, not the amount paid if it wins. Confirm which base units the actual track offers.\n\nCompare [win-place-show wagers](/guides/win-place-show-betting), [exactas](/guides/exacta-bet) and [trifectas](/guides/trifecta-bet).",
    },
    {
      id: "payout",
      title: "Use the official result and pool dividend",
      body: "Pari-mutuel returns depend on the final pool, takeout, winning units and track rules. NYRA’s wagering page is a documented example of how these wager types and pool deductions work; its rates are not a national schedule or automatically the Preakness rates. A morning line is a forecast, while the declared dividend determines the winning return.\n\nCheck scratches, inquiry results and the posted payoff base before scaling to your stake. The [horse racing topic](/guides/topics/horse-racing) explains the surrounding terminology. Set a full-card budget using [responsible gambling limits](/responsible-gambling), including every box and backup ticket.",
    },
  ],
  faqs: [
    {
      q: "Does an admission ticket include a bet?",
      a: "No. Admission and wagering are separate purchases.",
    },
    {
      q: "Can I use last year’s morning line?",
      a: "No. It concerned another field and pool. Use the current year’s actual card and prices.",
    },
    {
      q: "What does a three-horse $1 trifecta box cost?",
      a: "Six combinations times $1, or $6, if the track permits that base.",
    },
    {
      q: "Is the tote price fixed when I bet?",
      a: "Not for a pari-mutuel ticket. The final declared payoff depends on the completed pool and official result.",
    },
  ],
  sources: [
    {
      label: "NYRA: 2027 Belmont Stakes festival calendar",
      url: "https://www.nyra.com/belmont-stakes/calendar/2027/06/",
    },
    {
      label: "NYRA: wager definitions, pools and takeout",
      url: "https://www.nyra.com/saratoga/racing/nyra-wagering-info/",
    },
  ],
  related: [
    "kentucky-derby-betting",
    "breeders-cup-betting",
    "horse-racing-odds-explained",
    "trifecta-bet",
    "how-to-bet-on-horse-racing",
    "preakness-betting",
  ],
  updated: "2026-11-26",
};
