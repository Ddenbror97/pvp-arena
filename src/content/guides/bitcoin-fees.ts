import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bitcoin-fees",
  cluster: "Crypto payments",
  keyword: "bitcoin fees",
  secondary: [
    "bitcoin transaction fee",
    "sat/vb",
    "bitcoin mempool fees",
    "replace by fee",
    "cpfp bitcoin",
  ],
  title: "Bitcoin Fees: sat/vB, the Mempool, RBF and CPFP",
  description:
    "Bitcoin fees explained: how sat/vB and virtual bytes set the price, why the mempool makes fees spike, and how RBF and CPFP rescue a stuck transaction.",
  h1: "Bitcoin fees: sat/vB, the mempool, RBF and CPFP",
  answer:
    "Bitcoin fees are paid to miners and priced by size, not by amount: fee = fee rate in satoshis per virtual byte (sat/vB) × the transaction's size in vbytes. A simple one-input, two-output SegWit payment is about 141 vB, so at 10 sat/vB it costs 1,410 sats. Rates rise when the mempool is full. Replace-by-fee (RBF) and child-pays-for-parent (CPFP) speed up stuck payments.",
  facts: [
    "Fees depend on transaction size in virtual bytes and on demand for block space, not on how much bitcoin you send.",
    "A block holds at most 4 million weight units, about 1 million vbytes, and blocks arrive about every ten minutes on average.",
    "A 1-input, 2-output native SegWit (P2WPKH) transaction is about 141 vB; a legacy P2PKH one is about 226 bytes.",
    "Wallets with many small coins (UTXOs) pay more to spend them, because each input adds roughly 58–148 vbytes depending on type.",
    "RBF rebroadcasts the same payment with a higher fee; CPFP spends the stuck output with a high-fee child so miners take both.",
  ],
  sections: [
    {
      id: "how",
      title: "How bitcoin fees are calculated",
      body: `Every bitcoin transaction spends earlier outputs (inputs) and creates new ones (outputs). The difference between total inputs and total outputs is the fee, and it goes to whichever miner includes the transaction in a block.

Miners have limited space. Each block can hold up to 4,000,000 weight units, which is 1,000,000 virtual bytes. They fill it with the transactions that pay the most per unit of space. That is why fees are quoted as a **rate**: satoshis per virtual byte, written sat/vB. One bitcoin is 100,000,000 satoshis.

### Virtual bytes

SegWit, activated in 2017 under BIP 141, counts witness (signature) data at a quarter of the weight of other data. Virtual size is weight divided by four. The practical effect is that SegWit and Taproot transactions are cheaper than legacy ones for the same payment.

| Transaction type (1 input, 2 outputs) | Approximate size |
| --- | --- |
| Legacy (P2PKH, addresses starting with 1) | 226 bytes |
| Nested SegWit (P2SH-P2WPKH, starting with 3) | about 167 vB |
| Native SegWit (P2WPKH, starting with bc1q) | about 141 vB |
| Taproot key-path (P2TR, starting with bc1p) | about 154 vB |

### Worked example

You send a payment from a native SegWit wallet with one input and two outputs (the payment and your change): about 141 vB.

- At 5 sat/vB: 141 × 5 = 705 sats.
- At 30 sat/vB: 141 × 30 = 4,230 sats.
- At 100 sat/vB: 14,100 sats.

At an illustrative price of $100,000 per bitcoin, one sat is $0.001, so those fees are about $0.71, $4.23 and $14.10. Sending 0.001 BTC or 10 BTC costs the same if the transaction has the same shape.

This is different from account-based gas on Ethereum-style chains, which charges for computation; that model is in [gas fees explained](/guides/gas-fees-explained).`,
    },
    {
      id: "mempool",
      title: "The mempool and why fees spike",
      body: `A transaction you broadcast first sits in the **mempool**, the waiting room each node keeps of valid but unconfirmed transactions. There is no single global mempool; each node has its own, and they are usually similar.

When fewer transactions are waiting than a block can hold, even low-rate transactions confirm in the next block or two. When demand exceeds supply, a queue forms, ordered by fee rate. Anyone who wants the next block must outbid the queue.

### What causes spikes

- **Price moves and market stress**, when many people move coins to or from exchanges at once.
- **Bursts of new activity** such as the Ordinals inscriptions and BRC-20 tokens in 2023, which filled blocks for weeks.
- **Special events** such as the April 2024 halving, when new token launches competed for the first blocks after the subsidy fell to 3.125 BTC.

### Reading a fee estimator

Tools such as mempool.space show recommended rates for "next block", "within 30 minutes" and "within an hour", plus a visual of pending blocks. Before sending, look at how many vbytes are waiting above your intended rate. If there are 3 million vB queued above 20 sat/vB, a 20 sat/vB transaction needs about three blocks, roughly half an hour, provided nothing higher arrives.

### What happens to low-fee transactions

Nodes limit mempool memory, 300 MB by default in Bitcoin Core, and drop the lowest-rate transactions when full. Transactions can also expire after about two weeks by default. A dropped transaction was never confirmed, so the coins never left; your wallet can rebroadcast or respend them. Node software has long used a minimum relay rate of 1 sat/vB, and recent releases have lowered that default, so very cheap transactions can propagate on quiet days.`,
    },
    {
      id: "choose",
      title: "Choosing a fee rate",
      body: `Wallets usually offer presets. The right choice depends on how urgent the payment is.

| Urgency | Strategy |
| --- | --- |
| Needs the next block | Use the estimator's next-block rate, plus a small margin |
| Within a few hours | Use the one-hour rate, and enable RBF so you can bump |
| Whenever | Use a low rate on a quiet weekend and wait |

### Cutting the size, not only the rate

- **Use native SegWit or Taproot addresses.** Moving from legacy to native SegWit cuts a simple payment from about 226 bytes to about 141 vB, a 38% saving at any rate.
- **Consolidate small coins when fees are low.** Each extra native SegWit input adds about 68 vB. Spending 20 small coins in one transaction is about 1,400 vB: at 50 sat/vB that is 70,000 sats, at 2 sat/vB about 2,800 sats. Merging them into one coin on a quiet day saves that cost later.
- **Batch payments.** One transaction with ten outputs costs far less than ten separate transactions, because the fixed overhead and inputs are shared. Exchanges do this routinely.

### Dust

An output worth less than the fee needed to spend it is "dust". Receiving many tiny payments can leave a wallet full of coins that cost more to move than they are worth.`,
    },
    {
      id: "rbf-cpfp",
      title: "RBF and CPFP: fixing a stuck transaction",
      body: `If a transaction sits unconfirmed because the rate was too low, you have two tools. [Stuck crypto transaction](/guides/stuck-crypto-transaction) covers general troubleshooting across chains; this section is the bitcoin-specific mechanics.

### Replace-by-fee (RBF)

The sender broadcasts a new version of the transaction spending the same inputs with a higher fee. Nodes accept the replacement if it pays a higher rate and a higher absolute fee than the original, including a small extra to cover relaying it. BIP 125 defined opt-in signalling; recent Bitcoin Core versions accept replacements by default whether or not the original signalled.

Worked example: your 141 vB payment at 3 sat/vB paid 423 sats. The next-block rate is now 25 sat/vB. The replacement must pay about 141 × 25 = 3,525 sats. The payee receives the same amount; only your change output shrinks.

### Child-pays-for-parent (CPFP)

If you are the **receiver**, or your wallet cannot do RBF, spend an output of the stuck transaction in a new "child" transaction with a high fee. Miners evaluate the pair as a package, and including the child requires including the parent.

Worked example: the parent is 141 vB at 2 sat/vB, paying 282 sats. You want the pair confirmed at 20 sat/vB. The child is a 1-input, 1-output payment of about 110 vB. The package is 251 vB, so it needs 251 × 20 = 5,020 sats in total. The child must pay 5,020 − 282 = 4,738 sats, about 43 sat/vB on its own.

| Tool | Who can use it | Cost |
| --- | --- | --- |
| RBF | The sender | Only the extra fee on the same size |
| CPFP | The receiver, or the sender through change | Pays for both transactions' bytes |

Most receiving services credit only after one or more confirmations; see [blockchain confirmations](/guides/blockchain-confirmations).`,
    },
    {
      id: "long-run",
      title: "Why fees matter to bitcoin itself",
      body: `Miners are paid in two ways: the block subsidy, newly created bitcoin, and the fees in each block. The subsidy halves every 210,000 blocks, roughly every four years. It started at 50 BTC in 2009 and fell to 25, 12.5, 6.25 and, from April 2024, 3.125 BTC per block.

| Era | Block subsidy |
| --- | --- |
| 2009–2012 | 50 BTC |
| 2012–2016 | 25 BTC |
| 2016–2020 | 12.5 BTC |
| 2020–2024 | 6.25 BTC |
| 2024–about 2028 | 3.125 BTC |

As the subsidy shrinks, fees are meant to take over as the main payment for securing the network. That is why fee markets are not a bug. Block space is scarce by design, and the price of that space is how users compete for it.

### What this means for users

- **Fees are cyclical.** Long quiet periods of 1–5 sat/vB are normal, punctuated by spikes of 50–100+ sat/vB during busy weeks. Planning non-urgent transfers for quiet periods saves real money.
- **Small on-chain payments get relatively expensive.** A fee of a few dollars is trivial on a $10,000 transfer and heavy on a $20 one. This pressure is part of why off-chain systems such as Lightning exist.
- **Your own coin shape matters.** A wallet holding one large coin pays a small, predictable fee. A wallet holding hundreds of small coins can find some of them uneconomic to spend during spikes.

### A note on other bitcoin-derived chains

Forks such as Bitcoin Cash took a different path, raising the block size so that fees stay very low, with different trade-offs. That approach, and what it means for payments, is covered in [Bitcoin Cash casino](/guides/bitcoin-cash-casino).`,
    },
    {
      id: "exchange",
      title: "Exchange withdrawal fees versus network fees",
      body: `When you withdraw bitcoin from an exchange or app, you rarely see a sat/vB rate. You see a flat withdrawal fee, such as 0.0001 BTC. That fee is set by the platform, and it is often higher than the network cost of one output in the exchange's batched transaction.

Worked example: an exchange charges a flat 0.0002 BTC, or 20,000 sats. Your output in a batched transaction might use about 31 vB. At 10 sat/vB the network cost of your share is about 310 sats plus a slice of the overhead. The rest is the platform's margin or buffer for busy periods.

This is the most common reason a small bitcoin transfer feels expensive. Options:

- Compare withdrawal fees across platforms before choosing where to buy.
- Withdraw less often, in larger amounts.
- Use the Lightning Network for small payments, where fees are usually a few sats; see [Lightning network casino](/guides/lightning-network-gambling) for the gambling use case.

For a full breakdown of what a casino deposit costs, including exchange fees, spreads and network fees, see [crypto casino deposit fees](/guides/crypto-casino-deposit-fees).`,
    },
    {
      id: "pvp",
      title: "Bitcoin fees and PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games, [Jackpot](/), [Coinflip](/coinflip) and [Roulette](/roulette), with play in USDC or ETH on the Base network. Base is an Ethereum layer-2 where transfers typically cost a small fraction of a bitcoin on-chain fee; [Base network fees](/guides/base-network-fees) explains why. If your funds are in bitcoin, you would sell BTC for USDC on an exchange that supports Base and withdraw there, which means paying the bitcoin deposit fee once rather than on every session. Casinos that take bitcoin directly are covered in [bitcoin casino](/guides/bitcoin-casino).

Fees are a cost before a single round is played. On a $20 session, a $4 fee is 20% of your stake, far larger than Roulette's Purple or Silver edge of about 7.88% after the win fee. Budget fees and stakes together. Every settled round can be checked on [fairness](/fairness), and gambling is 18+ or your local legal age. The [responsible gambling](/responsible-gambling) page has limits and support if you need them, and the [crypto payments topic](/guides/topics/crypto-payments) collects related payment guides.`,
    },
  ],
  faqs: [
    {
      q: "How much is a bitcoin transaction fee?",
      a: "It depends on size and demand. A simple native SegWit payment is about 141 vB. At 5 sat/vB that is 705 sats; at 50 sat/vB it is 7,050 sats. Check a fee estimator before sending.",
    },
    {
      q: "Why are bitcoin fees so high right now?",
      a: "The mempool holds more transactions than the next blocks can fit, so senders bid higher rates. Busy markets, new token activity and big events push demand up.",
    },
    {
      q: "Does sending more bitcoin cost a higher fee?",
      a: "No. The fee depends on the transaction's size in vbytes, which depends on the number and type of inputs and outputs, not on the amount sent.",
    },
    {
      q: "What is sat/vB?",
      a: "Satoshis per virtual byte, the fee rate. Multiply it by the transaction's virtual size to get the fee. One bitcoin is 100 million satoshis.",
    },
    {
      q: "Can I cancel a stuck bitcoin transaction?",
      a: "If it has not confirmed, you can use RBF to replace it with a version that sends the coins back to yourself at a higher fee. Once confirmed, it cannot be reversed.",
    },
  ],
  sources: [
    { label: "Bitcoin Wiki: miner fees", url: "https://en.bitcoin.it/wiki/Miner_fees" },
    {
      label: "BIP 125: opt-in full replace-by-fee signaling",
      url: "https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki",
    },
    {
      label: "BIP 141: Segregated Witness",
      url: "https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki",
    },
    { label: "mempool.space: Bitcoin mempool explorer", url: "https://mempool.space/" },
  ],
  related: [
    "gas-fees-explained",
    "crypto-casino-deposit-fees",
    "stuck-crypto-transaction",
    "lightning-network-gambling",
    "bitcoin-cash-casino",
    "cash-app-bitcoin",
  ],
  updated: "2026-09-27",
};
