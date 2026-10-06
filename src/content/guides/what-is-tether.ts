import type { Guide } from "./types";

export const guide: Guide = {
  slug: "what-is-tether",
  cluster: "Crypto payments",
  keyword: "what is tether",
  secondary: [
    "tether explained",
    "what is usdt",
    "tether reserves",
    "tether attestation",
    "usdt chains",
  ],
  title: "What Is Tether? USDT Issuer, Reserves and Chains",
  description:
    "What is Tether: who issues USDT, what backs it, how the quarterly attestations work, which chains carry it, and the freeze and depeg risks holders take on.",
  h1: "What is Tether? USDT, its issuer, reserves and chains",
  answer:
    "What is Tether? Tether (USDT) is the largest dollar stablecoin: a token meant to be worth one US dollar, issued by the Tether group of companies and backed by a reserve that is mostly short-dated US Treasury bills. USDT runs on many blockchains, including Tron and Ethereum. Tether publishes quarterly attestations, not full audits, and it can freeze tokens at specific addresses.",
  facts: [
    "USDT launched in 2014 and is issued by Tether, a company historically linked to the Bitfinex exchange through shared owners and management.",
    "Each USDT is designed to be redeemable for $1, but direct redemption with Tether is for verified customers and large amounts; most holders exit through exchanges.",
    "Tether publishes quarterly reserve attestations prepared by an accounting firm; an attestation is a point-in-time check, narrower than a full audit.",
    "In 2021 the CFTC fined Tether $41 million for misstating that USDT was fully backed by US dollars at all times.",
    "The same ticker, USDT, exists on many chains; a Tron USDT balance and an Ethereum USDT balance are different tokens on different ledgers.",
  ],
  sections: [
    {
      id: "what",
      title: "What Tether is and how a stablecoin peg works",
      body: `Tether is a company, and USDT is the token it issues. The idea is simple: for every token in circulation, Tether says it holds at least one dollar of assets. When an approved customer sends dollars to Tether, new USDT is minted. When a customer redeems, USDT is burned and dollars are paid out. That mint-and-burn loop is what holds the price near $1.

Most people never touch that loop. They buy and sell USDT on exchanges from other traders. If USDT drifts to $0.995 on an exchange, a customer with redemption access can buy cheap tokens and redeem them at $1; if it drifts to $1.005, they can mint at $1 and sell. That arbitrage pulls the market price back toward the peg, but only as long as people trust that redemption works.

USDT is a **fiat-backed** stablecoin. It is not an algorithmic token that relies on a sister coin, and it is not a crypto-collateralised token like DAI. The general category is explained in [what is a stablecoin](/guides/what-is-a-stablecoin), and the main US-regulated rival is covered in [what is USDC](/guides/what-is-usdc).

### A short history

- **2014:** the project launches as "Realcoin", is renamed Tether, and first issues tokens on the Omni Layer on top of Bitcoin.
- **2017 onwards:** USDT spreads to Ethereum as an ERC-20 token, then to Tron, which becomes its busiest chain.
- **2019–2021:** the New York Attorney General investigates Tether and Bitfinex; the 2021 settlement requires an $18.5 million payment and regular reserve reports.
- **2021:** the CFTC order finds that Tether had not held fully dollar-backed reserves at all times between 2016 and 2018.
- **2022 onwards:** quarterly attestations and a shift of reserves toward US Treasury bills.

Circulation has grown past $100 billion, which makes USDT one of the most traded assets in crypto. Check a live tracker for today's figure rather than trusting any number printed in an article, including this one.`,
    },
    {
      id: "reserves",
      title: "What backs USDT: reserves and attestations",
      body: `Tether's transparency page publishes a reserve breakdown every quarter. The categories have been broadly stable in recent reports, although the exact mix moves:

| Reserve bucket | What it is | Risk profile |
| --- | --- | --- |
| US Treasury bills | Short-dated US government debt | Very low credit risk, some rate risk |
| Overnight and term reverse repos | Cash lent against Treasury collateral | Low, depends on counterparty |
| Money market funds and cash | Bank deposits and fund shares | Low to moderate |
| Bitcoin and gold | Held as part of excess reserves | Volatile |
| Secured loans and other investments | Loans and other assets | Higher, less transparent |

The large Treasury share is why USDT is profitable for its issuer: Tether earns interest on the reserves while holders earn nothing on the token. That is the stablecoin business model in one sentence.

### Attestation versus audit

An **attestation** is an accountant checking, at one moment, that the stated assets exist and exceed the stated liabilities. An **audit** looks at controls, transactions and the full financial statements over a period. Tether's reports have been attestations. The difference matters because an attestation says little about what happened between snapshots. If you want to see how exchanges and casinos try to prove balances in a similar way, read [proof of reserves](/guides/proof-of-reserves); the same "snapshot, not a movie" caveat applies there.

### Excess reserves

Tether reports holding assets above the value of tokens in circulation. That buffer is its equity. It protects holders against small losses in the riskier buckets, such as a drop in the bitcoin or gold held. It does not replace the protections a regulated bank deposit would carry.`,
    },
    {
      id: "chains",
      title: "Which blockchains carry USDT",
      body: `USDT is not one token. It is a family of tokens that Tether issues separately on each supported chain. The balance you see in a wallet belongs to one chain only.

| Chain | Token standard | Typical use |
| --- | --- | --- |
| Tron | TRC-20 | Cheap exchange transfers, very high volume |
| Ethereum | ERC-20 | DeFi, larger transfers, higher fees |
| Solana | SPL | Fast, low-fee transfers |
| TON | Jetton | Telegram wallet ecosystem |
| Avalanche, Polygon, others | Various | Regional and app-specific use |

Tether has also wound down support on some older chains, including the original Omni Layer, so tokens on those chains are no longer being minted. Always check Tether's own list of supported protocols before assuming a chain is live.

The token-standard differences between the two biggest networks are explained in [ERC-20 vs TRC-20](/guides/erc20-vs-trc20). The practical rule is simpler: the sending and receiving side must agree on the chain. Sending Tron USDT to an address that only watches Ethereum is the classic way to lose funds, and [sent crypto to the wrong network](/guides/sent-crypto-to-wrong-network) covers what can and cannot be recovered.

### Bridged versus native USDT

On some layer-2 networks you will find USDT that was bridged in by a third party rather than issued by Tether directly. Bridged tokens depend on the bridge contract as well as on Tether. They can trade at a slight discount and may not be accepted by every service. If a wallet shows two tokens both named USDT on the same chain, check the contract address against the issuer's published list.`,
    },
    {
      id: "risks",
      title: "Risks: freezes, depegs and regulation",
      body: `### Freezing

The USDT contracts include an admin function that lets Tether freeze tokens at a specific address. Tether uses it in response to law-enforcement requests and known thefts. That is useful when hacked funds are recovered, and it is also a reminder that USDT is a centrally controlled asset. Holding it in a [self-custody wallet](/guides/self-custody-wallet) protects you from an exchange going bust; it does not put the token beyond the issuer's reach.

### Depegs

USDT has traded below $1 during periods of stress, including a brief drop to around $0.95 in May 2022 during the TerraUSD collapse, before recovering. Short dips like this matter most to anyone who must sell at that moment. Worked example: a holder with 5,000 USDT who sells at $0.97 receives $4,850, a $150 loss that would disappear if they could wait for the peg to recover.

### Regulation

Rules differ by region. In the European Union, the MiCA regulation requires stablecoin issuers to be authorised, and several exchanges restricted USDT trading for EU users as those rules took effect. In other markets USDT remains the default trading pair. None of this changes the token's code, but it changes where you can buy, sell and cash out.

### Counterparty summary

- **Issuer risk:** reserves, management decisions, and the chance of a run.
- **Custody risk:** the exchange or wallet you hold it in.
- **Chain risk:** outages, congestion, or bridge failures on the network you use.
- **Legal risk:** freezes and local restrictions.`,
    },
    {
      id: "check",
      title: "How to check USDT yourself",
      body: `You do not have to take anyone's word for most of the on-chain facts. Four checks take a few minutes each.

1. **Contract address.** Every chain has one official USDT contract. Tether lists them on its site, and block explorers such as Etherscan and Tronscan label them. A token called "USDT" at any other address is a copy, often a scam airdrop.
2. **Circulating supply.** The explorer page for the official contract shows total supply on that chain. Adding the chains together gets you close to the headline figure on Tether's transparency page. Large gaps usually mean tokens that are authorised but not yet issued, which Tether reports separately.
3. **Mint and burn history.** Explorers show large mint and burn transactions from the treasury addresses. A run of big burns means net redemptions; big mints usually follow customer demand from exchanges.
4. **Latest attestation.** Read the reserve report itself, not a summary. Look at the date, the total assets, the total liabilities, and the share held in Treasury bills versus secured loans and other investments.

### Worked example: reading the buffer

Suppose a report showed $120 billion of assets against $115 billion of token liabilities. The buffer is $5 billion, about 4.3% of liabilities. If the riskier buckets (bitcoin, gold, secured loans and other investments) came to $12 billion, a 40% fall in those buckets would cost $4.8 billion, almost the entire buffer. These are illustrative numbers, not a real report; the point is that the size of the buffer only means something next to the size of the risky assets.`,
    },
    {
      id: "vs",
      title: "USDT compared with other dollar tokens",
      body: `USDT's advantage is reach: it is listed almost everywhere, has deep liquidity, and dominates cheap transfers on Tron. Its disadvantages are a history of reserve disputes, attestation-only reporting, and uneven regulatory acceptance.

USDC, issued by Circle, is the usual comparison. It publishes monthly attestations, keeps reserves mostly in cash and Treasuries, and is native on many layer-2 networks, including Base. Other dollar tokens, such as PayPal's PYUSD, have narrower distribution. For gambling-specific trade-offs between the two big coins, the [USDC vs USDT](/guides/usdc-vs-usdt-gambling) guide keeps that comparison in one place.

A quick way to decide which dollar token to hold:

1. **Where will you spend it?** Match the token and chain the destination accepts.
2. **How long will you hold it?** For days or weeks, issuer risk barely moves the needle; for large balances held for years, reserve quality matters more.
3. **How will you cash out?** Pick the token your local exchange lists against your currency.

For more stablecoin and payment topics, the [crypto payments topic hub](/guides/topics/crypto-payments) collects the wallet, network and fee guides in one place.`,
    },
    {
      id: "pvp",
      title: "Tether and PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette), and play is in USDC or ETH on the Base network. If you hold USDT, the usual route is to swap it for USDC on an exchange or through a decentralised exchange, then send the USDC on Base. The [how to swap tokens](/guides/how-to-swap-tokens) guide walks through slippage and quotes. Casino-specific handling of USDT elsewhere is covered in [USDT casino](/guides/usdt-casino).

The stablecoin question and the game question are separate. A stable dollar unit makes stakes easier to reason about: a Roulette colour bet on Purple or Silver returns 32/33 of what you stake on average, about 96.97% before the win fee, whatever the market is doing. It does not change the odds. Every settled round can be checked on [fairness](/fairness), because results come from seeds committed before bets close.

Gambling is for adults 18+ or the legal age where you live. Budget in dollars before you convert anything, and if a session starts feeling like a way to win back losses, use the [responsible gambling](/responsible-gambling) tools.`,
    },
  ],
  faqs: [
    {
      q: "What is Tether in simple terms?",
      a: "Tether (USDT) is a crypto token designed to stay worth one US dollar. The issuer holds reserves, mainly US Treasury bills, and mints or burns tokens as approved customers deposit or redeem dollars.",
    },
    {
      q: "Is Tether backed 1:1?",
      a: "Tether reports reserves above the value of tokens in circulation in its quarterly attestations. Those are point-in-time checks, not full audits, and a 2021 CFTC order found backing gaps between 2016 and 2018.",
    },
    {
      q: "Who owns Tether?",
      a: "Tether is privately held. It has long shared owners and executives with the Bitfinex exchange. Paolo Ardoino became chief executive in late 2023.",
    },
    {
      q: "Can Tether freeze my USDT?",
      a: "Yes. The USDT contracts let the issuer freeze tokens at specific addresses, which it does for thefts and law-enforcement requests. Self-custody removes exchange risk, not issuer control.",
    },
    {
      q: "Which network should I use for USDT?",
      a: "Use the network the receiving service supports. Tron is cheap and common on exchanges, Ethereum is widely supported but costlier, and Solana is fast. Sender and receiver must match.",
    },
  ],
  sources: [
    { label: "Tether: transparency and reserves", url: "https://tether.to/en/transparency/" },
    {
      label: "Wikipedia: Tether (cryptocurrency)",
      url: "https://en.wikipedia.org/wiki/Tether_(cryptocurrency)",
    },
    {
      label: "CFTC: Tether and Bitfinex order (2021)",
      url: "https://www.cftc.gov/PressRoom/PressReleases/8450-21",
    },
  ],
  related: [
    "usdt-casino",
    "usdc-vs-usdt-gambling",
    "what-is-a-stablecoin",
    "what-is-usdc",
    "how-to-buy-usdt",
    "erc20-vs-trc20",
  ],
  updated: "2026-09-27",
};
