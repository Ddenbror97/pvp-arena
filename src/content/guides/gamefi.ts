import type { Guide } from "./types";

export const guide: Guide = {
  slug: "gamefi",
  cluster: "Foundations",
  keyword: "gamefi",
  secondary: ["what is gamefi", "gamefi coins", "gamefi crypto", "blockchain games"],
  title: "GameFi Guide: Tokens, Play-to-Earn and Casino Overlap",
  description:
    "GameFi explained: tokens, guilds, play-to-earn loops, and where the category overlaps with — and differs from — a crypto casino.",
  h1: "GameFi: tokens, play-to-earn loops and the casino overlap",
  answer:
    "GameFi is the name for blockchain games that wrap play in tokens, NFTs and sometimes guilds, so progress can be traded. Many titles use a play-to-earn loop. A crypto casino can share a wallet and a chain with that world, but it is not a yield farm: you are staking a balance on chance, not grinding an emission schedule.",
  facts: [
    "GameFi blends 'game' and 'finance': in-game assets are tokens or NFTs that can trade outside the client.",
    "Play-to-earn is the most common GameFi loop: play mints rewards that later players are expected to buy.",
    "Guilds and scholarships appeared to finance expensive entry NFTs and share token output.",
    "Some GameFi products add wagering, loot boxes or house games, which is where the casino overlap starts.",
    "PVPspinArena is a crypto PvP casino on Base, not a GameFi title and not a studio token launch.",
  ],
  sections: [
    {
      id: "what",
      title: "What GameFi is, without the conference slide",
      body: `GameFi is a marketing word that stuck because it describes a real design choice. A blockchain game treats items, currencies or land as tokens you can move to a wallet you control. That is different from a Steam inventory you can only trade inside one company's rules.

Once an item is a token, someone will price it, lend it, fractionalise it or build a guild around it. "Finance" in the name is that secondary market, not a promise that you will get paid. Plenty of GameFi coins went to zero while the Discord still said "play to earn".

This explainer lives under [foundations](/guides/topics/foundations) next to [play to earn games](/guides/play-to-earn-games) and [what a crypto casino is](/guides/what-is-a-crypto-casino). Read those if you want the reward-loop maths or the casino definitions in isolation. Here the job is the category: tokens, guilds, where casinos sneak in, and where they should stay out.

PVPspinArena does not ship a game client, a land NFT or a studio token. It is a site where adults stake USDC or ETH on short chance games. Keep that contrast parked; we will use it after the category is clear.`,
    },
    {
      id: "tokens",
      title: "Tokens, NFTs and the usual two-token setup",
      body: `Most GameFi economies use at least two assets.

- **A governance or studio token.** Marketed as the "gamefi coin". Used for votes, staking pitches and treasury headlines.
- **A reward or energy token.** Minted by play, spent on crafts or breeding, sold by grinders.
- **NFTs.** Characters, plots, tools. The thing you actually click.

The two-token setup exists so the team can tell a story about scarce governance while still printing a wage token. Holders of the first asset want the second asset to stay desirable. Players of the second asset want it to stay expensive in dollars. Those wishes fight.

Read emissions, unlocks and team allocations. A vesting chart is more useful than a trailer. If the marketplace is only the team's dex pair, you are taking venue risk on top of game risk. ethereum.org's NFT docs are a plain description of what an NFT is; they are not an endorsement of any floor price.

### Why the two tokens fight

Governance holders want the reward token scarce. Players want it expensive in dollars today. The studio wants both charts up while still printing a wage token. Those wishes cannot stay true once growth flattens. If the patch notes talk more about "tokenomics rebalance" than combat, the finance layer is already the product.`,
    },
    {
      id: "loops",
      title: "Play-to-earn loops and guilds",
      body: `The default GameFi loop is play-to-earn: activity mints a token, sinks are supposed to eat it, and a market translates leftovers into cash. Guilds form when the NFT buy-in is high. Managers own the assets, scholars play, both take a cut of the mint.

That structure can be disclosed and still be a bad bet. It can also be fun as a game if you ignore the finance. The failure mode is calling the mint a salary. When new users slow down, reward tokens inflate and NFT floors drop. Scholarships then look like unpaid internships with extra phishing.

### Questions that cut through the lore

- What must be true for the reward token not to fall 80%?
- Who can pause the marketplace?
- What do scholars owe if the NFT is stolen from a shared login?
- Is there gameplay you would still do at a zero token price?

If the only honest answer to the last question is no, you do not have a game with a market. You have a market with a game skin.

### A worked two-token week

Monday: reward token $0.20, studio token $2.00, entry NFT $300. Scholars mint and sell the reward token to new players who need it for crafts.  
Friday: a large studio-token unlock hits. The studio coin drops to $1.20. New players pause. Reward-token bids thin. By Sunday the reward token is $0.09 and the NFT bid is $140. Nobody changed the combat. The week was a market week wearing a game client.

Write the three prices in a notebook for a month before you call the title "GameFi you can live on". If you would not hold the studio coin with the game closed, do not hold it because a quest says you earned it.`,
    },
    {
      id: "overlap",
      title: "Where GameFi overlaps with casinos",
      body: `The overlap is real and worth naming.

Some blockchain games add house-banked minigames, player-versus-player wagers, or loot boxes that are just cases with a wallet connect. Some casinos add "quests", "XP" and a site token that looks like GameFi. Both groups will use the words web3, play and earn in the same sentence.

### Overlap that is still gambling

- Wagering an NFT on a coinflip inside a game client. That is a chance bet, not a quest.
- Opening a paid crate whose contents have a market price.
- Staking a studio token for "house edge sharing" that is really a revenue-share IOU.

Those are chance products. They need the same adult rule, budget and honesty as a roulette spin. Dressing them as lore does not change the expected value.

### Overlap that is not a casino

- Trading a sword NFT because you like the pixel art.
- Completing a quest that pays a token you might sell.
- Providing liquidity on a pair, which is market-making risk, not a wheel.

A [web3 casino](/guides/web3-casino) should tell you the stake, the odds and how to check the result. A GameFi studio should tell you the mint. If one page is doing both jobs, read it twice.`,
    },
    {
      id: "vs-casino",
      title: "How a crypto casino differs from a GameFi loop",
      body: `A casino takes a balance you already own and exposes it to a stated chance. It should not need a new user to buy your quest rewards for the product to make sense.

| | GameFi title | Crypto casino |
| --- | --- | --- |
| Primary loop | Play, mint, sell | Deposit, stake, settle |
| Asset you hope stays bid | Reward token and NFT floor | Usually none if you use a stablecoin |
| Who pays you if you "win"? | A market, maybe | The pot or the house table |
| Proof | Sometimes a block explorer | Provably fair or a lab RNG |

PVPspinArena is the second column. [Jackpot](/) and [Coinflip](/coinflip) are player versus player with a default 0% fee. [Roulette](/roulette) is a published wheel. There is no guild, no scholarship and no "gamefi crypto" to farm. Our [PvP gambling guide](/guides/pvp-gambling) is the mechanics page.

If you want yield, a casino is the wrong building. If you want a short, checkable bet in dollars, a GameFi map is the wrong building. Using one product to cosplay the other is how people end up with an empty wallet and a character they cannot sell.`,
    },
    {
      id: "risks",
      title: "Risks that are specific to the category",
      body: `Besides ordinary "I lost a bet" risk:

- **Emissions.** Unlock calendars can dump on the chart you are grinding.
- **Admin keys.** A pause, a mint or a migrated contract can strand assets.
- **Guild custody.** Shared logins and "safe" bots.
- **Fake marketplaces.** Clone sites that drain the wallet you connected to "list an NFT".
- **Regulatory headlines.** Tokens described as investments attract different rules than a cosmetic.

The FTC's consumer pages on crypto and NFT income pitches are dry and useful. A trailer is not diligence.

None of this means blockchain games are forbidden. It means you should separate the fun budget from the speculation budget, and neither budget from rent. If a stranger in a guild Discord needs your seed phrase to "whitelist you", that is not GameFi. That is theft.`,
    },
    {
      id: "choose",
      title: "Picking a lane as an adult",
      body: `You can play a blockchain game for the combat and ignore the token. You can trade NFTs and ignore the game. You can gamble on a site that publishes odds. Doing all three with the same wallet in the same evening is how the categories blur until you cannot explain what you lost.

A practical split:

1. Game client on one device profile.
2. Speculation size you would be fine marking to zero.
3. Casino balance in a stable unit, on a site you can audit, with a hard stop.

PVPspinArena will only ever be lane 3: USDC or ETH on Base, email account, adult users, results you can verify. We will not launch a land sale to keep the lights on. If a GameFi pitch needs you to believe that, you are not looking at a casino and you should not use casino words to justify the deposit.

Keep the vocabulary honest for a week and most pitches sort themselves. “APY” on a game token is not a savings account. “Scholarship” is a split of an inflationary mint. “Land GDP” is a hope that later players will pay a fee. “Casino district” is gambling inside the loop. None of those sentences become safer because the art is good.

If you still want a wallet session that you can explain to another adult, prefer a product that names the stake, the fee and the draw. That is a casino. It can still harm you. It will not also ask you to recruit scholars so last season’s minters can exit. You must be 18 or older. A cartoon fox does not change that.`,
    },
    {
      id: "worked",
      title: "A worked example: one wallet, two products",
      body: `On Monday you buy a $300 character NFT because the patch notes say the next season will “rebalance earn.” You play ten hours and receive 4,000 reward tokens. The token’s bid is $0.04, so the sheet says $160 before the guild’s 30% cut. You net $112 of a coin you still have to sell into a thin pool.

On Tuesday the same wallet opens a GameFi “tavern.” You stake 1,000 of those tokens on a crash chart. The tavern is a casino. It does not care about your scholarship ratio. You lose the 1,000 tokens. Your Monday grind just funded a house game that was never in the white paper’s wage story.

On Wednesday the reward token is $0.02. The NFT floor is $90. You still have a fun character if the combat is fun. You do not have a job. You have a collectible, an inflationary leftover and a losing wager.

| Monday story | Tuesday product | Wednesday fact |
| --- | --- | --- |
| “I earned $160” | Crash in the tavern | Token bid $0.02 |
| Guild split | House game | NFT floor $90 |
| Season hype | Same wallet | Two losses, one hobby |

The fix is labelling. Put GameFi speculation in a size you can mark to zero. Put casino stakes in a dollar cap on a site that publishes the draw. Do not let a tavern inside the map spend the wage you have not even sold yet.

A token that also acts as a chip is the overlap with gambling. [NFT gambling](/guides/nft-gambling) is that overlap when the picture itself is the stake.`,
    },
  ],
  faqs: [
    {
      q: "What is GameFi?",
      a: "GameFi is the label for blockchain games whose items or currencies are tokens you can trade, often with play-to-earn rewards, guilds and a studio coin.",
    },
    {
      q: "Are GameFi and play to earn the same thing?",
      a: "Play to earn is the most common GameFi loop, but GameFi also covers tradable items and studio tokens even when the daily wage story is gone.",
    },
    {
      q: "What are GameFi coins?",
      a: "Usually the governance or studio token sold to fund the project and used in staking or voting pitches. They are not a casino chip unless a site treats them as one.",
    },
    {
      q: "Is a crypto casino GameFi?",
      a: "Only in the loose sense that both may use a wallet. A casino is a chance product with a stake. GameFi is a game economy. PVPspinArena is the former.",
    },
    {
      q: "Do I need a guild to try GameFi?",
      a: "No. Guilds exist to finance expensive NFTs. They add custody and split-income complexity. You can also just not buy in.",
    },
    {
      q: "Does PVPspinArena have a token?",
      a: "No. You deposit USDC or ETH on Base. There is no play-to-earn coin, land NFT or guild program.",
    },
  ],
  sources: [
    { label: "Wikipedia: GameFi", url: "https://en.wikipedia.org/wiki/GameFi" },
    { label: "ethereum.org: NFTs", url: "https://ethereum.org/en/nft/" },
    {
      label: "FTC: Cryptocurrency and scams",
      url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams",
    },
    { label: "Wikipedia: Play-to-earn", url: "https://en.wikipedia.org/wiki/Play-to-earn" },
  ],
  related: [
    "what-is-a-crypto-casino",
    "nft-gambling",
    "play-to-earn-games",
    "web3-casino",
    "are-online-casinos-rigged",
  ],
  updated: "2026-09-26",
};
