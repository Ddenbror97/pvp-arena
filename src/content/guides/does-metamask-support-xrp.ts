import type { Guide } from "./types";

export const guide: Guide = {
  slug: "does-metamask-support-xrp",
  cluster: "Crypto payments",
  keyword: "does metamask support xrp",
  secondary: ["metamask xrp token", "xrp ledger wallet vs metamask"],
  title: "Does MetaMask Support XRP on the XRP Ledger?",
  h1: "Does MetaMask Support XRP on the XRP Ledger?",
  description:
    "Does MetaMask support XRP? The XRP Ledger is not an Ethereum-style chain. A token named XRP elsewhere is a different asset. Hold real XRP in an XRP wallet.",
  answer:
    "Does MetaMask support XRP is a yes-or-no question with a two-part answer. MetaMask supports Ethereum-style networks and the tokens that live on them. The XRP Ledger is not one of those networks. Real XRP, the asset people mean when they say XRP, sits on the XRP Ledger and belongs in a wallet that speaks that ledger. A token that happens to be named XRP inside MetaMask is a different asset. It can be a wrapped product with an issuer, or it can be a ticker someone copied. This page will not give you a contract address for either one.\n\nIf you are choosing a wallet because you want to gamble, start from the network the site actually uses. The [crypto wallet for gambling](/guides/crypto-wallet-for-gambling) guide is that decision. This page only draws the line between the XRP Ledger and a lookalike balance in an Ethereum wallet. PVPspinArena offers jackpot, coinflip, and roulette in USD. An XRP balance does not fund those games by appearing inside MetaMask. Gambling is for adults 21 and older, and only with money you can afford to lose.",
  facts: [],
  sections: [
    {
      id: "what-metamask-is-built-to-hold",
      title: "What MetaMask is built to hold",
      body: "MetaMask accounts are keys for chains that follow Ethereum's model. You can add other networks if they speak that same wallet protocol. You can hold the native coin of those networks and the tokens issued as contracts on them. The app asks a node what an address holds and draws the list. That design is broad inside its family and closed outside it.\n\nThe XRP Ledger uses its own address style, its own transaction format, and its own way of paying fees, in XRP. A MetaMask account does not become an XRP Ledger account because you renamed it or because a token list offered a row labeled XRP. Adding a custom network still asks for Ethereum-style connection details. Those details point at an Ethereum-style chain. They do not point the app at the XRP Ledger.\n\nSo the practical test is the address you are told to use. XRP Ledger addresses are their own format. Ethereum-style addresses usually start with 0x. If the receive screen in front of you is a 0x string, you are not looking at an XRP Ledger deposit. If a casino, an exchange, or a friend gives you an XRP Ledger address and a destination tag, you need a wallet or an exchange withdrawal that can send on that ledger and can include the tag. MetaMask's send screen for an Ethereum token will not fill that role.\n\nRipple is a company. XRP is the asset on the XRP Ledger. A headline that mentions both is not a wallet integration.",
    },
    {
      id: "the-xrp-ledger-is-its-own-network",
      title: "The XRP Ledger is its own network",
      body: "On the XRP Ledger, accounts and balances follow that ledger's rules. A reserve of XRP is part of how funded accounts work there. Fees are paid in XRP and behave differently from Ethereum gas. You do not need the full rulebook to avoid the MetaMask mistake. You need to know that software built for the ledger is what can see and spend a real balance.\n\nAn XRP wallet, or the XRP account inside a multi-coin wallet that actually lists the XRP Ledger, will show a receive address in the ledger's format. Exchanges that custody XRP will show a deposit address and, very often, a destination tag or memo. The tag is not a footnote. Shared exchange addresses use it to decide which customer gets the credit. Send the amount, the address, and the tag the page lists, from a tool that has fields for all three. Leaving the tag off can put the funds in the exchange's general pocket with no automatic credit. MetaMask does not grow a destination-tag field because you are holding a token nicknamed XRP on another chain.\n\nWhen you send real XRP, trust the receive wallet or the exchange credit, plus a small test. A successful status on an Ethereum explorer says nothing about the XRP Ledger. A hardware wallet can hold XRP only in an account built for that ledger. That account is not the Ethereum account MetaMask shows.",
    },
    {
      id: "a-token-named-xrp-on-ethereum-is-a-different-ass",
      title: "A token named XRP on Ethereum is a different asset",
      body: 'Anyone can deploy a contract on an Ethereum-style chain and print the letters XRP on it. MetaMask will display the name it is given. The balance is a balance of that contract. It is not a balance on the XRP Ledger. You cannot send it to an XRP Ledger address. An exchange deposit page marked "XRP" and "XRP Ledger" will not credit you for an ERC-20-style token that reused the ticker.\n\nSome issued tokens are bridges or wrapped claims. You lock XRP somewhere, or you trust an issuer who says the token is redeemable, and the token trades on another chain. Even the honest version is a different asset. You take issuer risk, bridge risk, and the chance that redemption is slow, limited, or closed on the day you need it. Price can diverge from XRP. A casino or an exchange that says "we accept XRP" almost always means ledger XRP, not whatever wrapped contract a forum prefers. Ask which network, and believe the deposit page.\n\nDishonest tokens skip the issuer. The pitch is a contract address in a reply, a video, or a fake support chat, plus a promise that importing it "adds XRP to MetaMask." Importing it adds a row. The row can show a price that has nothing to do with the XRP market. Buying it pays the person who created the pool. This guide stops before any paste step on purpose. If you did not receive the contract from an issuer you already decided to trust, do not add it, and do not approve it to spend other tokens.\n\nIf a row labeled XRP is already in your MetaMask list, check which network you are on and whether you ever meant to hold a token there. Hiding the row cleans the screen. It does not convert the token into ledger XRP, and it does not undo an approval. Do not send that token to a destination tag address. The formats do not meet.',
    },
    {
      id: "destination-tags-exchanges-and-failed-credits",
      title: "Destination tags, exchanges, and failed credits",
      body: 'Exchange deposits are where this confusion gets expensive. The deposit screen has a network dropdown. One choice might be the XRP Ledger. Another might be an Ethereum-style network that lists a token with a similar name. Those are different pipes. The address, the tag, and the minimum the page mentions all belong to the pipe you selected. Change the dropdown and the address should change. If you copied the address, then changed the network, copy again.\n\nFrom the XRP Ledger side, you withdraw or send with a tool that understands the ledger. Paste the address. Paste the tag into the tag field, not into the amount and not into a note you keep only on your side. Send a small test. Wait for the exchange to credit the test before you send the rest. A credit is the proof. A green check in the wrong wallet is not.\n\nFrom MetaMask, you cannot complete that XRP Ledger deposit, because you are not on that ledger. If a page told you to send "XRP" from MetaMask, go back and read the network line again. You may be on a token deposit by mistake, or the page may be fraudulent. Fraudulent deposit pages are common around casino brands. Open the deposit screen yourself from a bookmark you typed. Do not use a deposit address that arrived in a direct message.\n\nWithdrawing XRP from an exchange to your own XRP wallet has the same three-part check: asset, network, address. Your own wallet may not need a destination tag, because the address is yours alone. The exchange page will say whether a tag is required. Follow the page. Sending to your MetaMask 0x address from an XRP withdrawal is the wrong destination. Many exchanges will reject a badly shaped address. Do not "fix" a rejection by switching the withdrawal network to an Ethereum chain just so the 0x address will fit. That switch changes the asset you are sending.',
    },
    {
      id: "how-to-hold-real-xrp",
      title: "How to hold real XRP",
      body: 'Pick software that names the XRP Ledger, not "an XRP token." Official wallet projects and cautious multi-coin wallets publish their own download pages. Type the address. Skip the sponsored ad that says "MetaMask XRP." The ad is selling the confusion this article is about.\n\nCreate the account, write down the backup offline, and use the receive screen for a small inbound test. The backup is the spending power. A support chat does not need it to "enable XRP." Anyone who asks is stealing the account, including any other coins that wallet controls.\n\nIf you would rather not self-custody, leave the XRP on an exchange you already trust and withdraw only when the destination is ready. That is a custody choice, with the exchange holding the keys. It is still more honest than a fake token in MetaMask. You can move to a personal XRP wallet later, with a test send, when you have the receive address.\n\nA hardware wallet that supports the ledger is the colder version of the same choice. Set it up from the manufacturer\'s own instructions. Confirm the address on the device screen when you receive funds. Do not type the device\'s seed into MetaMask to make the XRP "show up." The seed would expose every account on the device, and MetaMask would still not be the XRP Ledger.\n\nFees on the ledger are paid in XRP. Keep a little XRP in the account so a later send is possible. The amount the network requires can change, so read the wallet\'s own preview when you send. This page will not print a fee figure that will be wrong next month.',
    },
    {
      id: "choosing-a-wallet-when-the-coin-and-the-game-dif",
      title: "Choosing a wallet when the coin and the game differ",
      body: 'Wallet choice follows the asset you need to move, then the site you want to use. [Crypto wallet for gambling](/guides/crypto-wallet-for-gambling) walks through self-custody, hot wallets, and keeping a gambling balance separate from savings. Apply that here with one extra filter: if the asset is XRP on its own ledger, the gambling wallet has to be an XRP wallet. MetaMask can still be the wallet you use for Ethereum-style assets. It does not have to be the wallet for every coin you have ever been paid in.\n\nA site that accepts XRP should show an XRP Ledger deposit, usually with a tag. Send from the XRP wallet. A site that accepts only Ethereum-style assets should not be fed a lookalike XRP token and a hope. Read the deposit asset and the network. If they do not mention the XRP Ledger, your XRP stays where it is until you convert through an exchange you trust, into the asset the site named, and withdraw on the network the site named. That conversion is a separate trade with its own quote. Do not shortcut it by importing a ticker.\n\nPVPspinArena offers jackpot, coinflip, and roulette in USD. Those games are not an XRP Ledger casino product. Funding them is the site\'s own deposit path, in the asset it lists. Holding XRP for some other reason can stay in an XRP wallet the whole time. You do not have to drag that holding through MetaMask to make it "ready."\n\nScams collapse the steps. They tell you to add a contract, connect MetaMask, and approve a spend so the XRP will "convert." The approval is the theft. There is no contract address at the end of this article because a real XRP receive flow does not use one. If a page requires a paste before it will show you a balance, close the page.\n\nKeep the two balances labeled in your own notes if you ever touch both. "XRP on the XRP Ledger" and "a token called XRP on this other chain" should never share a line in a spreadsheet or a deposit form. The day you need to cash out, the label is what stops you from sending the wrong one. A small test is the second stop. Together they are the whole defense, and they do not require MetaMask to grow a feature it does not have.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.\n\nAlso read [metamask casino](/guides/metamask-casino), [is metamask safe](/guides/is-metamask-safe).\n\nThe same wallet question for other ledgers is [whether MetaMask supports Bitcoin](/guides/does-metamask-support-bitcoin) and [whether MetaMask supports Solana](/guides/does-metamask-support-solana).',
    },
  ],
  faqs: [
    {
      q: "Does MetaMask support XRP on the XRP Ledger?",
      a: "The XRP Ledger is not an Ethereum-style chain, and MetaMask is built for those chains. Hold real XRP in an XRP Ledger wallet.",
    },
    {
      q: "Can I add an XRP token contract in MetaMask?",
      a: "A token that uses the XRP name on Ethereum is a different asset from XRP on the XRP Ledger. Skip contract-address instructions from strangers, and do not treat that token as your XRP balance.",
    },
    {
      q: "What does a real XRP address look like?",
      a: "XRP Ledger addresses use their own format, and exchange deposits often add a destination tag. An address that starts with 0x belongs to an Ethereum-style network.",
    },
    {
      q: "Why do exchanges ask for a destination tag?",
      a: "Many exchanges share deposit accounts and use the tag to match your payment. Sending XRP without the tag the exchange asked for can leave the deposit uncredited even when the network accepts it.",
    },
    {
      q: "Can a bridge put XRP value inside MetaMask?",
      a: "A bridge or wrapped token, when it is real, is a different asset with issuer and bridge risk. It is not the same balance as XRP sitting on the XRP Ledger.",
    },
    {
      q: "Which wallet should I use if I also gamble with crypto?",
      a: "Pick a wallet that matches the network you will actually use, which the crypto wallet for gambling guide walks through. PVPspinArena offers jackpot, coinflip, and roulette in USD, so an XRP balance is a separate decision from funding those games.",
    },
  ],
  sources: [],
  related: ["crypto-wallet-for-gambling"],
  updated: "2026-09-26",
};
