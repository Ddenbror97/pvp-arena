import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pachislot",
  cluster: "Games of chance",
  keyword: "pachislot",
  secondary: ["pachislo", "japanese slot machine", "skill stop slots", "pachislot settings"],
  title: "Pachislot: Skill Stop, Settings 1-6 Explained",
  description:
    "Pachislot explained: Japanese skill-stop slots, how meoshi works, what settings 1 through 6 change, and how parlours differ from Western machines.",
  h1: "Pachislot: skill-stop reels, settings 1–6 and how halls work",
  answer:
    "Pachislot (pachislo) is the Japanese reel machine: a portmanteau of pachinko and slot. You start the reels with a lever, then stop each reel yourself. An internal lottery decides whether a winning combination is awarded; the buttons let you land it, or miss it, within a small slip window. Halls set the machine to one of several payout steps, commonly 1 (tight) through 6 (loose).",
  facts: [
    "The name is パチスロ: pachinko + slot. English spellings include pachislot and pachislo.",
    "Players press three stop buttons; Western casino slots usually stop the reels for you.",
    "Japanese amusement law wants a technical action from the player; skill stop is that action.",
    "On modern generations the reels may slip a few frames (commonly up to four) to pull in or avoid a combination the lottery already decided.",
    "Settings are chosen by the hall, not by the player. Higher setting means a higher long-run payout rate, not a promised session.",
  ],
  sections: [
    {
      id: "what",
      title: "What a pachislot machine is",
      body: `A pachislot cabinet looks like a slot and plays like a hybrid. You sit in a Japanese pachinko parlour (or in the adult corner of a game centre), obtain medals or electronic credits from the lending unit, bet, pull or press start, then tap three large stop buttons, usually left to right. Small wins pay medals. Bigger wins are bonuses, assist-time stretches, or replay loops, depending on the generation and the model.

It is not a Las Vegas reel that spins and dies on its own. English Wikipedia's slot-machine page treats Japanese machines as a separate descendant: the player must stop the reels. Japanese Wikipedia is blunter: casino slots stop automatically; pachislot stops when you press, because the law wants **technical intervention** from the player, the same family of requirement that keeps pachinko a physical skill-ish ball game.

Cash does not come out of the hopper as a jackpot cheque. Halls pay in medals or credits. You exchange leftovers for prizes. A legally separate prize-exchange counter, by custom, turns certain prizes into money. That three-step path is the same custom described in [pachinko odds](/guides/pachinko-odds). This page will not invent a single "Japan pachislot RTP." Hall setting, model generation and how cleanly you stop the reels all move the result.

Online tiles labelled "pachislot" are usually Western slots with Japanese art, or skill-stop clones with a posted lab RTP. Price those from the info panel, the way you would price [crypto slots](/guides/crypto-slots). The parlour machine and the lobby tile are different products.

Pachislot sits in the [Games of chance topic](/guides/topics/games-of-chance). The ball-and-nail cousin is pachinko; the Western reel maths is [slot machine odds](/guides/slot-machine-odds).`,
    },
    {
      id: "skill-stop",
      title: "Skill stop and meoshi",
      body: `**Meoshi** (目押し, "pressing what you see") is the craft of hitting the button when the symbol you want is in the window. Players learn reel strips, count frames, and use the paper seam on the reel as a timing mark. Missing a cheap "cherry" or "watermelon" on some models means you forfeit a payout the lottery had already given you. Hitting a bonus symbol on some models is required to collect the bonus the lottery awarded.

### The lottery comes first

This is the fact that breaks the Western "I can time a jackpot" fantasy. The machine draws an internal result when you start the spin (or on a related timing defined by the model). That result says "small win," "replay," "bonus," or "nothing," among other model-specific flags. The reels then **try to display** a legal picture of that result.

If the lottery said no bonus, you cannot manufacture one by perfect timing. The reel control will slip, bounce or slide so that the bonus symbols refuse to line up. If the lottery said yes, the same control will often **pull** the winning symbol in from a few frames away, so a slightly late press still collects.

### The slip window

Japanese technical standards for later generations cap how far a reel may move after the button: a common teaching figure is a maximum of **four frames** of slip on 5-号機-era machines, with the machine required to pull in an awarded combination if it sits inside that window. Hobby manuals also quote older mechanical limits (reel speed caps, symbol counts). Those numbers are engineering constraints, not a promise that your eyes beat the chip.

So skill is real and bounded:

- **Real:** you can take an awarded small win, or miss it. You can follow an on-screen stop order during assist time. You can read some setting hints from which symbols you were able to stop.
- **Bounded:** you cannot override a "no" from the lottery. A perfect meoshi on a dead spin is still a dead spin.

That is closer to "land the shot the ref already called" than to "create the goal." The [illusion of control](/guides/illusion-of-control) is strong here because your finger is on a button. The lottery still ran.`,
    },
    {
      id: "settings",
      title: "Settings 1 to 6, and why halls use them",
      body: `A **setting** (設定, *settei*) is an internal configuration the hall chooses when it installs or rotates the machine. It changes selected probabilities: bonus rate, assist-time rate, long-run medal-out, depending on the model. The player does not pick it. There is no on-screen "difficulty" toggle.

### The usual ladder

There is no statute that says "there must be six settings." Japanese Wikipedia's article on pachislot settings notes that too many steps make type-testing slow and too few make halls inflexible, so **six steps became the custom** through the 4-号機 era: setting 1 lowest, setting 6 highest. During the 5-号機 years some makers shipped four-step machines and even relabelled the top step (H, 4, or 7 depending on the brand). From about 2015 most makers returned to a six-step ladder. When someone says "this hall is all 6s," they mean the generous end of that ladder, not a legal maximum written in a statute.

| Informal band | Typical labels | What it means |
| --- | --- | --- |
| Low | 1, 2 | Tighter medal-out, rarer bonuses |
| Middle | 3, 4 | Hall default on many floors |
| High | 5, 6 | Looser long-run rate |

A high setting is still a long-run rate. A short session on setting 6 can lose. A short session on setting 1 can boom. That is variance, the same idea as [slot machine odds](/guides/slot-machine-odds), not a side deal.

### How players try to read a setting

Because the hall does not post the switch, a culture of **setting inference** grew: bonus intervals, replay rates, the way certain symbols stop, data units bolted to the cabinet. Inference is noisy. Hundreds of spins can still sit inside the overlap between setting 2 and setting 5. Anyone selling a "100% setting crack" after twenty spins is selling certainty they do not have.

This guide will not quote a made-up payout percentage for "setting 4 on all Japan machines." Models differ. Test documents differ. If a specific machine's official spec sheet lists a range, use that sheet. If it does not, you do not have a number.`,
    },
    {
      id: "generations",
      title: "Generations, medals and the parlour floor",
      body: `Japanese machines are typed by regulation generation (4-号機, 5-号機, 6-号機 and later). Each generation reset what bonus structures and medal-out ranges were legal. 4-号機 machines, remembered for violent bonus streaks, were removed from halls on a schedule after 5-号機 rules arrived. Later generations added assist-time (AT) and assist-replay-time (ART) games where the skill is following lights more than hunting a 7.

You do not need the full type-test manual to use a hall. You need:

1. The **model's** posted or booklet flow (when to stop, what a bonus looks like).
2. The knowledge that the **hall**, not you, chose the setting.
3. A medal budget you can lose, because the exchange path is still gambling for adults.

### Money and age

Medal play that converts to cash through prizes is gambling in economic substance. Japan regulates parlours under amusement law, not as Western casinos, but the budget problem is the same. Play is for adults (18+, or the local legal age where you are). A home pachislot cabinet with the dip switches jammed on 6 is a toy; a parlour row is a business.

### What a spin actually looks like

1. Bet 1–3 medals (model-specific; some later machines use a single credit button).
2. Start. The lottery draws.
3. Stop left, then centre, then right — unless the screen tells you a different order during assist time.
4. If a small combination was awarded and you placed it on the payline, medals drop or credits tick up.
5. If a bonus was awarded and you lined the bonus picture, the bonus or AT block starts.
6. If you miss an awarded picture that sat outside the slip window, you collect nothing for that flag. That miss is the skill tax.

A player who cannot meoshi still plays. They just leak a slice of the awarded small wins. Halls know this; some older floors offered staff help lining bonus symbols, a practice Japanese coverage says amusement-law enforcement tightened around 2011. Do not expect a clerk to stop your reels for you.

### Side-by-side

| | Pachislot | Western casino slot | Pachinko |
| --- | --- | --- | --- |
| Action | Lever + three stops | Button or touch, auto stop | Fire steel balls at nails |
| Hidden hall control | Setting 1–6 (typical) | Configured RTP in the cabinet | Nail / board setup |
| Cash path | Medals → prize → exchange shop | Ticket / TITO / handpay | Balls → prize → exchange shop |
| Can you miss an awarded line? | Yes, if you mistime | Usually no | You can miss a pocket |

### What a Western "skill stop" slot is

Some US and UK novelty machines copied the three buttons. Many still decided the result first. The buttons were there to satisfy a skill clause or to feel Japanese. Read the paytable. If the reels cannot miss an awarded line, you are on a display device. If they can miss, you are closer to meoshi — and you can also throw away paid combinations.

Home cabinets sold as second-hand "pachislo" often have a dip-switch block for settings 1–6. On a living-room machine that pays nobody, a switch on 6 is how you make the toy last. In a parlour, that switch is the hall's margin tool.`,
    },
    {
      id: "pvp",
      title: "Opaque settings versus a hashed PvP round",
      body: `Pachislot hides the most important number (the setting) inside the cabinet. You see medals, lights and a stop order. You do not see the switch.

PVPspinArena publishes the price instead. It runs three player-vs-player games in USDC or ETH on Base. [Coinflip](/coinflip) is a 50/50. [Roulette](/roulette) is 33 slots: 16 Purple and 16 Silver at 2x, 1 Green at 14x, every bet returning 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee. [Jackpot](/) sets win chance equal to your share of the pot. Results use committed seeds; any settled round can be recomputed on [fairness](/fairness). There is no hidden setting 4.

A hall on setting 5 is not "hot tonight." It is a long-run medal-out rate that still produces dead hours. Sitting down because the last player walked away with a bag is a hidden switch plus ordinary clustering. If you cannot know the setting, you cannot price the session.

Pachislot pays medals. The parlour's prize counter then exchanges those medals, often through a separate shop, for goods or a voucher. That extra step is why a "setting 6" story still is not a published RTP like a Western slot's help screen. You are estimating a chain: lottery rate, stop skill, exchange rate. The pinball cousin on the other side of the aisle is priced in [pachinko odds](/guides/pachinko-odds). Related luck-and-lotto pages: [quick pick](/guides/quick-pick-lottery), [pull tabs](/guides/pull-tabs), and [lucky numbers](/guides/lucky-numbers-gambling).

The same variable-ratio lights that make pachislot sticky are the topic of [skinner box slot machines](/guides/skinner-box-slot-machines). If the row of cabinets, or the next on-chain match, is already a chase, use [responsible gambling](/responsible-gambling). Play is 18+ only.

See also [loose slots](/guides/loose-slots).`,
    },
  ],
  faqs: [
    {
      q: "What is pachislot?",
      a: "A Japanese reel machine you stop yourself with three buttons. An internal lottery decides the award; skill stop decides whether you display and collect it. Halls set a payout step, often labelled 1 to 6.",
    },
    {
      q: "Is pachislot a slot machine?",
      a: "It is a relative, not a copy. Western casino slots usually stop automatically and pay cash to a ticket. Pachislot requires stop buttons and pays medals that leave through a prize-exchange custom.",
    },
    {
      q: "What do pachislot settings 1 to 6 mean?",
      a: "They are hall-chosen payout steps. Setting 1 is the tightest common step, setting 6 the loosest. The player cannot select them. A high setting is a long-run rate, not a guaranteed session.",
    },
    {
      q: "Does skill stop let you beat the machine?",
      a: "It lets you collect combinations the lottery already awarded, and it lets you miss them. It does not create a bonus the lottery refused. The slip window is a few frames, not a second chance at the chip.",
    },
    {
      q: "Is pachislot the same as pachinko?",
      a: "No. Pachinko is a vertical pin field and steel balls. Pachislot is three reels and stop buttons. They often share a parlour and the same prize-exchange path.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Slot machine (pachislot section)",
      url: "https://en.wikipedia.org/wiki/Slot_machine#Japanese_pachisuro_or_pachislot",
    },
    {
      label: "Japanese Wikipedia: パチスロ",
      url: "https://ja.wikipedia.org/wiki/%E3%83%91%E3%83%81%E3%82%B9%E3%83%AD",
    },
    {
      label: "Japanese Wikipedia: 設定 (パチスロ)",
      url: "https://ja.wikipedia.org/wiki/%E8%A8%AD%E5%AE%9A_(%E3%83%91%E3%83%81%E3%82%B9%E3%83%AD)",
    },
    {
      label: "Encyclopaedia Britannica: slot machine",
      url: "https://www.britannica.com/topic/slot-machine",
    },
  ],
  related: [
    "pachinko-odds",
    "slot-machine-odds",
    "skinner-box-slot-machines",
    "crypto-slots",
    "illusion-of-control",
    "plinko-gambling",
    "quick-pick-lottery",
    "pull-tabs",
    "lucky-numbers-gambling",
    "loose-slots",
  ],
  updated: "2026-09-27",
};
