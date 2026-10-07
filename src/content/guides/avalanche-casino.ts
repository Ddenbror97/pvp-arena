import type { Guide } from "./types";

export const guide: Guide = {
  slug: "avalanche-casino",
  cluster: "Crypto payments",
  keyword: "avalanche casino",
  secondary: ["avax casino", "avalanche gambling", "usdc on avalanche", "c-chain casino"],
  title: "Avalanche Casino Guide: AVAX Fees and Deposits",
  description:
    "How an Avalanche casino works: AVAX and USDC deposits, C-Chain fees, confirmation time, and the risk of sending on the wrong network.",
  h1: "Avalanche casino: AVAX, C-Chain fees and deposit traps",
  answer:
    "An Avalanche casino credits deposits on Avalanche, usually the C-Chain: AVAX for gas and often USDC minted on Avalanche. Transfers confirm in seconds when the network is healthy, and fees are paid in AVAX, not in USDC. The trap is the network name. Avalanche USDC is not Base USDC. AVAX sent to a Base address, or C-Chain USDC sent to an X-Chain or Ethereum deposit, will not credit. PVPspinArena is not an Avalanche casino.",
  facts: [
    "Avalanche has three primary chains; casino deposits almost always mean the C-Chain, which is EVM-compatible and uses 0x addresses.",
    "C-Chain gas is paid in AVAX. A USDC-only wallet on Avalanche cannot send until it also holds AVAX.",
    "Circle issues native USDC on Avalanche; the ticker matches other chains, the ledger does not.",
    "C-Chain blocks are typically about two seconds; a simple transfer often feels final in a few seconds.",
    "PVPspinArena accepts on-chain Bitcoin, and USDC and ETH on Base. It does not watch Avalanche, the X-Chain or the P-Chain.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What an Avalanche casino is watching",
      body: `An Avalanche casino is a gambling site that credits a deposit when it sees a transfer on Avalanche. The chip is usually AVAX, or USDC on Avalanche. The address is usually a 0x string because the product sits on the **C-Chain**, Avalanche's Ethereum-compatible contract chain.

That is the whole definition. Fast finality is a property of the chain, not a promise that the games are fair. Avalanche gambling is still gambling. You must be 18 or older.

Avalanche is not one ledger. The X-Chain (exchange), P-Chain (platform / validators) and C-Chain (contracts) are different. A C-Chain casino does not see an X-Chain send. People lose funds on that distinction more often than they lose them to a "slow confirmation."

This guide lives with other rails in [crypto payments](/guides/topics/crypto-payments). It is the Avalanche twin of the [Solana casino](/guides/solana-casino) explainer: teach the chain, then show why this site is not on it.

PVPspinArena is Jackpot, Coinflip and Roulette. Deposits are USDC and ETH on Base. It is not an AVAX casino, not a C-Chain casino, and it will not credit a Snowtrace transaction.`,
    },
    {
      id: "c-chain-fees",
      title: "C-Chain fees, AVAX gas and confirmation time",
      body: `C-Chain fees follow an Ethereum-style gas model. You pick a gas limit, you pay a base fee that moves with demand, and you can add a tip. Official docs describe a dynamic base fee and, after recent upgrades, a very small minimum. Under normal load a simple AVAX or USDC transfer costs cents or less. Congestion can raise that. Cheap is the common case, not a law.

You pay in **AVAX**. USDC on Avalanche does not pay its own gas. A wallet that shows 50 USDC and 0 AVAX will fail the send. The same trap exists on Base with ETH, which [gas fees explained](/guides/gas-fees-explained) covers for this site's rail.

### Confirmation time

C-Chain blocks are short. A transfer is usually included in about two seconds. Circle's own attestation tables treat Avalanche as a one-block, roughly eight-second path for some cross-chain products. A casino that waits for one or a few C-Chain confirmations can credit you before you refill the coffee.

That speed is why "avax casino" pages advertise instant play. It is also why a wrong-network send hurts immediately: there is no long pending window to notice the chain name.

### Compared with Base

Base is also cheap and fast for ordinary sends. The difference that matters is **which RPC the cashier watches**. A cheap AVAX transfer to a Base deposit address is still a lost transfer. Read [USDC casino](/guides/usdc-casino) for why PVPspinArena watches Base only.`,
    },
    {
      id: "usdc-on-avax",
      title: "USDC on Avalanche is not USDC on Base",
      body: `Circle issues native USDC on many networks, including Avalanche and Base. The token is designed to be one dollar on each ledger. The ledgers do not share balances.

### Mistakes that do not reverse

- Sending **USDC on Avalanche** to a **USDC on Base** address (or the reverse).
- Sending **AVAX** to an Ethereum or Base deposit string because both look like 0x.
- Using an **X-Chain or P-Chain** address in a C-Chain deposit field.
- Treating a [crypto bridge](/guides/crypto-bridge) output as the casino address.

MetaMask can add Avalanche C-Chain as a custom network. That is convenient and dangerous. The same 0x account can hold ETH on Base, AVAX on C-Chain and nothing on the other. The address string does not tell you which asset arrived.

### Worked example

You want $25 of play.

| What you send | Where the casino watches | Result |
| --- | --- | --- |
| 25 USDC on Avalanche C-Chain | Avalanche C-Chain | Credits if the token contract is the one they listed |
| 25 USDC on Base | Avalanche C-Chain | No credit; funds sit on Base |
| 0.5 AVAX to their 0x | Avalanche C-Chain | Credits if they accept AVAX |
| 0.5 AVAX to a Base 0x | Base | No AVAX credit; recovery is a support problem |
| USDC on Avalanche to PVPspinArena | Base | No credit. This site does not watch Avalanche |

Always paste the token contract the cashier published. Fake "USDC" contracts exist on every EVM chain.`,
    },
    {
      id: "wallets",
      title: "Wallets, Core and the 0x look-alike problem",
      body: `Core (Ava Labs) understands X, P and C. MetaMask, by default, understands EVM chains you add. Phantom is a Solana-first app with extra accounts. None of these will save you from picking the wrong network in the dropdown.

### Practical rules

1. **Name the chain before you name the amount.** "25 USDC" is incomplete. "25 USDC on Avalanche C-Chain" is a deposit instruction.
2. **Keep a gas reserve in the fee token of that chain.** AVAX on C-Chain, ETH on Base. Do not drain it to zero.
3. **Send a test** the first time you use a cashier address.
4. **Do not bridge a $20 stack** to "save" an exchange withdrawal unless you have priced the whole path.
5. **Do not type a casino address into a bridge destination.** Bridge to your wallet, then deposit.

If you hold AVAX and want to use PVPspinArena, sell or swap on an exchange that can withdraw **USDC on Base**, or withdraw AVAX, swap on a Base-capable venue, and only then deposit. The casino will not do that conversion for you.

Exchange withdrawal screens often default to a chain you used last week. Check the selector every time.

Ava Labs' Core wallet will show X-Chain, P-Chain and C-Chain balances in one app. That is helpful for staking and moving AVAX between those three. It is not helpful if you treat the combined "AVAX" number as a single pot you can send to a casino. The C-Chain portion is the only one a 0x cashier can see. Export or transfer to C-Chain first, then send. An X-Chain export that you never import to C-Chain is not a deposit. It is an unfinished Avalanche-native move.`,
    },
    {
      id: "to-base",
      title: "Moving AVAX or Avalanche USDC onto Base",
      body: `If you hold value on Avalanche and want to play on PVPspinArena, the casino will not meet you halfway. You need USDC or ETH on Base in a wallet you can verify.

### Path that usually hurts less

1. Send AVAX or Avalanche USDC to an exchange that lists both Avalanche and Base.
2. If you sent AVAX, sell it for USDC on the exchange book.
3. Withdraw **USDC on Base** to your 0x wallet. Read the network selector twice.
4. Keep a few dollars of ETH on Base for gas.
5. Deposit here. The [wallet](/wallet) page is the cashier, not a C-Chain explorer.

### Path that usually hurts more

A DEX swap on Avalanche to "USDC," then a random bridge widget to Base, then a send to the casino in one emotional click. Each hop has a token contract, a chain id and a destination. People skip the test send on hop two and lose hop three.

A [crypto bridge](/guides/crypto-bridge) is a separate product. Bridge to your wallet. Wait for the Base USDC to appear in the wallet UI on the Base network. Then deposit. If the bridge UI offers "send to any address," do not paste the casino address. You want a refund hop if the bridge sits in limbo.

### Worked gas sketch

You have 20 AVAX. C-Chain send to the exchange: cents. Exchange trade: their taker fee, often 0.1–0.6%. Base USDC withdrawal: their withdrawal fee, often around a dollar. Base deposit gas: cents. You arrive with something like $19 of play per $20 of C-Chain USDC, depending on prints. That is a rail cost. It is still smaller than sending 20 AVAX to a Base deposit string and opening a recovery ticket.

If the exchange does not support Avalanche deposits, you need a different venue or a bridge. Do not invent a third option where the casino "just credits AVAX this once."`,
    },
    {
      id: "not-this-site",
      title: "PVPspinArena is not an Avalanche casino",
      body: `This site verifies an EVM wallet, then watches Base. The deposit is a normal USDC or ETH transfer. Games are on [how it works](/how-it-works). Withdrawals go back on Base, with a $250 daily limit and review on requests over $25.

An Avalanche transaction hash in a support ticket will not become a balance here. Support will not ask you to "retry on C-Chain" to unlock a Base credit. Anyone who DMs that instruction is not us.

The games do not change if you arrived from an AVAX article. Jackpot and Coinflip are player versus player. Roulette is a 33-slot house wheel. None of them is a subnet novelty or an NFT table.

If you already sent Avalanche USDC to a Base address you control, the USDC is still on Avalanche in that same 0x. You need a bridge or an exchange, not a casino retry. If you sent it to an address you do not control, treat it as gone unless that operator publishes a recovery path — many will not.`,
    },
    {
      id: "checklist",
      title: "Deposit checklist for Avalanche and for Base",
      body: `Use this whether the cashier is an avax casino or this site.

1. Confirm the **network name** in the wallet header matches the cashier.
2. Confirm the **token** — AVAX versus USDC — and the published contract.
3. Confirm you have **gas** in the fee asset on that same network.
4. Confirm the **address** with a test send.
5. Confirm the site is a site you meant to use: licence, terms, 18+.

Wrong-network sends are the main loss around Avalanche gambling, not "the chain was slow." Speed makes the mistake final faster.

This is not legal advice. Whether you may use a given casino depends on where you live. A C-Chain deposit does not create a licence.`,
    },
    {
      id: "summary",
      title: "Fast chain, same rules, wrong network still loses",
      body: `An Avalanche casino watches Avalanche, usually C-Chain. Fees are in AVAX. USDC on Avalanche is a different token from USDC on Base. Confirmations are fast, which is pleasant when you are right and brutal when you are wrong.

PVPspinArena is not an Avalanche casino. Fund USDC or ETH on Base, then deposit. If you hold AVAX, convert off-site. The track, the subnet and the C-Chain explorer are someone else's product.`,
    },
  ],
  faqs: [
    {
      q: "What chain does an Avalanche casino use?",
      a: "Almost always the C-Chain, the EVM chain with 0x addresses. X-Chain and P-Chain deposits to a C-Chain cashier will not credit.",
    },
    {
      q: "Can I pay C-Chain gas with USDC?",
      a: "No. Keep AVAX on the C-Chain to move USDC. A USDC-only balance cannot pay the fee.",
    },
    {
      q: "Is USDC on Avalanche the same as USDC on Base?",
      a: "Same issuer design, different ledgers. A send on one network does not appear on the other.",
    },
    {
      q: "Does PVPspinArena accept AVAX?",
      a: "No. It accepts on-chain Bitcoin, and USDC and ETH on Base. An Avalanche hash will not credit.",
    },
    {
      q: "How fast is an Avalanche C-Chain deposit?",
      a: "Often a few seconds after inclusion when the site waits for one or a few confirmations. The site's credit policy still wins over the block time.",
    },
    {
      q: "I sent Avalanche USDC to a Base address. Can I undo it?",
      a: "If you sent to your own 0x, the tokens are still on Avalanche at that address. You need a bridge or exchange. If you sent to someone else, recovery is up to them.",
    },
  ],
  sources: [
    {
      label: "Avalanche — C-Chain transaction fees",
      url: "https://build.avax.network/docs/rpcs/other/guides/txn-fees",
    },
    { label: "Avalanche official site", url: "https://www.avax.network/" },
    {
      label: "Circle — USDC on multiple blockchains",
      url: "https://www.circle.com/en/multichain-usdc",
    },
    {
      label: "Circle developers — CCTP confirmations",
      url: "https://developers.circle.com/cctp/v1/required-block-confirmations",
    },
  ],
  related: [
    "usdc-casino",
    "arbitrum-casino",
    "base-network",
    "base-vs-ethereum",
    "ethereum-gambling",
  ],
  updated: "2026-09-26",
};
