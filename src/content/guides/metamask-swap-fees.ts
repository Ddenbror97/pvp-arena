import type { Guide } from "./types";

export const guide: Guide = {
  slug: "metamask-swap-fees",
  cluster: "Crypto payments",
  keyword: "metamask swap fees",
  secondary: ["metamask swap cost", "metamask quote and gas"],
  title: "MetaMask Swap Fees: What the Quote Screen Shows",
  h1: "MetaMask Swap Fees: What the Quote Screen Shows",
  description:
    "MetaMask swap fees can include network gas plus a spread or service fee on the quote. Read the confirm screen. No fee percentage stays current for long.",
  answer:
    'MetaMask swap fees are not one number you can memorize. A swap can charge you in two different ways at the same time: a network gas fee, and a worse rate than a headline price because of spread, price impact, or a service fee. Both belong on the screen you see before you confirm. If a guide quotes a current percent, throw the percent out. The quote in your wallet is the only figure that matches the trade you are about to sign.\n\nThis page is about reading that quote. The click-by-click trade, slippage, and the difference between a decentralized exchange and a centralized one live in [how to swap tokens](/guides/how-to-swap-tokens). The gas half, who gets paid and why the same transfer costs more on a busy chain, lives in [gas fees explained](/guides/gas-fees-explained). Use those when you want the mechanism. Use this page when the question is "what am I paying, and where is it written?"\n\nPVPspinArena offers jackpot, coinflip, and roulette in USD. A swap inside a wallet is not a bet on that site, and the site does not set the wallet\'s swap price. Gambling is for adults 21 and older, and only with money you can afford to lose.',
  facts: [],
  sections: [
    {
      id: "two-charges-that-show-up-around-a-swap",
      title: "Two charges that show up around a swap",
      body: "Gas is the network's price for including your transaction. On Ethereum-style chains you pay it in the chain's native coin. MetaMask can show it as a suggested fee with a fiat estimate next to it. That estimate moves when the coin's price moves and when the network gets busy. The [gas fees explained](/guides/gas-fees-explained) guide is the place to learn why a simple send and a contract call do not cost the same effort. A swap is a contract call. It is heavier than a plain transfer. Expect the gas line on a swap to look different from the gas line on a simple send, and read the line anyway instead of guessing from the last transfer you did.\n\nThe second charge is inside the trade. You put in one token and expect another. The amount of the second token is the quote. Between a chart price and that quote there can be a gap. The gap may be a service fee the swap feature adds, a spread built into the route, or price impact because your trade is large next to the pool. The wallet should show you the output amount before you sign. That output is the number that matters. A percent you heard last year is not attached to today's route.\n\nYou can owe both even when the screen uses friendly words. \"Network fee\" and \"quote\" are the labels to hunt for. Some builds also show a line for the swap provider's charge. If you see it, it is part of this trade. If you do not see a separate service line, do not invent one, and do not assume the absence. Compare what you put in with what the screen says you get. The comparison is the fee, stated in tokens, which is more honest than a remembered rate.\n\nThere is a third possible transaction people forget. The first time you swap a given token, the wallet may ask you to approve the contract to spend it. That approval is its own transaction, with its own gas. It is not the swap. It can confirm, cost gas, and still leave the swap unsent until you sign the swap itself. Count it when you ask what the swap cost you. The [how to swap tokens](/guides/how-to-swap-tokens) guide explains approvals and why an unlimited approval is a lasting permission. This page only flags that the approval can be an extra gas payment on the way to the quote.",
    },
    {
      id: "how-to-read-the-quote-before-you-confirm",
      title: "How to read the quote before you confirm",
      body: 'Start with the pair and the network. The screen should name the token you pay, the token you receive, and the chain you are on. A stablecoin on one network is not the same balance as the same brand on another. If the receive token is right but the chain is wrong, the fee discussion is beside the point. You would be buying the wrong inventory at any price.\n\nRead the amount you will receive, not only the amount you will send. The receive amount is after the route has taken its cut and estimated the fill. If the wallet shows a dollar value for both sides, the two dollar values can disagree. That disagreement is a plain-language view of spread, impact, and fees. It is still an estimate. The token amount is the figure the route is promising, subject to the slippage you allowed.\n\nLook for a rate. A rate of "you get this much per one you pay" lets you compare the quote with a venue you already understand, such as an exchange order book you just checked. Comparison is allowed. Treating the exchange\'s mid price as a price MetaMask owes you is not. Different venues, different liquidity, different fees. If the gap is wider than you accept, cancel and try the other venue, or try a smaller size. Canceling the preview does not cost gas. Confirming does.\n\nCheck the network fee on the same preview. Add it to your mental total. A swap that looks fine in token terms can still be a poor idea when the gas, priced in the native coin, is large next to the trade. This page will not tell you a dollar cutoff. Your preview has the current estimate. Small trades suffer more when gas is high, because the fee does not shrink just because your swap is tiny. Large trades suffer more from price impact. Both show up if you read the receive amount and the gas line together.\n\nIf a countdown or a refresh is visible, wait for it once and read again. Stale quotes get replaced. The fee you accept is the one on the screen at the moment you confirm, not the one you liked twenty seconds earlier.',
    },
    {
      id: "gas-on-the-swap-and-gas-on-an-approval",
      title: "Gas on the swap and gas on an approval",
      body: 'The swap transaction pays gas whether the quote included a service fee or not. Gas is not waived because you already "paid a swap fee." They are different payees. Gas goes to the network\'s inclusion process, which [gas fees explained](/guides/gas-fees-explained) covers. A service fee, when the quote includes one, is part of the trading route. Seeing one does not remove the other.\n\nYou need the native coin in the account to pay gas. A wallet full of the token you want to swap, and empty of the fee coin, cannot finish. Keep a small fee balance on the network you actually use.\n\nAn approval, when it is required, posts first. It can succeed while the swap later fails. You have then paid gas for a permission and received no new token. The permission may remain until you revoke it. Revoking is another transaction and another gas payment. None of these are reasons to mash confirm. They are reasons to notice how many signatures the wallet is asking for. One prompt for an approval and a second prompt for the swap means two gas bills. A single prompt means you should still read it, because a swap call is enough to spend the token you offered.\n\nA swap that the network processes and then reverts can still cost gas. Read the fee preview before you confirm so you know the network charge you are risking.',
    },
    {
      id: "spread-price-impact-and-a-service-fee-line",
      title: "Spread, price impact, and a service fee line",
      body: "Spread is the gap between a mid price and the price your route will actually trade. On a thin pair that gap can eat the trade. The quote shows the result.\n\nPrice impact is what your own size does to the pool. Change the size and ask for a new quote if the receive amount looks punished.\n\nA service fee is a charge for using the swap feature itself, when that feature takes one. It may appear as its own row, or it may already be baked into the rate. The honest instruction is the same either way: read the quote screen. This article will not print a current fee percent, because the percent is a product choice that can change, and a wrong percent is worse than none. If a blog, a video, or a support impersonator quotes a permanent rate, ignore the rate and open the wallet.\n\nRoutes can include more than one hop. The preview collapses that into a receive amount. You should still recognize the token you receive. A hop that ends on a lookalike token is a different asset. If the receive token is unfamiliar, stop and use the [how to swap tokens](/guides/how-to-swap-tokens) guide before you treat the gap as an ordinary fee.\n\nSlippage is your tolerance for the quote moving before the trade lands. A wider setting can let the fill get worse and still succeed. A tighter setting can make the swap fail and still cost gas. The confirm screen should still be a trade you accept.",
    },
    {
      id: "when-a-cheap-looking-quote-is-still-a-bad-trade",
      title: "When a cheap-looking quote is still a bad trade",
      body: "A low gas number does not make a bad pair a good idea. Obscure tokens often show a tempting rate because the pool is thin or the price feed is nonsense. The fee in gas can be ordinary while the receive amount is a trap. If you cannot name the issuer of the token you are buying, the fee is the small part of the risk. You might also be asked for an approval that lets a contract spend far more than this one swap. That permission can outlive the trade. Price the permission as part of the decision, not as a footnote under a cheap network fee.\n\nA high gas number can ruin a sensible pair. Swapping a small amount on a congested network can cost more in gas than the trade is worth. The preview shows both. [How to swap tokens](/guides/how-to-swap-tokens) compares a wallet swap with an exchange conversion. Price either path from the live screen.\n\nBridge-shaped buttons are not swaps. Moving a token to another chain is a different product, with its own fee. If the quote quietly changes chains, cancel.\n\nCasino deposits are not a reason to skip the quote. If you are swapping into the asset a site accepts, you still read the receive amount and the gas. A hurried swap before a game is how a bad rate gets signed. PVPspinArena offers jackpot, coinflip, and roulette in USD. Fund play only after the swap has finished and you still like the balance you have left. The game's own odds are a separate cost from the wallet's quote.",
    },
    {
      id: "what-to-do-when-the-numbers-move",
      title: "What to do when the numbers move",
      body: "Quotes expire. Gas suggestions jump. A refresh that makes the receive amount worse is a new offer, not a glitch you should click through. Stop. Decide again. If the new offer is unacceptable, reject it. You do not pay gas for a preview you close.\n\nIf a swap sits pending, read any replacement fee before you agree to raise it. Check the account before you send a second swap. Two live swaps can both fill.\n\nAfter a success, look at the balance you received, not only the success checkmark. The checkmark means the transaction was included. The balance means the quote was real. If the token is wrong, stop before any further approval. A hash helps you read what happened. It does not refund gas.\n\nKeep a note of the network fee and the amounts if you care about records. Wallet history is a decent start. It is not a tax form, and fee totals from a blog are not your totals. Your confirmations are.\n\nWhen you want the background again: gas in [gas fees explained](/guides/gas-fees-explained), and the trade itself in [how to swap tokens](/guides/how-to-swap-tokens). The rule that ties them together is short. Read the quote screen, then read the gas line under it, and confirm only if both still look like a trade you meant.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [how to swap tokens](/guides/how-to-swap-tokens), [gas fees explained](/guides/gas-fees-explained), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.",
    },
  ],
  faqs: [
    {
      q: "What fees can a MetaMask swap include?",
      a: "Plan on a network gas fee, plus whatever spread, price impact, or service fee the quote shows before you confirm. Read that quote screen, because a percentage printed from memory goes stale.",
    },
    {
      q: "Is the gas fee the same as the swap fee?",
      a: "Gas pays the network to include the transaction, and the gas fees guide explains that half. The swap quote is a separate line about the trade itself.",
    },
    {
      q: "Do I pay gas if the swap fails?",
      a: "A transaction that the network processes and then reverts can still cost gas. Check the wallet's fee preview before you confirm so you know the network charge you are risking.",
    },
    {
      q: "Why did I receive less than the price I saw on a chart?",
      a: "The amount you receive is the quote after spread, price impact, and any service fee the screen lists. A chart price is not the same number as a filled quote on your network.",
    },
    {
      q: "Can the fee change after I open the quote?",
      a: "Quotes move with the market and with network conditions. If the screen refreshes to a worse amount, stop and read the new quote before you confirm.",
    },
    {
      q: "Where do I learn the swap steps themselves?",
      a: "The how to swap tokens guide covers choosing a route, slippage, and approvals. This page stays on the charges you should see before you sign.",
    },
  ],
  sources: [],
  related: ["how-to-swap-tokens", "gas-fees-explained"],
  updated: "2026-09-26",
};
