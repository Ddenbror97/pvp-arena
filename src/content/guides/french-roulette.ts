import type { Guide } from "./types";

export const guide: Guide = {
  slug: "french-roulette",
  cluster: "Casino games",
  keyword: "french roulette",
  secondary: ["la partage", "en prison roulette", "french roulette call bets", "voisins du zero"],
  title: "French Roulette: La Partage, En Prison and Call Bets",
  description:
    "French roulette explained: the single-zero wheel, la partage and en prison halving the even-money edge to 1.35%, the French layout names and every call bet.",
  h1: "French roulette: la partage, en prison and the call bets",
  answer:
    "French roulette is single-zero roulette played with French layout names and, usually, one of two zero rules on even-money bets. La partage returns half of an even-money stake when zero lands; en prison holds the stake for one more spin. Either rule cuts the even-money house edge from 2.70% to about 1.35%. Every other bet keeps the standard 2.70% single-zero edge.",
  facts: [
    "The wheel has 37 pockets: 1 to 36 plus a single zero.",
    "Standard single-zero edge: 1/37 ≈ 2.70% on every bet.",
    "La partage or en prison cuts even-money bets to about 1.35%.",
    "Voisins du Zéro covers 17 numbers with 9 chips; Tiers covers 12 with 6; Orphelins covers 8 with 5.",
    "Call bets are placed on the racetrack and keep the 2.70% edge.",
    "American double-zero roulette costs 5.26%, nearly four times French even-money bets.",
  ],
  sections: [
    {
      id: "what",
      title: "What makes roulette French",
      body: `Three things separate French roulette from the generic "European" game you see online: the single-zero wheel, the French names on the layout, and a zero rule that protects even-money bets.

The single-zero wheel is associated with François and Louis Blanc, who ran the casino at Bad Homburg in the 1840s before François Blanc took over the Monte Carlo casino. The double-zero wheel stayed common in the United States, which is why "American roulette" still means 38 pockets.

Order of numbers on the French (and European) wheel, clockwise from zero:

0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26.

That order matters for the call bets below, because they cover sectors of the wheel rather than areas of the table.

A traditional French table is often a double layout with the wheel in the middle and a croupier team that includes a chef de table. Many casinos, and most online versions, now use a single layout with a racetrack. Payouts and probabilities for every standard bet sit in the [roulette odds chart](/guides/roulette-odds-chart); this page concentrates on what is specifically French.`,
    },
    {
      id: "zero-rules",
      title: "La partage and en prison: the maths",
      body: `On a plain single-zero wheel, a $10 bet on red wins 18 times in 37, loses 19 times, and pays even money. EV = (18 − 19) / 37 × $10 ≈ −$0.27. Edge 2.70%.

### La partage

Under la partage ("the sharing"), when zero lands, an even-money bet loses only half. Per 37 spins on a $10 bet: 18 wins (+$180), 18 losses (−$180), one zero (−$5). Net −$5 over 37 bets of $10, an edge of 5/370 ≈ 1.35%.

### En prison

Under en prison, when zero lands, the even-money stake is "imprisoned" and rides the next spin. If that spin wins the bet, the stake is released and returned with no profit. If it loses, the stake is gone. Under the common single-imprisonment rule the result is also about a 1.35% edge, and the practical difference from la partage is small. Some houses let an imprisoned bet be imprisoned again if zero hits a second time, while others treat a second zero as a loss. Those variants move the figure only by a few hundredths of a percent, so read the house rule but do not lose sleep over it.

### Which bets qualify

Only the even-money chances: Rouge/Noir (red/black), Pair/Impair (even/odd) and Manque/Passe (1 to 18 / 19 to 36). Dozens, columns, straights, splits and every call bet stay at 2.70%.

| Game and bet | House edge | Expected loss per $1,000 wagered |
| --- | --- | --- |
| French, even money with la partage or en prison | 1.35% | $13.50 |
| French or European, any other bet | 2.70% | $27.03 |
| American, most bets | 5.26% | $52.63 |
| American, five-number bet (0, 00, 1, 2, 3) | 7.89% | $78.95 |

The practical conclusion is plain: if you play roulette and like even-money bets, a French table with la partage is the cheapest version you will find. Our [how to win at roulette](/guides/how-to-win-at-roulette) guide explains why that choice of table matters more than any system.`,
    },
    {
      id: "layout",
      title: "The French layout and bet names",
      body: `French tables label bets in French. Online games usually show both languages, but a live French table will use these terms.

| French name | English | Numbers covered | Pays |
| --- | --- | --- | --- |
| Plein | Straight up | 1 | 35 to 1 |
| Cheval | Split | 2 | 17 to 1 |
| Transversale pleine | Street | 3 | 11 to 1 |
| Carré | Corner | 4 | 8 to 1 |
| Sixain (transversale simple) | Six line | 6 | 5 to 1 |
| Douzaine (P12, M12, D12) | Dozen | 12 | 2 to 1 |
| Colonne | Column | 12 | 2 to 1 |
| Rouge / Noir | Red / Black | 18 | 1 to 1 |
| Pair / Impair | Even / Odd | 18 | 1 to 1 |
| Manque / Passe | 1–18 / 19–36 | 18 | 1 to 1 |

The dozens are marked P12 (premier, 1 to 12), M12 (moyen, 13 to 24) and D12 (dernier, 25 to 36). The even-money boxes sit on both long sides of a classic French table rather than all along the bottom.

Payouts match European roulette exactly. Only the zero rule on the six even-money boxes differs. If you want to know why the colours are arranged the way they are on the wheel, see [roulette colors](/guides/roulette-colors).`,
    },
    {
      id: "call-bets",
      title: "Call bets: Voisins, Tiers, Orphelins and Jeu Zéro",
      body: `Call bets (also called announced or French bets) cover sectors of the wheel with a fixed pattern of chips. On a modern table you place them on the racetrack, an oval copy of the wheel order. Strictly, a "call" bet is one announced on credit; many casinos only accept these as announced bets with chips placed first, and online games place the chips for you.

### Voisins du Zéro (neighbours of zero)

17 numbers from 22 to 25, including zero: 22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25. It takes 9 chips: 2 on the 0/2/3 trio, 1 each on splits 4/7, 12/15, 18/21, 19/22 and 32/35, and 2 on the 25/26/28/29 corner.

### Tiers du Cylindre (third of the wheel)

12 numbers opposite zero: 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33. It takes 6 chips, one on each split: 5/8, 10/11, 13/16, 23/24, 27/30, 33/36.

### Orphelins (orphans)

The 8 numbers left over: 17, 34, 6 on one side and 1, 20, 14, 31, 9 on the other. It takes 5 chips: straight on 1, and splits 6/9, 14/17, 17/20 and 31/34. Note that 17 is covered twice.

### Jeu Zéro (zero game)

7 numbers close to zero: 12, 35, 3, 26, 0, 32, 15. It takes 4 chips: splits 0/3, 12/15 and 32/35, and a straight on 26.

Together, Voisins, Tiers and Orphelins cover all 37 numbers (17 + 12 + 8). Other common announced bets include **neighbours** of a number (the number plus two either side, 5 chips) and **finales** (for example finale 7 puts a chip on 7, 17 and 27).

### What call bets do not do

They are bundles of standard inside bets, so each carries the 2.70% edge. Covering a physical sector of the wheel does not help unless the wheel is biased, and modern wheels are checked and rotated for exactly that reason. A dealer cannot reliably aim the ball at a sector either. Believing a sector is "due" is the [gambler's fallacy](/guides/gamblers-fallacy).`,
    },
    {
      id: "table",
      title: "At a French table: calls, chips and procedure",
      body: `A traditional French game runs to a set rhythm, and the croupier's calls tell you where you are in it.

1. **"Faites vos jeux"** (place your bets): betting is open.
2. The croupier spins the wheel one way and launches the ball the other way.
3. **"Rien ne va plus"** (nothing more goes): betting is closed. Chips placed after this call are refused or returned.
4. The ball settles, the croupier announces the number with its colour, parity and high/low, for example "vingt-trois, rouge, impair et passe".
5. Losing chips are raked in, and winners are paid, usually starting with the outside even-money chances and moving inward.

### Chips and announced bets

On a crowded French table, players often hand chips to the croupier and announce a bet such as "Voisins par cinq" (Voisins at 5 per chip) or "Tiers par dix". The croupier places the pattern for you. Speak clearly, give the chip value, and wait until the bet is confirmed before the ball drops. Where the house rule requires chips to be down, a verbal bet without chips will not be accepted.

### La partage in practice

When zero lands, the croupier returns half of each even-money stake, or with en prison moves the stake onto a line or marker to show it is imprisoned. If you would rather take the half back than leave it in prison, many tables let you choose; ask before the spin.

### Tips

In many European casinos, tips are pooled for the staff and offered by saying "pour le personnel" (for the staff) as you hand over a chip. Customs vary by venue and country, so follow local practice.

### Online "French roulette"

Online versions reproduce the layout and racetrack, and many apply la partage automatically. The rule is not universal. Some games labelled French only borrow the look. Open the help screen, confirm the RTP for even-money bets is 98.65%, and you know la partage is on. If it says 97.30% for everything, it is a standard European game in French clothing.`,
    },
    {
      id: "play",
      title: "Playing French roulette well",
      body: `There is no bet selection that beats roulette, but there are choices that make it cheaper.

1. **Confirm the zero rule.** Many online tables labelled "European" have no la partage. Look for the rule in the help screen before you bet even money.
2. **Favour even-money bets if you want the lowest cost.** At 1.35% they cost half as much as anything else on the table.
3. **Size bets to the spin rate.** A live table might deal a few dozen spins an hour; an automated or online wheel can do far more. At $10 on red with la partage, each spin costs about $0.135 in expectation, so 50 spins is about $6.75 and 200 spins about $27.
4. **Treat call bets as entertainment.** Voisins with 9 chips of $5 is $45 a spin at 2.70%, about $1.22 expected cost per spin.

Progression systems do not change the edge; the [Martingale strategy](/guides/martingale-strategy) guide walks through why. Live studio variants that add random multipliers, such as [Lightning Roulette](/guides/lightning-roulette), change the payout structure and the RTP, so compare them on their own numbers. The [casino games hub](/guides/topics/casino-games) collects the other table games in this series.`,
    },
    {
      id: "pvp",
      title: "How the same maths shows up in a PvP round",
      body: `French roulette is a clean lesson in house edge: the zero is the casino's whole margin, and la partage literally hands back half of it on even-money bets.

PVPspinArena [Roulette](/roulette) is a different wheel with the edge built into the payout rather than a zero pocket. It has 33 slots: 16 Purple and 16 Silver pay 2x, and 1 Green pays 14x. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. That is higher than a French even-money bet at 1.35%, Purple and Silver are the same price, and Green costs more. Results come from committed seeds, and you can check any settled spin on the [fairness](/fairness) page.

Gambling is 18+ (or the local legal age). If you are chasing losses at any wheel, the [responsible gambling](/responsible-gambling) page has tools to set limits or take a break.

In the same cluster, see also [teen patti](/guides/teen-patti), [pai gow tiles](/guides/pai-gow-tiles), and [craps strategy](/guides/craps-strategy).`,
    },
  ],
  faqs: [
    {
      q: "What is the difference between French and European roulette?",
      a: "Both use a single-zero wheel with the same payouts. French roulette adds la partage or en prison on even-money bets, halving their edge to about 1.35%, and uses French names on the layout.",
    },
    {
      q: "What is la partage in roulette?",
      a: "When zero lands, even-money bets lose only half their stake. The other half is returned, which cuts the house edge on those bets from 2.70% to about 1.35%.",
    },
    {
      q: "How does en prison work?",
      a: "When zero lands, your even-money bet stays on the table for one more spin. If it then wins, you get your stake back without profit; if it loses, the stake is lost.",
    },
    {
      q: "What numbers are in Voisins du Zéro?",
      a: "The 17 numbers from 22 to 25 across zero on the wheel: 22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2 and 25. It takes nine chips.",
    },
    {
      q: "Do call bets improve my odds?",
      a: "No. They are groups of standard inside bets, so each keeps the normal 2.70% single-zero edge. They only change which numbers you cover.",
    },
    {
      q: "Is French roulette the best roulette to play?",
      a: "For even-money bets, yes. With la partage or en prison those bets cost about 1.35%, the lowest edge in standard roulette.",
    },
  ],
  sources: [
    { label: "Wikipedia: Roulette", url: "https://en.wikipedia.org/wiki/Roulette" },
    { label: "Wizard of Odds: roulette", url: "https://wizardofodds.com/games/roulette/" },
    {
      label: "Encyclopaedia Britannica: roulette",
      url: "https://www.britannica.com/topic/roulette",
    },
  ],
  related: [
    "roulette-odds-chart",
    "how-to-win-at-roulette",
    "lightning-roulette",
    "roulette-colors",
    "crypto-roulette",
    "sic-bo-strategy",
    "teen-patti",
    "pai-gow-tiles",
    "craps-strategy",
  ],
  updated: "2026-09-27",
};
