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

More checklist thinking lives under [crypto payments](/guides/topics/crypto-payments). Games on [how it works](/how-it-works) still need a budget.`,
    },
    {
      id: "extra-depth",
      title: "Making revoke a habit instead of a panic",
      body: `When you step back from the marketing language around revoke-token-approvals, the job is operational: protect keys or items, measure fees in full, and refuse urgency that exists only to short-circuit review.

Start every session by naming the outcome you actually want. If the outcome is entertainment, price it. If the outcome is moving value, write the destination asset and network before you click. Mixing those goals mid-flow is how people accept terrible quotes.

Use bookmarks for every site that can move money or inventory. Search ads and Discord pins are hostile channels until proven otherwise. Type the domain, then pin it. If a message asks you to switch domains for verification, stop.

Keep a simple ledger even when you think you will remember. Date, amount in, amount out, fees noticed, transaction hashes or trade IDs. Ten lines of notes beat a month of reconstructed guesswork when something fails.

Separate the tools. Steam is not a bank. An exchange is not a casino. A casino is not a cashout desk. A hot wallet is not a vault. When one product tries to be all four, read the fee page twice and assume the missing disclosures are where you get hurt.

Adults eighteen and older only. If anyone in the household is younger, payment methods and chat permissions matter more than clever optimisations. Parent controls and spending locks are part of the same checklist as gas fees.

Test with a small amount whenever a path is new: new marketplace, new network dropdown, new bridge UI, new revoke tool. Large first sends are how irreversible mistakes become expensive stories.

Read wallet prompts by type. A message signature is not a token approval. A token approval is not a transfer. A transfer on the wrong network is not a transfer on the right one. Saying those sentences out loud before you confirm catches a surprising number of errors.

Assume fees move. Any number you memorised last month is a rumour until the live UI agrees. Prefer ranges and live quotes over screenshots from strangers.

If a support agent needs your seed phrase, Steam Guard code, or remote desktop access, you are not talking to support. Close the chat, secure the account, and continue only on the bookmarked domain.

Build a cool-down rule you can follow when emotional. After a sharp loss or a sharp win, wait before the next irreversible action. Wins create overconfidence; losses create revenge. Both states are bad for custody decisions.

For PVPspinArena specifically, remember the deposit model: verify the wallet with a signed message, then send USDC or ETH on Base with a normal transfer. There is no need for an unlimited spending approval. If a lookalike page demands one, leave.

Jackpot and Coinflip are player-versus-player with a fee structure you can read. Roulette is house-banked. None of those products depend on skin inventories. Keeping the mental model clean prevents you from treating a casino deposit like a skin sale or the reverse.

Document device hygiene too. Thin browser profiles for wallets, short auto-lock timers, official extension listings only, and no random productivity extensions that can read every page. Most drains start as attention failures, not as novel cryptography breaks.

Revisit allowances and connected sites on a calendar. Monthly is enough for many players. Weekly is better if you try many new apps. Revoking costs gas; not revoking can cost the balance.

When something is stuck, classify it before you mash speed-up. Pending, dropped, failed, and wrong-network are different diseases. The wrong medicine creates nonce chaos on top of the original problem.

If gambling activity is colliding with sleep, shared finances, or honesty at home, the next optimisation is not a better fee route. Pause funding, use responsible-gambling tools, and treat custody hygiene as a way to protect a smaller, deliberate bankroll—not as a way to chase.

Finally, accept that clear process still loses to variance when you wager. The point of process is to keep losses inside the envelope you chose while sober. That is true for revoke-token-approvals and for every adjacent product in this cluster.

Unlimited allowances next to phishing sites are how delayed drains happen. Revoke on a schedule.

Device shared with family members needs a locked wallet every time you stand up. An unlocked extension on a living-room PC is not self-custody; it is a shared drawer.

Write down the network name you intend to use before you open the send modal. Speaking Base or Ethereum out loud sounds silly and prevents silent dropdown mistakes that explorers cannot undo.

If you use hardware signing, confirm the destination on the device screen, not only in the browser popup. Browser popups can be raced; device screens are slower on purpose.

Keep support channels narrow. Official help centres and ticket forms beat Telegram DMs from people who found you after a public transaction.

When a quote or fee looks too kind, assume missing risk. Instant desks that beat the whole market by a magical margin are often buying inventory for a drain, a chargeback chain, or a phishing funnel.

After any successful path, save the recipe: which site, which network, which fee you actually paid, how long it took. Future you will reuse the recipe instead of improvising under adrenaline.

If you deposit to PVPspinArena, match the verified address, send USDC or ETH on Base, and wait for credit before you open a round. Pending is not credited. Wrong asset is not credited. Patience here is cheaper than support theatre.

Budget language belongs next to custody language. A perfect wallet setup with no stop-loss still empties the play wallet. Decide the loss limit while the balance is still full.

Ignore leaderboard screenshots as strategy. Selection bias is undefeated. Your ledger is the only performance report that includes the quiet lost nights.

If you ever pasted a seed into a website, stop using that wallet for anything that matters. Move what remains to a fresh phrase you created offline, then retire the old addresses.

These habits are repetitive on purpose. Repetition is what still works at midnight when a lobby timer or a withdrawal quote is trying to rush you.
### Closing practical notes

Rehearse the happy path once with a tiny amount, then write the exact clicks you used. The second time should be copywork, not invention. If a UI changed, stop and re-read the fee and network labels instead of forcing muscle memory.

Keep screenshots of confirmations for a week when moving unfamiliar sizes. Storage is cheap compared with reconstructing a disputed withdrawal from memory.

When you are tired, prefer postponing irreversible sends over finishing a half-understood flow. Custody errors do not offer undo. Games will still be there tomorrow; lost keys and wrong-network sends often will not.

If a friend asks you to "just hold" their seed or to co-sign a recovery, refuse. Shared custody without a formal plan becomes shared theft risk.

End every funding or cashout day by locking the wallet, closing extra tabs, and checking that the play balance matches the budget you set before emotions entered the chat.
One last check before you leave the desk: confirm the network name, the first and last characters of any address you used, and the size you intended to move. Those three glances catch most expensive mistakes. If any glance feels fuzzy, do not sign. Come back after coffee. Irreversible ledgers reward patience more than bravado, and a delayed deposit is almost always cheaper than a clever recovery story you will tell later. Keep the desk boring: one wallet tab, one explorer tab, and no live chat yelling at you to hurry.`,
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
  updated: "2026-09-26",
};
