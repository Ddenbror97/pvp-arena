import type { Guide } from "./types";

export const guide: Guide = {
  slug: "revoke-token-approvals",
  cluster: "Crypto payments",
  keyword: "revoke token approvals",
  secondary: ["token approval risk", "revoke wallet permissions", "approval checker"],
  title: "Revoke Token Approvals: Close the Back Door",
  description:
    "Old token approvals can drain a wallet long after you forget them. How to audit what you have granted and revoke it, step by step.",
  h1: "Revoking Token Approvals: Closing Wallet Back Doors",
  answer:
    "Revoke token approvals when you have granted an ERC-20 spender allowance you no longer trust or need. An approval lets a contract pull tokens later without another signature for each grab—especially dangerous when the allowance is unlimited. Auditing and revoking is routine hygiene for any self-custody wallet used around gambling sites.",
  facts: [
    "An approval is a signed permission for a contract to move your tokens up to a limit.",
    "Unlimited allowances are convenient for DEXs and catastrophic next to phishing sites.",
    "Revoking costs gas; it is a real transaction on the network you approve on.",
    "Message signatures for login are not token approvals.",
    "PVPspinArena deposits use normal transfers plus message verification—not spending allowances.",
  ],
  howTo: true,
  sections: [
    {
      id: "what-grants",
      title: "What a token approval grants",
      body: `When you “approve” USDC for a contract, that contract may call transferFrom on your balance up to the allowance. You can set a exact amount or unlimited. Unlimited means future top-ups are also exposed.

This guide sits in [crypto payments](/guides/topics/crypto-payments). Adults 18+. Pair with [self-custody wallet](/guides/self-custody-wallet) and [crypto wallet for gambling](/guides/crypto-wallet-for-gambling).

Connecting a site and signing a hello message is not an approval. Read the wallet prompt type every time.`,
    },
    {
      id: "danger",
      title: "Why old approvals are dangerous",
      body: `Phishing sites ask for unlimited USDC “to deposit.” Weeks later the spender drains you. The wallet still unlocks fine. The allowance was the hole.

Gambling wallets that visit many promo links collect allowances like lint. Monthly review beats annual horror.`,
    },
    {
      id: "audit",
      title: "Auditing your approvals",
      body: `Use a reputable approval explorer you typed from official wallet docs or well-known security vendors—not a sponsored Discord link. Connect carefully, view spenders per chain (Ethereum, Base, etc.), and note unlimited rows first.

If you do not recognise a spender, treat it as revoke-first. If you recognise a DEX you still use, consider capping rather than unlimited.`,
    },
    {
      id: "revoke-steps",
      title: "Revoking step by step",
      body: `1. Open the revoke tool from a bookmark.
2. Connect the play wallet on the correct network.
3. Select the token and spender.
4. Revoke or set allowance to zero.
5. Confirm the transaction; pay gas.
6. Refresh until the tool shows cleared.
7. Repeat per chain you used.

On Base, gas is usually small but not free—keep ETH for the cleanup session.`,
    },
    {
      id: "unlimited",
      title: "Unlimited vs capped approvals",
      body: `Capped approvals for the exact swap size reduce leftover risk. Unlimited reduces popups. For gambling deposits that only need a transfer, the best approval is **none**.

If a casino requires unlimited USDC spend, leave. PVPspinArena does not.`,
    },
    {
      id: "habits",
      title: "Approval habits for gambling wallets",
      body: `Keep a play wallet separate from savings ([cold wallet vs hot wallet](/guides/cold-wallet-vs-hot-wallet) mindset). Never approve from the savings seed. Prefer transfer deposits. After experiments with new DEXs, revoke the same day.

[Seed phrase](/guides/seed-phrase) safety still matters: approvals drain tokens; phished phrases drain everything including ETH.`,
    },
    {
      id: "monthly",
      title: "Monthly review routine",
      body: `Calendar a 15-minute revoke session:

1. List chains you touched.
2. Clear unknown spenders.
3. Disconnect dead site connections in the wallet.
4. Confirm play wallet balance matches expectations.
5. Only then deposit to the real [wallet](/wallet) page if you still want a session.

More checklist thinking lives under [crypto payments](/guides/topics/crypto-payments). Games on [how it works](/how-it-works) still need a budget.

Unlimited allowances next to phishing sites are how delayed drains happen. Revoke on a schedule.`,
    },
  ],
  faqs: [
    {
      q: "Does revoking cost money?",
      a: "Yes. Revoke is an on-chain transaction that spends gas on that network, so keep a little ETH available before you start a cleanup session.",
    },
    {
      q: "Is a signature to log into a casino an approval?",
      a: "Usually no. Login is often a message signature. Approvals explicitly grant token spending. Read the prompt.",
    },
    {
      q: "Do I need approvals to use PVPspinArena?",
      a: "No. Verify with a message, then transfer USDC or ETH on Base normally.",
    },
    {
      q: "Should I revoke my main DEX allowance every time?",
      a: "If you swap often, a capped allowance or periodic revoke is a trade-off. Unlimited forever is the risky default.",
    },
    {
      q: "What if I approved a scammer already?",
      a: "Revoke immediately, move remaining funds to a new wallet if the phrase might also be exposed, and stop signing blind prompts.",
    },
  ],
  sources: [
    {
      label: "Ethereum.org — Token approvals explained",
      url: "https://ethereum.org/en/developers/docs/standards/tokens/erc-20/",
    },
    {
      label: "MetaMask — Token approvals and spending caps",
      url: "https://support.metamask.io/manage-crypto/tokens/how-to-customize-spender-limits/",
    },
  ],
  related: ["self-custody-wallet", "crypto-wallet-for-gambling", "seed-phrase", "is-metamask-safe"],
  updated: "2026-11-05",
};
