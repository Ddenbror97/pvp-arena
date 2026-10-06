import type { Guide } from "./types";

export const guide: Guide = {
  slug: "nft-gambling",
  cluster: "Foundations",
  keyword: "nft gambling",
  secondary: ["nft casino", "nft betting", "jpeg gambling", "nft floor price risk"],
  title: "NFT Gambling Guide: Stakes, Markets and Risks",
  description:
    "NFT gambling explained: staking JPEGs, floor-price risk, thin markets, and why a dollar chip is easier to budget than a token.",
  h1: "NFT gambling: staking JPEGs, floor risk and thinner markets",
  answer:
    "NFT gambling means using a non-fungible token as the stake, the prize or the 'membership' that lets you bet: you lock a JPEG, spin a vault, or take site credit against a floor price. The token is not a dollar. Floors move, books are thin, and a win can be another illiquid picture. A dollar chip is easier to budget because $20 is still $20 when the round ends.",
  facts: [
    "An NFT is a unique token on a chain; the image file is usually stored elsewhere and can be copied.",
    "Floor price is the lowest current listing in a collection, not a guaranteed bid for your exact token.",
    "NFT books are often thin: one listing can set the 'floor' with no buyers behind it.",
    "Play-to-earn and NFT casino products often mix game yield with a token you still have to sell.",
    "PVPspinArena is not an NFT casino. Stakes are USDC and ETH on Base, shown in USD.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What NFT gambling is — and what it is not",
      body: `NFT gambling is a label on several products that do not share a math sheet.

- **JPEG as chip.** You deposit an NFT. The site credits "floor × 0.7" in coins. You play slots or a vault. You withdraw a different NFT or a slice of a fungible token.
- **JPEG as ticket.** A mint or a raffle: buy an NFT, hope it maps to a prize. That is a lottery with a collectible receipt.
- **JPEG as access.** Hold a token, unlock a table. The bet itself might still be USDT. The NFT is a velvet rope that can go to zero.
- **On-chain pit.** A contract escrows two NFTs and a commit-reveal picks a winner. Closer to PvP, still stuck with two unique objects.

This sits in [foundations](/guides/topics/foundations) next to [what is a crypto casino](/guides/what-is-a-crypto-casino) and [web3 casino](/guides/web3-casino): know the chip before you praise the chain.

It is not "owning art." The picture can be right-clicked. What you own is a token id and a market that may not want it.

PVPspinArena does not take NFTs, does not mint a membership ape, and does not pay winners in JPEGs. Jackpot, Coinflip, Roulette — USDC and ETH on Base. You must be 18 or older.`,
    },
    {
      id: "floor-risk",
      title: "Floor price is not a bid for your token",
      body: `Collections advertise a floor: the cheapest listing. Traders treat it like a spot price. It is not.

Your token has traits. A rare trait can list above floor and never sell. A common trait can be unsalable if the only bids are 40% under. Floor is the lowest ask, not the highest bid. JPEG gambling that credits "floor" is crediting an ask.

Wash trading can print fake floors. Thin collections can have a floor set by someone listing to themselves. If the site uses an oracle on that number, they are pricing your stake off a possibly empty book.

### Trait risk versus collection risk

Even a "blue-chip" collection has intra-collection spreads. NFT betting that treats every ape as $X is doing the same violence as a skin site that treats every Doppler as one SKU. Your exact token is the chip. The dashboard number is a convenience.

If you cannot sell your exact token in a week near the credit you were given, you were not paid. You were given a quote.`,
    },
    {
      id: "worked-example",
      title: "Worked example: staking a 2 ETH floor JPEG",
      body: `A collection floor is 2.00 ETH. Your token is a common trait. An NFT casino credits 1.40 ETH (70% of floor) as play money. ETH is $3,000, so that is $4,200 of site coins.

You play a house game with a 5% edge and lose $800 of coins. You still "have" 1.13 ETH of credit. You request withdraw. They offer:

- a different common from the same collection (floor now 1.70 ETH), or
- 1.00 ETH in a liquid token after a 10% "liquidity fee."

Meanwhile the floor dropped 15% because a large holder listed. Your original token, if you had kept it, might bid at 1.50 ETH.

| Number | ETH | What it is |
| --- | --- | --- |
| Collection floor at deposit | 2.00 | Lowest ask, not your bid |
| Site credit | 1.40 | Their haircut |
| After play | 1.13 | Coins, not the JPEG |
| Offered NFT out | ~1.70 floor | Different token, new book |
| Offered ETH out | 1.00 | Cash after another fee |
| Bid on *your* original token now | 1.50 | The exit you skipped |

You did not "lose 0.27 ETH at the tables" only. You also sold a spread and bought a different illiquid object. A dollar chip would have shown a $800 session loss and stopped lying.

[Play-to-earn games](/guides/play-to-earn-games) add a yield story on top of the same exit problem. Yield that you cannot sell is a spreadsheet.`,
    },
    {
      id: "thin-markets",
      title: "Thin markets, royalties and the slow exit",
      body: `Fungible tokens have order books or pools. NFTs have listings. A collection can trade $50k a day and still have no bid for your id.

Royalties, creator fees and marketplace fees stack when you actually sell. Some chains make royalties optional; then the "floor" assumes a fee the next buyer will not pay. Your net is lower.

Gas on mint-heavy days can exceed the entertainment value of a $20 raffle. That is a rail cost, not a house edge, but it hits the same wallet.

Custody is another thin-market problem. If the NFT sits in the casino contract, you have issuer risk plus smart-contract risk. If you only signed a listing, you might have signed a seaport-style order that a malicious site can fill. Read every permit. An NFT casino that wants setApprovalForAll on your whole wallet is asking to move every token you own.

Do not treat a Discord "floor bot" as a bank. Bots lie, or they lag.

Royalties used to be a predictable extra percent on every resale. On some marketplaces they are now optional. A casino that credits "floor minus 5% royalty" may be subtracting a fee the next buyer will not pay, or failing to subtract a fee the next buyer will. Either way your mark-to-market is a story about someone else's checkout screen.

Gas on a mint raffle is part of the ticket price. A $15 mint plus $8 of failed-transaction gas is a $23 ticket before the reveal. Budget the misses, not only the successful mint.`,
    },
    {
      id: "public-not-enough",
      title: "A public chain is not a fair pit by itself",
      body: `Web3 marketing says you can "see the vault." You can see a contract address. That is not the same as understanding the random function, the admin keys or the upgrade proxy.

A vault that holds NFTs and pays the winner in the same collection still needs a random source. If that source is block.timestamp or a value the operator can influence, the on-chain part is a trophy case for a biased pick. If the source is a commit-reveal with a published recipe, you can check it — and you still have to sell the JPEG.

Admin keys can pause withdraw, swap the oracle, or mint a "house card" into the raffle. Read whether the contract is upgradeable. An NFT casino that can change the rules after you lock a token is a custody relationship, not a sealed bet.

[Web3 casino](/guides/web3-casino) pages often blur "on-chain" with "you cannot be cheated." On-chain means the transfer happened. Cheating is about who writes the outcome and who can freeze the pot.

If you want the simpler object, use a dollar chip. On PVPspinArena the pot is USD, the draw is hashed, and the withdraw is USDC or ETH on Base. You give up the story that your ape is "working." You keep a number you can put in [gambling budget](/guides/gambling-budget) without an OpenSea tab.`,
    },
    {
      id: "dollar-chip",
      title: "Why a dollar chip is easier to budget",
      body: `[Gambling budget](/guides/gambling-budget) needs a unit that does not argue with you. USDC is designed to stay near $1. On PVPspinArena a $40 session is $40 in and, if you stop, $40 minus what the games took. ETH deposits are converted and shown in USD so the chip stops moving mid-round.

An NFT does the opposite. The stake is a token id. The prize may be another token id. The fiat value is a live argument between listers. You cannot honestly say "I lost $200 tonight" until you have sold, and selling is a second project.

That is the contrast. This site is not morally cleaner because it refuses JPEGs. It is arithmetically quieter. You can still lose the $200. You will not lose an extra 0.3 ETH because the floor died while the vault spun.

Check rounds on the [fairness](/fairness) page. There is no trait rarity in the draw.`,
    },
    {
      id: "safer",
      title: "If you still mix NFTs and gambling",
      body: `1. **Price the bid, not the floor**, for the exact token you will lock.
2. **Never approve a spender for the whole wallet** to "enter a raffle."
3. **Separate the collectible from the bankroll.** If you want the picture, keep it. If you want a session, sell to a liquid pair first.
4. **Cap gas plus stake** before a mint-style lottery.
5. **Read whether the prize is a table or a pot.** Most "NFT vaults" are house games with a collectible skin.
6. **Stay 18+.** A cartoon ape does not lower the line.

Taxes on NFT sales and gambling wins are jurisdiction-specific. This is not tax advice and not legal advice. A floor screenshot is not a cost basis.

If the JPEG is the thing you cannot stop flipping, that is a gambling problem with extra steps. Use [responsible gambling](/responsible-gambling).`,
    },
    {
      id: "summary",
      title: "The picture is not the pot",
      body: `NFT gambling stakes a unique token against a floor that is not a bid, in a book that may not exist, for a prize that may be another picture. Thin markets and approvals are the extra risk on top of ordinary house games.

PVPspinArena is not an NFT casino and not a play-to-earn mill. Deposit USDC or ETH on Base, stake a dollar amount, verify the round. Keep the JPEG in the wallet you do not gamble from.

If you cannot name a bid for the exact token in the next seven days, you do not have a stake. You have a listing. List it, or leave it on the wall. Do not let a vault do the listing for you at a 30 percent haircut. A dollar chip skips that argument. Budget the bid you can actually hit, then stop.`,
    },
  ],
  faqs: [
    {
      q: "What is NFT gambling?",
      a: "Using an NFT as the stake, the prize or the access pass for a bet. The token is unique; its fiat value depends on a thin market.",
    },
    {
      q: "Is floor price what I can sell for?",
      a: "No. Floor is the lowest listing. Your token may have no bid near that number, and wash trading can fake the print.",
    },
    {
      q: "Does PVPspinArena accept NFTs?",
      a: "No. It accepts USDC and ETH on Base. Balances are in USD. It will not credit a JPEG.",
    },
    {
      q: "Why is a dollar chip easier to budget than an NFT?",
      a: "USDC is designed to stay near $1, so a $20 loss is a $20 loss. An NFT's value can move while you play and again when you try to sell.",
    },
    {
      q: "Is an on-chain NFT flip 'provably fair'?",
      a: "The transfer may be public. The random pick still needs a committed seed you can check. A visible vault is not automatically a fair vault.",
    },
    {
      q: "Are play-to-earn rewards the same as winning a pot?",
      a: "No. Yield tokens still have to be sold into a market. A pot paid in USDC is already the unit you budget in.",
    },
  ],
  sources: [
    { label: "Ethereum.org — Non-fungible tokens (NFT)", url: "https://ethereum.org/en/nft/" },
    {
      label: "FTC — What to know about cryptocurrency and scams",
      url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams",
    },
    { label: "Circle — USDC", url: "https://www.circle.com/en/usdc" },
    { label: "OpenSea — Help Center (listings and offers)", url: "https://support.opensea.io/" },
  ],
  related: [
    "what-is-a-crypto-casino",
    "play-to-earn-games",
    "gamefi",
    "web3-casino",
    "are-online-casinos-rigged",
  ],
  updated: "2026-09-26",
};
