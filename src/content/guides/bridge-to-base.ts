import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bridge-to-base",
  cluster: "Crypto payments",
  keyword: "bridge to base",
  secondary: ["base bridge", "bridge eth to base", "how to bridge to base network"],
  title: "Bridging to Base: Steps, Fees, Timings | PvP Spin Arena",
  description:
    "A step-by-step Base bridging walkthrough with real fees and timings, the USDC and ETH differences, and fixes for stuck transfers.",
  h1: "Bridging to Base: Step-by-Step With Fees and Timings",
  answer:
    "To bridge to Base you move ETH or tokens from Ethereum (or another supported chain) onto Coinbase’s Base L2 through an official or reputable bridge UI, pay gas on the source chain, wait for the relay, then confirm the balance on Base. Official docs warn you about phishing; no legitimate bridge needs your seed phrase. Fees and timings move with congestion—treat ranges as guidance, not fixed quotes.",
  facts: [
    "Bridging locks or burns assets on the source chain and credits them on Base.",
    "You pay source-chain gas; destination gas is separate once you transact on Base.",
    "Official bridges never ask for a seed phrase—only signatures in your wallet.",
    "USDC and ETH bridging paths can differ; check the asset list on the bridge you use.",
    "PVPspinArena deposits need funds already on Base, sent as a normal transfer.",
  ],
  howTo: true,
  sections: [
    {
      id: "when",
      title: "When you need to bridge",
      body: `Bridge when your USDC or ETH sits on Ethereum mainnet (or another chain) but the app you use—including PVPspinArena—expects Base. If your exchange can withdraw USDC directly on Base, prefer that and skip the bridge.

This walkthrough sits in [crypto payments](/guides/topics/crypto-payments). Adults 18+ only. Background: [base network](/guides/base-network) and the conceptual [crypto bridge](/guides/crypto-bridge) guide. For gas mechanics see [gas fees explained](/guides/gas-fees-explained).

Official caution: bookmark bridge URLs from Base or Coinbase documentation you typed yourself. Fake “bridge” sites steal approvals and phrases.`,
    },
    {
      id: "routes",
      title: "Official bridge vs third-party routes",
      body: `**Official / canonical bridges** listed in Base docs are the default for sizeable amounts. They prioritise safety over fancy routing.

**Third-party bridges and aggregators** may be cheaper or faster on some pairs. They add smart-contract and UI risk. Start with a tiny test.

Never paste a seed phrase into a bridge page. Signing a transaction in MetaMask or a hardware wallet is normal. Typing twelve or twenty-four words into a website is not.`,
    },
    {
      id: "steps",
      title: "Step-by-step walkthrough",
      body: `1. Add Base to your wallet ([add Base network to MetaMask](/guides/add-base-network-metamask)).
2. Open the official bridge UI from a bookmarked docs link.
3. Connect the wallet that holds the source funds.
4. Select source chain, destination Base, asset and amount.
5. Review fee estimate and arrival guidance in the UI.
6. Confirm the transaction in your wallet. Verify network and spender.
7. Wait for status to show complete on the bridge UI.
8. Switch MetaMask to Base and confirm the balance.
9. Only then send a deposit to a casino address.

If the UI asks to “import wallet” or “validate seed,” close the tab.`,
    },
    {
      id: "fees-timing",
      title: "Fees and realistic timings",
      body: `Fees move. On calm days, bridging modest ETH or USDC may cost on the order of a few dollars of mainnet gas plus small L2 costs; during spikes it can be much higher. Base-side transactions after arrival are typically cents-scale, but that also moves.

Timings likewise vary: minutes when relays are healthy, longer when queues build. The bridge UI’s estimate is better than a blog post. If a transfer sits far past the estimate, use the UI’s transaction status and a block explorer—not a random “support agent.”

Do not invent a fixed “always $X / always 2 minutes” rule in your notes. Write “check live.”`,
    },
    {
      id: "usdc-eth",
      title: "Bridging USDC vs ETH",
      body: `ETH bridging is usually straightforward because ETH is the native gas asset on both sides (bridged ETH on Base). USDC involves token contracts: you must pick the USDC version the destination app expects.

For PVPspinArena, deposit the USDC flavour the [wallet](/wallet) page specifies on Base. Bridging the wrong USDC representation can leave you holding a token the cashier does not credit.

[How to buy USDC](/guides/how-to-buy-usdc) covers acquiring stablecoins before you bridge.`,
    },
    {
      id: "failures",
      title: "Common failures and fixes",
      body: `**Stuck pending on source:** gas too low; speed up or replace per wallet tools carefully.

**Completed on source, not on Base yet:** wait; check bridge status; do not re-bridge the same funds blindly.

**Wrong network send:** if you sent to a Base address on mainnet without a bridge, recovery may be impossible. Prevention beats heroics.

**Phishing approval:** revoke bad allowances using a tool you opened yourself, then move remaining funds.`,
    },
    {
      id: "arrived",
      title: "Checking funds arrived",
      body: `On Base, confirm token, amount and tx hash in a block explorer. Then send a small test transfer to PVPspinArena if you intend to play. Verification is a signed message; the deposit is a normal transfer—not an unlimited token approval.

Home [page](/) games still have fees or edges. Bridging successfully does not change variance. More rails: [crypto payments](/guides/topics/crypto-payments).

Official bridge URLs never need a seed phrase. Bookmark docs, test small, then move size.`,
    },
  ],
  faqs: [
    {
      q: "Do I always need to bridge to use Base apps?",
      a: "No. If your exchange withdraws directly to Base, that is usually simpler than bridging from mainnet.",
    },
    {
      q: "Will a bridge ask for my seed phrase?",
      a: "A legitimate bridge will not. Only approve transactions in your wallet. Seed requests are theft.",
    },
    {
      q: "How long does bridging to Base take?",
      a: "Often minutes, sometimes longer when congested. Use the bridge UI estimate and explorer status rather than a fixed promise.",
    },
    {
      q: "Can I bridge straight into a casino contract?",
      a: "Bridge into your own wallet on Base first. Then send a normal deposit transfer to the address the casino shows.",
    },
    {
      q: "Does PVPspinArena run a bridge?",
      a: "No. It credits matched Base deposits after wallet verification. Bridging happens in external tools you choose.",
    },
  ],
  sources: [
    { label: "Base — Official bridge docs", url: "https://docs.base.org/chain/bridges-mainnet" },
    { label: "Base — Network overview", url: "https://docs.base.org/" },
  ],
  related: ["base-network", "crypto-bridge", "gas-fees-explained", "how-to-buy-usdc"],
  updated: "2026-11-05",
};
