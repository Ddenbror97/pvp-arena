import type { Guide } from "./types";

export const guide: Guide = {
  slug: "play-to-earn-games",
  cluster: "Foundations",
  keyword: "play to earn games",
  secondary: ["p2e games", "play to earn crypto", "nft games", "move to earn"],
  title: "Play to Earn Games: How P2E Works and Typical Risks",
  description:
    "How play to earn games work: token rewards, inflation, scholarships, and why a casino balance is a different product from a GameFi yield loop.",
  h1: "Play to earn games: token rewards, inflation and player risk",
  answer:
    "Play to earn games pay tokens or NFTs for in-game actions, then expect a market to buy those rewards. The loop works only while new money or new players absorb the tokens being printed. That is a GameFi yield design, not a casino balance: a casino stake is money you can lose on a round, not a job you do for an inflationary paycheck.",
  facts: [
    "Play-to-earn (P2E) usually means tokens or NFTs awarded for play that can be sold on an open market.",
    "If rewards are issued faster than buyers appear, the token price falls and later players earn less in dollars.",
    "Scholarship models let managers lend NFTs to players and split the token income.",
    "Move-to-earn apps use the same reward logic with fitness data instead of combat or farming.",
    "PVPspinArena is not a P2E title: it does not mint a play token or run a yield farm.",
  ],
  sections: [
    {
      id: "what",
      title: "What play to earn games are trying to be",
      body: `Play to earn games, often shortened to P2E, sit at the intersection of a video game and a token economy. You complete quests, win matches or walk a certain number of steps, and the software credits you a token or an NFT. If a market exists, you can sell that reward for another cryptoasset or for cash.

The pitch from 2020–2022 was straightforward: play is work, work should pay, and a blockchain makes the paycheck portable. Axie Infinity's scholarship era was the famous example: managers lent creatures to players, often in lower-income countries, and split the SLP income. Move-to-earn apps copied the structure with sneakers and step counts.

This page is part of our [foundations cluster](/guides/topics/foundations). The neighbouring [GameFi guide](/guides/gamefi) covers the wider category. Here the job is narrower: how the reward loop works, why it so often inflates, and why a [crypto casino](/guides/what-is-a-crypto-casino) balance is a different product even when both use a wallet.

PVPspinArena does not pay you for grinding. It does not have a guild, a scholarship or a governance token. If you deposit USDC, you have a dollar balance you can stake on Jackpot, Coinflip or Roulette. That is entertainment with a cost, not a job.`,
    },
    {
      id: "tokens",
      title: "Token rewards and why inflation shows up",
      body: `A P2E token is usually a utility or reward asset minted when players do the thing the designer wants: breed, win, walk, craft. Sinks are supposed to remove tokens: breeding fees, repairs, upgrades, burns. If minting outruns sinks, circulating supply rises. If demand does not rise with it, price falls.

### The loop in one paragraph

Early players buy NFTs, play, earn tokens, and sell to later players who need those tokens to enter or to upgrade. While the user chart is up and the story is loud, sellers find buyers. When growth slows, the same daily mint meets fewer bids. Dollar earnings collapse even if your in-game "pay" in tokens stays flat.

That is not a mystery bug. It is what happens when the wage is a newly issued coin. Labour markets paid in a national currency do not print that currency every time someone finishes a quest. P2E often does.

Designers try to slow the faucet: energy caps, repair costs, season resets. Those are brakes, not a guarantee. Read the emission schedule, the sink list and who owns the remaining supply before you treat a whitepaper APR as a salary.

### Energy caps are not a wage floor

An energy cap only limits how fast you can mint. If 50,000 players each mint a capped amount, the daily print can still swamp the bid. Unlock calendars compete with your quest: a team cliff is when many of those buyers become sellers.`,
    },
    {
      id: "scholarships",
      title: "Scholarships, guilds and who actually gets paid",
      body: `Scholarships appeared because entry NFTs were expensive. A manager holds the assets, a player uses them, and they split token output on a posted ratio. Guilds pooled capital and ran this at scale.

### What the split hides

- The manager's capital can go to zero if the NFT floor collapses.
- The player's "wage" is in a token whose dollar value the manager does not control.
- Both sides depend on someone else buying the token or the next scholarship slot.
- Account access, multi-factor codes and "manager wallets" create custody fights that no labour board will hear.

If a pitch leads with how many scholars you can recruit, you are looking at a distribution scheme that needs new players, not a game that needs fun. That can still be disclosed and adult. It is not a job with a payslip.

Guild tokens and "gamefi coins" add a second flywheel: people buy the guild token because the guild will onboard more scholars. When onboarding stops, both tokens can fall together. Treat stacked tokens as stacked risk, not as diversification.`,
    },
    {
      id: "example",
      title: "A worked inflation example",
      body: `Numbers below are simplified. They show the shape, not a live quote.

A game mints 1,000,000 reward tokens a day. Sinks burn 200,000. Net new supply is 800,000 a day. The token trades at $0.10, so the economy is paying about $80,000 a day to players, funded by whoever is buying.

If daily buy demand is $80,000, the price can hold. If demand drops to $40,000 and minting does not, inventory builds and the price slides. At $0.05, the same 800,000 net tokens are only $40,000 of wages. Players who joined for "$20 a day" now make $10 before they even play worse because the meta got crowded.

Meanwhile the entry NFT that cost $400 at the peak may now bid at $80. The scholar still has to split. The manager is underwater on the asset. Nobody cheated in this story. The faucet kept running.

When a dashboard shows "earn 50 tokens a day" and hides the dollar chart, it is showing you the mint, not the living. Always convert rewards to a currency you pay rent in, at today's bid, after fees.

### Same mint, three months later

Month 1: 800,000 net tokens, $0.10 bid, $80,000 of apparent wages, NFT floor $400.  
Month 3: still 800,000 net tokens, bid $0.03, $24,000 of wages, NFT floor $60. A scholar on a 50/50 split who "made $20 a day" now clears about $3 before fees. Write tokens per day and dollars per day, or you are reading a scoreboard.`,
    },
    {
      id: "risks",
      title: "Typical risks beyond a boring losing streak",
      body: `P2E risk is not only "the game was not fun".

- **Token inflation** as above.
- **NFT floor risk.** Your character is an asset someone has to want.
- **Smart-contract and admin-key risk.** A mint function or a paused market can strand you.
- **Phishing.** Fake inventory sites and "support" Discord servers steal wallets.
- **Regulatory and access risk.** An app store, a bank or a local rule can cut the off-ramp.
- **Time cost.** Hours are real even when the token is not.

The US Federal Trade Commission has warned consumers about crypto and NFT pitches that promise income. That warning applies here. A whitepaper is marketing. A scholarship Discord is not a human-resources department.

If you still want to try a title, cap the money and the hours as you would any speculative hobby. Our [gambling budget guide](/guides/gambling-budget) is written for stakes, but the same rule — only discretionary money, written down first — is the right frame for an entry NFT you might not resell.`,
    },
    {
      id: "vs-casino",
      title: "Why a casino balance is not a P2E paycheck",
      body: `People lump "crypto games" together because both use a wallet. The products do not share a balance sheet.

| | Play to earn | Crypto casino balance |
| --- | --- | --- |
| Why you receive tokens | A mint or reward schedule | You deposited them |
| What you hope happens | Someone buys your rewards | A round pays you |
| Hidden extra bet | Inflation and floor price | Usually none, if the unit is a stablecoin |
| Can you "work" your way out? | The pitch says yes | No. More play is more exposure |

A casino does not owe you a yield. On PVPspinArena you send USDC or ETH on Base, the site credits dollars, and you stake on [Jackpot](/), [Coinflip](/coinflip) or [Roulette](/roulette). You can lose. You cannot grind a governance token to offset the loss. That honesty is the feature.

A [web3 casino](/guides/web3-casino) may still use a wallet and a chain. It should not need you to recruit scholars. If a "casino" is paying you to play in its own coin, ask whether you are the liquidity for someone else's exit. That is P2E wearing a felt table.`,
    },
    {
      id: "choose",
      title: "How to look at a P2E pitch without the soundtrack",
      body: `Ask questions that have numbers.

1. What is minted per day, and what is burned?
2. Who holds the remaining token and NFT supply?
3. What happens to earnings if new users go to zero for 90 days?
4. Can you sell the reward on a venue you already trust, or only on the team's dex?
5. Is the fun still there if the token is worth nothing?

If the answers are slides instead of data, you have your result. Adults can speculate. They should not call a declining faucet a career.

PVPspinArena will not launch a play token to keep you on the site. If you want games of chance with a public result, use a dollar balance and a verifier. If you want a hobby that might sell a JPEG later, that is collecting or speculation — label it that way and keep it off the rent money.

A second pass on the same pitch, in plainer words: if the studio vanished tomorrow, what do you still hold? A fun save file is a game. A token that only trades on their dex is a receipt. An NFT that points at a dead server is a picture of a receipt. Write those three answers before you buy a “starter bundle.” If you cannot write them, you are buying a trailer.

Hours count. A loop that pays $4 a day after inflation and takes five hours is a $0.80 hourly story before you subtract the NFT that already dropped. Compare that to any other use of the same evening, including not playing. PVPspinArena will not pretend a [Jackpot](/) pot is a wage. If you still want chance games, use a dollar balance, a written cap and the [responsible gambling](/responsible-gambling) tools when the cap starts to move.`,
    },
    {
      id: "adult",
      title: "Age, law and what this site will not do",
      body: `Play to earn games marketed at teenagers with “make money after school” thumbnails are a red flag even when the token is real. This article assumes adults 18 or older. A scholarship Discord that onboards minors is not a cute growth hack. Leave it.

Law is local. Some countries treat certain reward tokens, paid loot boxes or wagering modules as gambling or as securities. This page is not legal advice and not a list of which titles are allowed on your street. If you cannot legally buy the token or stake it where you live, do not.

PVPspinArena will not run a P2E season, will not lend you an NFT, and will not pay you for watching [Roulette](/roulette). Jackpot and Coinflip are other players’ money in a pot. The unit is USDC or ETH on Base. The result is a chance game you can check. That is a different product from a faucet that needs a buyer tomorrow.

If a friend forwards a “new Axie” with a higher advertised daily dollar, run the same five questions. New art does not reset inflation. New guilds do not reset custody risk. A new casino skin on the same wallet does not turn a grind into a salary.`,
    },
  ],
  faqs: [
    {
      q: "What are play to earn games?",
      a: "They are games that pay tokens or NFTs for play, with the idea that you can sell those rewards. The dollar value depends on a market that has to keep buying newly issued assets.",
    },
    {
      q: "Why do P2E tokens crash?",
      a: "Often because rewards are minted faster than buyers appear. When growth slows, the same faucet meets less demand and the price falls.",
    },
    {
      q: "What is a P2E scholarship?",
      a: "A manager lends NFTs to a player and they split token income. Both sides take price risk; the player also takes custody and wage-volatility risk.",
    },
    {
      q: "Is move to earn the same idea?",
      a: "Yes. The action is walking or exercising instead of battling, but the economy is still a reward token that someone must buy.",
    },
    {
      q: "Is PVPspinArena a play to earn game?",
      a: "No. It is a crypto PvP casino. You deposit USDC or ETH, play Jackpot, Coinflip or Roulette, and there is no grind token or scholarship.",
    },
    {
      q: "Can I treat P2E earnings like a salary?",
      a: "You can receive payouts, but they are not a contracted wage in a stable currency. Price, sinks and new-user flow can erase the dollar amount overnight.",
    },
  ],
  sources: [
    { label: "Wikipedia: Play-to-earn", url: "https://en.wikipedia.org/wiki/Play-to-earn" },
    {
      label: "FTC: What to know about cryptocurrency and scams",
      url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams",
    },
    { label: "ethereum.org: NFTs", url: "https://ethereum.org/en/nft/" },
    { label: "Circle: USDC overview", url: "https://www.circle.com/usdc" },
  ],
  related: [
    "what-is-a-crypto-casino",
    "gamefi",
    "nft-gambling",
    "web3-casino",
    "are-online-casinos-rigged",
  ],
  updated: "2026-09-26",
};
