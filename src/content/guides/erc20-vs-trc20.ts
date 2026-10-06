import type { Guide } from "./types";

export const guide: Guide = {
  slug: "erc20-vs-trc20",
  cluster: "Crypto payments",
  keyword: "erc20 vs trc20",
  secondary: ["ERC-20 token standard", "TRC-20 token standard"],
  title: "ERC-20 vs TRC-20: Same Ticker, Different Asset",
  h1: "ERC-20 vs TRC-20: Same Ticker, Different Asset",
  description:
    "ERC-20 vs TRC-20 explains why the same ticker on Ethereum and TRON is a different asset. Learn how to match the network before you send.",
  answer:
    "ERC-20 vs TRC-20, often searched as erc20 vs trc20, is a comparison of two token standards on two different blockchains, not a comparison of two nicknames for one coin. ERC-20 is an Ethereum token standard. TRC-20 is a TRON token standard. A token that follows one of those standards can use a familiar ticker, including USDT, and still be a separate asset from the token with the same ticker on the other chain. If you send the Ethereum version to an address that was issued for the TRON version, you have not made a slow payment. You have moved a different asset to a place that may not be watching for it.\n\nPeople meet the labels on an exchange withdrawal menu or a casino cashier: a dropdown that says ERC-20, TRC-20, and sometimes other networks beside one ticker. The dropdown is the decision. The ticker is only the name printed on both doors. This page explains the standards and the mismatch. What a site charges on top of network costs belongs in [crypto casino deposit fees](/guides/crypto-casino-deposit-fees). How Tether is used at casinos belongs in [USDT casino](/guides/usdt-casino). Neither of those pages is a reason to skip the network check.",
  facts: [],
  sections: [
    {
      id: "what-erc-20-specifies",
      title: "What ERC-20 specifies",
      body: 'ERC-20 is a set of rules for fungible tokens on Ethereum. Fungible means one unit is meant to be interchangeable with another unit of the same token contract. The standard describes how a contract exposes a balance, a transfer, and an allowance so that other contracts can be permitted to move tokens. Wallets and exchanges learned that interface, which is why so many assets feel similar in an Ethereum wallet: the app calls the same kinds of functions.\n\nThe standard does not, by itself, say the token is worth one dollar, that the issuer is solvent, or that a transfer is cheap. It says how software should talk to the contract. USDT on Ethereum is an ERC-20 token because its Ethereum contract follows that interface. Another asset on Ethereum can also be ERC-20 and have nothing to do with Tether. When a cashier says "ERC-20," read it as "the Ethereum deployment we support," and then confirm you are withdrawing on Ethereum, not on a different chain that happens to host a token with the same ticker.\n\nEthereum addresses used for these tokens look like other Ethereum accounts, typically a hexadecimal string beginning with 0x. The token does not get its own address format. You send the token to an account address, and the token contract records the new balance. You pay the Ethereum network\'s fee in ETH, because the transfer is an Ethereum transaction. How that fee is calculated is a gas question. This page will not invent a dollar figure. Fees move with demand, and a number copied from a blog post will be wrong on the day you send.\n\nOther chains copied the ERC-20 interface. A token on one of those chains can look familiar in a wallet and still be a different contract with a different ledger. An exchange that labels only "ERC-20" is usually pointing at Ethereum mainnet. Do not assume the label covers every chain where the interface matches. If the menu lists a chain by name, that name is the instruction.',
    },
    {
      id: "what-trc-20-specifies",
      title: "What TRC-20 specifies",
      body: "TRC-20 is a token standard on TRON. It serves the same kind of job: a fungible token contract that wallets can query and transfer. The chain is not Ethereum. The virtual machine, the address format, and the fee system are TRON's. TRON addresses you use for these transfers commonly start with the letter T. They are not 0x addresses. If you are holding a T address and an Ethereum address and trying to decide which field to paste into, you already have the format clue in front of you. Matching the first character is not the whole check, and it is a check you should not skip.\n\nTRC-20 USDT is Tether's token on TRON. It is widely used because TRON transfers are often chosen for stablecoin movement, and because casinos and exchanges list it beside the Ethereum option. Popularity does not merge the ledgers. A TRC-20 balance lives in the TRON token contract. An ERC-20 balance lives in the Ethereum token contract. Your wallet might be able to show both, on two different network views, from related keys or from unrelated accounts. Showing both in one app does not make them one balance.\n\nTRON fees are described in that network's own terms, often energy and bandwidth, which can be covered by holding or committing TRX, or paid as TRX when your resources are not enough. The dollar cost of that system changes, and it is not the same mechanism as Ethereum gas. Anyone who publishes a permanent \"TRC-20 costs this many dollars, ERC-20 costs that many\" table is freezing a moving target. Compare the fee your wallet or the exchange shows you at the moment you withdraw, on the network you actually selected. For how casinos add their own deposit charges on top of whatever the chain collects, use the deposit-fee guide rather than a guessed spread.",
    },
    {
      id: "same-ticker-wrong-network",
      title: "Same ticker, wrong network",
      body: 'USDT is the example that catches people because both networks print the same three letters. The issuer can support more than one chain. Each support is a separate token deployment. Burning or moving one does not automatically move the other. If your exchange balance says USDT and the withdrawal network says TRC-20, the coins that leave are TRC-20 USDT. If the casino\'s deposit page says ERC-20, it is watching Ethereum. The transfer can succeed on TRON and never appear in an Ethereum deposit scanner. The casino did not "hold" it. The scanner is looking at a different chain.\n\nThe same trap exists in the other direction, and it exists for tickers other than USDT. A token name is a label in a wallet. The contract address and the chain are the identity. When a site lists a contract address for the token it accepts, that address is part of the instruction. Sending a different contract that happens to use the same ticker is another way to deliver an asset the receiver did not ask for.\n\nRecovery is not something this page can promise. If the receiving wallet does not control the chain you used, the operators may have no key that can move those tokens. If they do operate on that chain, they might be willing to help, and they might not. Either way, the first transfer already happened. A second transfer on the correct network is a new payment, not a correction, and you should make it only if you still intend to pay and you have confirmed the first coins are not going to be credited.\n\nAddress shape is your last obvious warning. Pasting a T address into an Ethereum ERC-20 form should fail the form. Pasting a 0x address into a TRON form should fail the form. Failures you can see are better than successes on the wrong ledger. The dangerous case is a form that accepts the string because you picked the wrong network inside your own wallet while the destination address was valid on both, which is a different mistake. For ERC-20 versus TRC-20, the formats usually differ, so use that difference. Do not override a form that rejects the address.',
    },
    {
      id: "allowances-are-not-transfers",
      title: "Allowances are not transfers",
      body: 'ERC-20 includes an approval flow. You can sign a message that lets another contract spend up to some amount of your tokens. TRC-20 has a similar idea. A transfer sends a specific amount now. An approval can sit there until something pulls the tokens later. Casino and exchange deposits that want a normal payment should ask for a transfer to their address, or they should explain a contract flow in their own help pages. A random site that asks you to approve "USDT" so it can "detect your wallet" is not completing an ERC-20 versus TRC-20 choice. It is asking for permission to move tokens. Decline if you do not know the contract.\n\nWallets sometimes hide the difference in a short confirmation. Read it. If the screen names an amount leaving now, you are in a transfer. If it names a spender and a limit, you are in an approval. The standard\'s flexibility is useful for trading apps. It is also how people lose a token balance without a second click. None of that changes the network question. An approval on Ethereum does not move TRON tokens, and an approval on TRON does not move Ethereum tokens. It can still empty the balance on the chain where you signed it.',
    },
    {
      id: "choosing-a-network-without-a-fake-fee-table",
      title: "Choosing a network without a fake fee table",
      body: 'Pick the network the receiver listed, not the network you wish they listed. If you hold the other version, the honest options are to withdraw on the network you hold only if the receiver also accepts it, or to exchange or convert through a service you trust so that you end up holding the version they accept. A conversion is a trade or a bridge-style move you choose on purpose, with fees shown before you confirm. It is not something you improvise by sending to a foreign address and hoping the ticker matches.\n\nWhen both networks are accepted, people compare cost, speed, and how comfortable they are with each chain. Those are real preferences. They still have to be read off the withdrawal screen today, because congestion and exchange pricing change. [Crypto casino deposit fees](/guides/crypto-casino-deposit-fees) separates the chain fee, the exchange fee, and any site surcharge. Use it when the question is "what am I paying," not when the question is "which standard is this token." [USDT casino](/guides/usdt-casino) is the place for how Tether deposits are treated at gambling sites, including the habit of listing several networks under one ticker.\n\nGambling is for adults 21 and older, and only with money you can afford to lose. Choosing a cheaper network does not change the house edge or the odds of a peer game. It only changes whether the chip arrives.\n\nPVPspinArena offers jackpot, coinflip, and roulette settled in USD. It is not an ERC-20 USDT cashier and it is not a TRC-20 USDT cashier. The published rail is USDC and ETH on Base. Deposit and payout wallets are separate. If you hold USDT, this comparison still matters at the exchange where you convert or withdraw, because picking the wrong USDT network there can strand the transfer before you ever reach a Base deposit. Follow the network name on the screen that is about to broadcast, every time.',
    },
    {
      id: "a-practical-check-before-you-confirm",
      title: "A practical check before you confirm",
      body: 'Read three strings out loud: the ticker, the network label, and the first and last characters of the address. Then look at which fee asset the wallet wants. ETH in the fee field means you are on an Ethereum-style chain. TRX in the fee or resource field means you are in TRON\'s world. If those clues disagree with the receiver\'s instructions, cancel. There is no bonus for speed. A cancelled withdrawal that never broadcasts is a success when the alternative is a finished transfer on the wrong standard.\n\nSave the hash and the network name together. "I sent USDT" is not a support ticket anyone can trace. "I sent this hash on TRON" or "on Ethereum" is. If you only remember the ticker, you will waste time searching the wrong explorer and convincing yourself the payment vanished. It may be visible on the other chain, credited to an address that cannot use it.\n\nTeach the habit to anyone you send money to, as well. When you give out an address, give the network and the token standard in the same message as the string. "USDT" alone is how your friend recreates the mistake in the other direction. A complete instruction is the ticker, the standard or chain, the address, and the memo if there is one.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [crypto casino deposit fees](/guides/crypto-casino-deposit-fees), [usdt casino](/guides/usdt-casino), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.',
    },
  ],
  faqs: [
    {
      q: "Is ERC-20 USDT the same coin as TRC-20 USDT?",
      a: "No, they share a ticker and a brand story, and they are different tokens on different chains. A wallet that holds one will not show a balance for the other until you use the matching network.",
    },
    {
      q: "What does ERC-20 actually name?",
      a: "ERC-20 is a token standard on Ethereum that describes functions such as transfer and balance checks. An exchange label that says ERC-20 usually means the Ethereum network, not every chain that copied the same interface.",
    },
    {
      q: "What does TRC-20 actually name?",
      a: "TRC-20 is a token standard on TRON, with a similar idea and a different chain, address format, and fee system. TRC-20 USDT is the TRON deployment, and it is not an Ethereum asset.",
    },
    {
      q: "Why do fees differ if the ticker is the same?",
      a: "You pay the chain you use, not the ticker. Ethereum-style transfers need the chain's fee asset, and TRON transfers draw on that network's resource system, and this page does not quote a dollar price because those costs move.",
    },
    {
      q: "Does PVPspinArena take ERC-20 or TRC-20 USDT?",
      a: "PVPspinArena offers jackpot, coinflip, and roulette settled in USD, and its published deposit rail is USDC and ETH on Base, not USDT on Ethereum or TRON. Use the asset and network the cashier lists, and read the USDT casino guide if you are comparing Tether sites.",
    },
  ],
  sources: [],
  related: ["crypto-casino-deposit-fees", "usdt-casino"],
  updated: "2026-09-26",
};
