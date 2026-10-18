import type { Guide } from "./types";

export const guide: Guide = {
  slug: "trifecta-bet",
  cluster: "Horse racing",
  keyword: "trifecta bet",
  secondary: ["trifecta box", "trifecta wheel", "trifecta key", "boxed trifecta cost"],
  title: "Trifecta Bet: Box Costs, Key Wheels and Payout Odds",
  description:
    "Trifecta bet guide: straight, box, key and wheel options, a cost table for every combination, and how to pick a trifecta structure that fits your budget.",
  h1: "Trifecta bet: box costs, keys and wheels for a three-horse order",
  answer:
    "Trifecta bet tickets cash when you name the first three finishers in the correct order. A straight trifecta is one permutation. A box of n horses costs n × (n − 1) × (n − 2) × the base stake, because every order of three is a separate combination. Keys and wheels buy only the orders you still believe. The payoff is the trifecta pool minus takeout, split by the winning tickets. You must be 18+ or the local legal age.",
  facts: [
    "Three horses boxed make 3 × 2 × 1 = 6 trifecta combinations.",
    "Four horses boxed make 4 × 3 × 2 = 24 combinations. At $0.50 that box costs $12.",
    "Five horses boxed make 5 × 4 × 3 = 60 combinations. At $1 that box costs $60.",
    "A straight trifecta is one combination: A first, B second, C third.",
    "Keying one horse on top of four others for second and third is 4 × 3 = 12 combinations, not 24.",
    "Trifecta takeout is often higher than win-pool takeout. The rate is printed by the track, not guessed.",
  ],
  sections: [
    {
      id: "what",
      title: "What a trifecta bet is asking you to get right",
      body: `A trifecta bet is three finishing slots in order. The winner, the second horse and the third horse must match a combination you paid for. Naming the right three horses in the wrong order loses a straight ticket. A box loses too, unless that wrong order was one of the orders inside the box.

Third place is the new piece if you already understand an exacta. The exacta ignores third. The trifecta dies on it. [Exacta bet](/guides/exacta-bet) is the two-horse version of this arithmetic. [How to bet on horse racing](/guides/how-to-bet-on-horse-racing) is the window language that keeps a trifecta from being punched as a win bet by mistake.

The pool is pari-mutuel. Trifecta dollars stay in the trifecta pool. Takeout comes off. The net is divided by the money on the one winning permutation, then breakage rounds it down. A huge posted price means little money landed on that exact order. It does not mean the track set a generous fixed quote. You must be 18+ or the age required where the bet is legal. Keep a loss limit beside the ticket, and use [responsible gambling](/responsible-gambling) as the stop, not as a slogan. The rest of the cluster is [Horse racing guides](/guides/topics/horse-racing).`,
    },
    {
      id: "box-cost",
      title: "Trifecta box cost is n permute 3",
      body: `A box covers every way to order the horses you name into the first three slots. The count is the permutation n × (n − 1) × (n − 2). You multiply by the base the pool accepts. Many tracks take a $0.50 or $1 trifecta. Read the base on the screen before you multiply, because the same 24 combinations are $12 at fifty cents and $24 at a dollar.

| Horses boxed | Combinations n × (n − 1) × (n − 2) | Cost at $0.50 | Cost at $1 |
| --- | --- | --- | --- |
| 3 | 6 | $3 | $6 |
| 4 | 24 | $12 | $24 |
| 5 | 60 | $30 | $60 |
| 6 | 120 | $60 | $120 |
| 7 | 210 | $105 | $210 |

Worked example 1. Four horses at $0.50: 4 × 3 × 2 = 24 combinations, and 24 × $0.50 = $12. If the official payoff is $80 for a $1 trifecta, a $0.50 ticket on that order returns $40. The box cost $12, so profit is $28. If the payoff is $20 for $1, the $0.50 ticket returns $10 and the box loses $2 even though the three horses finished in an order you covered.

Worked example 2. Five horses at $1: 5 × 4 × 3 × $1 = $60. Sixty combinations, one winner. You need a payoff above $60 for $1 before that box profits. Large boxes are a budget decision, not a sign of a stronger opinion.`,
    },
    {
      id: "straight-key",
      title: "Straight tickets, keys and what they refuse",
      body: `A straight trifecta is one line: 4 over 7 over 2. At $0.50 it costs $0.50. You are saying the order, not the group. Most opinions are not that sharp, which is why boxes exist. The straight ticket is still the right buy when you truly have a sequence.

A key wheel keeps one horse in one job. Key the 4 on top, and use four other horses for second and third. Second can be any of the four, third any of the remaining three. Combinations: 4 × 3 = 12. At $0.50 the ticket costs $6. You refused every order in which the 4 does not win. A full box of those five horses would have been 60 combinations and $30. The key is the $24 you decided not to spend.

You can key a horse to second or to third the same way. The count changes with the job. Write the formula in words: "choices for first × choices for second × choices for third," and cross out a horse after you use it so you do not count 4 over 4. If the key is allowed to finish first or second, you add those cases. Adding cases until you are back at the full box means the key was a feeling, not a restriction. Restrictions are the only reason a wheel is cheaper.`,
    },
    {
      id: "wheels",
      title: "Part-wheels and the cost of extra slots",
      body: `A part-wheel names different sets for each slot. Example: the 4 and the 6 to win, three other horses to run second, and those same three plus one more to run third, with no horse used twice in a combination. You cannot read that cost off the box table. You count the legal lines.

A small version you can do by hand: horses A and B are the only ones you will accept on top. Horses C and D may run second or third. Orders with A or B first, then C and D in either order underneath:

A-C-D, A-D-C, B-C-D, B-D-C. Four combinations. At $1, the wheel costs $4. A box of A, B, C and D would have been 24. You refused every ticket in which C or D wins, and every ticket in which A or B runs third. That is a real opinion. Pay $4 for it, not $24.

| Structure | What you believe | Combinations in the example |
| --- | --- | --- |
| Straight | One exact order | 1 |
| Key on top of 4 | One horse wins, four others fill 2nd and 3rd | 12 |
| Two on top, two underneath | Only those four lines | 4 |
| Box of 4 | Any order of the four | 24 |
| Box of 5 | Any order of the five | 60 |

If your sentence does not match a row, do not let the machine pick the row that costs the most.`,
    },
    {
      id: "payout",
      title: "How trifecta payouts relate to the pool",
      body: `Payout odds on a trifecta are a result, not a menu. After the race the net pool is divided by the dollars on the winning combination. A $1 payoff of $400 means each $1 on that order gets $400 back, stake included in the way the track posts it. Your $0.50 ticket gets half of the $1 figure if the board is quoted per $1. Read the header. A board quoted per $2 is a different fraction: a 10-cent or 50-cent ticket is a slice of that quote.

Because takeout is removed first, the crowd's prices sum to more than the pool. You cannot add the implied chances of every trifecta combination and get 100%. The missing slice is the take and the breakage. [Horse racing odds explained](/guides/horse-racing-odds-explained) shows the same leak on a win bet, where the arithmetic is easier to see.

Probable payouts, if the track shows them, assume a result and move as money arrives. They are not a lock. A combination with a tempting probable is often tempting because almost nobody wants it. Sometimes that is a clue. Sometimes it is a horse that does not belong third. The payoff cannot tell you which, and a single fat score does not change the takeout on the next race.`,
    },
    {
      id: "budget",
      title: "A checklist to fit the trifecta to a budget",
      body: `Start from the dollars, then from the sentence, and buy the overlap.

- Decide the most you will spend on this race. Write it down.
- If the opinion is one order, buy the straight ticket and keep the change.
- If the opinion is a group of three, a box is 6 times the base. That is usually affordable.
- A four-horse box at $0.50 is $12. A five-horse box at $1 is $60. Look at the table before you tap.
- If one horse must win, key it and count  choices for second times choices for third.
- Compare the wheel with a win bet on that key horse. Buy the trifecta only if you also have an opinion about second and third.
- You are 18+. Stop when the day's limit is gone, even if the next race "sets up."

A second pass on the same budget: write the unit you would bet to win, then force the trifecta to live beside it. If the win unit is $4 and the wheel costs $18, you are staking four and a half win-bets on an order. That can be a fair description of a strong opinion about second and third. It can also be a wheel that grew while you tapped. The piece of paper is there so you notice which one you did. A $0.50 base exists to shrink the wheel, not to hide it. Twenty-four halves are still $12.

A budget that survives is a budget that refuses combinations. [Handicapping horses](/guides/handicapping-horses) might give you the key horse. It will not make a 60-combination box cheap. If the only way to "cover" the race is to include horses you cannot defend, the structure is too wide for the opinion.`,
    },
    {
      id: "choose",
      title: "Which structure matches which kind of race",
      body: `Short fields make boxes smaller and payoffs thinner, because fewer permutations exist and the public can cover them. A six-horse field boxed is already 120 combinations, which is a different hobby from a trifecta. In a short field, a straight ticket or a three-horse box is usually the honest product.

Large fields, including a twenty-horse Kentucky Derby, make a full box of "everyone I can see" impossible. The tool that fits is a key: one or two horses on top, a tighter group underneath. The Derby's own betting page is about that field size, and the [superfecta bet](/guides/superfecta-bet) page adds the fourth slot when you truly want it. The arithmetic on this page does not change because the race is famous.

Dead heats and scratches are the messy endings. A dead heat for third can split the trifecta into more than one winning line. A scratch removes lines and may refund only those lines. Re-read the ticket after a scratch instead of assuming you are alive for free. Then go back to the sentence test. A trifecta bet is justified when you can say who can win, who can run second and who can run third, and when the product of those lists is a number you can pay without borrowing from the next race.`,
    },
  ],
  faqs: [
    {
      q: "How much is a four-horse trifecta box?",
      a: "It is 24 combinations, because 4 × 3 × 2 = 24. At $0.50 the box costs $12. At $1 it costs $24. Only one order wins a normal race.",
    },
    {
      q: "What does n permute 3 mean on a trifecta?",
      a: "It is n × (n − 1) × (n − 2), the number of ways to assign n horses to first, second and third without repeating a horse. Five horses make 60 lines.",
    },
    {
      q: "Is a trifecta key cheaper than a box?",
      a: "Yes, when the key refuses orders. One horse on top of four others is 12 lines. Boxing those five horses is 60 lines. The saving is the orders you agreed to lose.",
    },
    {
      q: "Does a trifecta pay a fixed price?",
      a: "No. The return is the trifecta pool minus takeout, divided by the winning combination, then rounded by breakage. The probable payout can move until betting closes.",
    },
    {
      q: "What is a straight trifecta?",
      a: "One ordered line, such as the 4 to win, the 7 second and the 2 third. It costs a single base unit. Any other order of those horses loses.",
    },
  ],
  sources: [
    { label: "Trifecta", url: "https://en.wikipedia.org/wiki/Trifecta" },
    { label: "Parimutuel betting", url: "https://en.wikipedia.org/wiki/Parimutuel_betting" },
    { label: "Equibase", url: "https://www.equibase.com/" },
  ],
  related: ["exacta-bet", "superfecta-bet", "how-to-bet-on-horse-racing", "horse-racing-odds-explained"],
  updated: "2026-10-06",
};
