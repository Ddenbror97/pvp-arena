import type { Guide } from "./types";

export const guide: Guide = {
  slug: "rainbow-wallet-review",
  cluster: "Crypto payments",
  keyword: "rainbow wallet review",
  secondary: [
    "rainbow wallet seed phrase",
    "rainbow ethereum wallet",
    "rainbow wallet swaps",
    "is rainbow a custodial wallet",
  ],
  title: "Rainbow Wallet Review: Chains, Keys and Risks",
  description:
    "Rainbow Wallet review: a self-custody mobile wallet for Ethereum and some L2s. See chains, the seed phrase, swaps, and what it does not insure.",
  h1: "Rainbow wallet review: chains, keys, and the risks you keep",
  answer:
    "Rainbow wallet review, in plain terms: Rainbow provides self-custody wallet software for mobile and desktop browsers. Its current site also markets prediction and leveraged trading products. Those products introduce risks beyond holding assets in a self-custody wallet. Keeping your own keys does not insure a lost recovery phrase.",
  facts: [
    "Rainbow is self-custody software: the recovery phrase is the backup of the keys.",
    "The product is built around Ethereum and some layer 2 and related networks the app lists.",
    "The company is not an exchange and cannot recreate a phrase you never saved.",
    "A swap, when the app offers one, is priced by the quote on that screen.",
    "A self-custody app does not insure tokens the way a bank deposit might be insured.",
    "Adults 18 or older only.",
  ],
  sections: [
    {
      id: "what-this-review-is",
      title: "What this review will and will not claim",
      body: "A rainbow wallet review should start with the job the app actually does. Rainbow is a self-custody wallet. You hold the keys on your device. The company provides software that can show balances, build transactions, and ask you to confirm them. It does not hold an account balance the way an exchange does, and it does not become a casino because you might later send tokens to a game.\n\nThose crowns go stale, and they hide the real risk, which is that **you** can lose the keys. Read the current product description on the official site, rainbow.me, before you install anything. Screenshots in ads are not the install.\n\nThe [crypto payments](/guides/topics/crypto-payments) cluster is where wallet explainers live. Adults 18 or older only. If a site you fund from this wallet sets a higher age, use the higher age. Understanding a wallet does not make a wager profitable, and it does not make a token transfer reversible.\n\n### Network and custody checks\n\n- No claim that Rainbow is safer than every other wallet.\n- No fee table for swaps, bridges, or in-app buys.\n- No instruction to type a seed phrase into a website.\n\nIf a paragraph here disagrees with the app you installed from the official listing, believe the app and the official site. Check rainbow.me when a label on the screen has changed.",
    },
    {
      id: "chains",
      title: "Chains: Ethereum and some layer 2s",
      body: "Rainbow is known as a mobile wallet for Ethereum and for some layer 2 networks that speak a similar style of account. The exact list changes. A network that was missing last year can appear, and a network you expected can be absent from the build you have. The source of truth is the network list inside the app you opened yourself, plus what rainbow.me says today.\n\nThat limit matters for gambling deposits. A cashier may want a token on one layer 2. The wallet may show a similar token name on another network. Same ticker, different ledger. The transfer can succeed on the chain you picked and still never credit, because the site was watching a different chain. Match the network name before you match the amount.\n\nDo not assume the app holds bitcoin, Solana, or every other ecosystem just because a multi-chain ad used the word wallet. If you need a chain Rainbow does not list, use a wallet that actually lists it. Forcing an asset into the wrong interface is how people send coins to an address that cannot receive them.\n\n### What to check in the app\n\n- The network name on the send screen.\n- The token name, not just a logo.\n- Whether the destination cashier published that same pair.\n\nA [self-custody wallet](/guides/self-custody-wallet) on the wrong network is still self-custody. The keys worked. The routing failed. Official docs are the place to confirm which networks the current Rainbow build supports. If you are unsure, do not send a test of your whole balance.",
    },
    {
      id: "keys",
      title: "Keys on the device and the seed phrase",
      body: "When you create the wallet, the app shows a seed phrase. Those words are the backup of the keys. Anyone who has the phrase can move the assets those keys control, without your phone password and without asking Rainbow. The local password or face unlock protects that device. It is not a master key stored at a help desk.\n\nWrite the phrase down offline when the app shows it. Do not put it in a cloud note, a screenshot roll, or a chat. The [seed phrase](/guides/seed-phrase) guide is the place for that object in more detail. That is what self-custody means. It is also why fake support exists.\n\nA password reset on an email account is a different product. Rainbow is not that product. Reinstalling the app can restore the wallet only if you still have the phrase, or another backup you made on purpose. There is no identity check that replaces the words.\n\n### Two secrets, two jobs\n\n- The seed phrase restores the keys on a new install.\n- The device lock stops a stranger who picked up an unlocked phone for a minute.\n- Neither secret is something a casino, a swap site, or a support agent should receive.\n\nIf someone says they are Rainbow and need the phrase to verify you, they are not fixing the wallet. Close the chat. The official site does not need those words to explain a feature.",
    },
    {
      id: "swaps",
      title: "Swap quotes and transaction costs",
      body: "Rainbow can offer a swap so you trade one token for another inside the app. When that screen exists, the quote is the disclosure that matters: what you send, what you expect back, and the cost sitting in that quote. Routes can use outside liquidity. The price can move between the moment you look and the moment you confirm. A review that prints last month's percentage is already wrong.\n\nIt will not compare a guessed swap fee with another wallet's guessed swap fee. If you need the number, open the swap you actually intend, read the quote, and cancel if the number is unclear or worse than you accept. Official product pages can describe that a swap exists. They are not a promise that today's quote matches a blog.\n\nA swap is also a transaction you sign. A signature can be a simple trade, or it can be something broader if you are not on the screen you think you are. Read the token names. Reject a prompt you did not start. The wallet is doing what you approve. It is not a broker that reverses a trade after you confirm.\n\n### Before you confirm a swap\n\n- You opened the swap from the app, not from a link in a message.\n- The tokens and the network match what you meant.\n- The quote is acceptable right now, not yesterday.\n- You are not being asked for a seed phrase as part of the trade.\n\nIf any line fails, cancel. Getting a slightly better price is not worth a signature you cannot explain.",
    },
    {
      id: "not-insured",
      title: "What the app does not insure",
      body: "Self-custody is not a bank account. Rainbow does not hold your tokens in an insured deposit program that pays you back if you lose the phrase, sign a malicious approval, or send to the wrong address. If a marketing line sounds like insurance, read the current terms on rainbow.me instead of trusting a summary.\n\nPhishing losses fall on the same side of that line. A fake app, a fake site, or a fake support agent can persuade you to reveal the phrase or to sign a transaction. Once the keys have signed, the chain does not call Rainbow for permission to undo it. There is no chargeback in the card-network sense. Plan as if a mistake is final. This is a hot wallet: the keys sit on an online device, which is convenient and exposed. Keep a play amount there if you use it for games, and keep long-term savings off any wallet you connect to random sites. The [wallet security checklist](/guides/wallet-security-checklist) is the habit list.\n\n### Losses this product does not undo\n\n- A seed phrase you typed into a website.\n- A send to the wrong address or the wrong network.\n- A signature you approved and then regretted.\n\nIf you want a different risk shape, that is a different product, such as leaving assets on an exchange where the company holds the keys and can also freeze you. It tells you Rainbow is the first kind.",
    },
    {
      id: "phishing",
      title: "Phishing, fake apps, and fake support",
      body: "The attacks around a popular wallet are boring and effective. Someone copies the icon. Someone buys an ad above the real download. Someone slides into a reply and offers to fix a stuck transfer if you read them the phrase. The app's real design makes the lie sound plausible, because there really is no password reset. The attacker pretends to be the missing reset.\n\nInstall only from the store listing or the link on rainbow.me that you typed yourself. Do not install from a casino banner, a direct message, or a search ad you did not check. After install, open swaps and sends from the app icon. A website can ask your wallet to connect. It should never ask you to paste the seed phrase into a form.\n\n[What MetaMask is](/guides/what-is-metamask) describes a different self-custody app with the same class of lie. If the choice in front of you is MetaMask or Trust Wallet, that comparison is [MetaMask vs Trust Wallet](/guides/metamask-vs-trust-wallet). The brand on the icon changes. The theft does not. No wallet vendor needs your phrase to look up a public address. If the conversation reaches the words, stop, even if the logo looks right.\n\n### A refusal list\n\n- No phrase in a browser form.\n- No phrase in a support chat.\n- No remote-control app installed so someone can tap confirm for you.\n- No approval of a transaction you did not initiate.\n\nAdults get phished too. Age is not a shield. Slow down when the message is urgent, flattering, or attached to a balance you care about. Urgency is the product the thief is selling. Type rainbow.me yourself instead of trusting a link.",
    },
    {
      id: "casino-fit",
      title: "Where a casino deposit actually leaves the app",
      body: "A wallet review is not a deposit tutorial. If you send assets from Rainbow to a game, the tokens leave the address you control and sit wherever that cashier watches. Rainbow does not run the game, and the game does not hold your seed phrase. The [wallet](/how-it-works#wallet) page on this site is where PVPspinArena describes its own cashier. Read that page for this product. If a site asks for the phrase to credit a balance, close it.\n\nUse Rainbow only for networks it actually shows, only with amounts you can lose, and only if you are 18 or older. It can fit an Ethereum-style payment and fail a chain it does not list. Check rainbow.me for the networks and swap flow you see today.\n\n| What people assume | What is closer to the truth |\n| --- | --- |\n| Rainbow holds coins like an exchange | You hold the keys; the app is the interface |\n| A password reset replaces a lost seed | The seed is the backup; the company cannot recreate it |\n| Last month's swap price is still the fee | The quote you confirm is the price that counts |\n| The app insures a phishing loss | Self-custody is not an insured bank deposit |\n| Any network with a similar ticker will credit | Only the network the cashier watches can credit |\n\n### Stop if you cannot explain the send\n\n- Which app you installed, and from which official page.\n- Which network the cashier named.\n- Why the signature does not require the seed phrase.\n\nIf you cannot answer those, do not confirm. A rainbow wallet review that pushes you to click faster has failed its only job.",
    },
  ],
  faqs: [
    {
      q: "Is Rainbow Wallet an exchange?",
      a: "No. It is self-custody software. You hold the seed phrase and sign transactions. The company does not keep an exchange balance it can restore if you lose the phrase.",
    },
    {
      q: "Does this review name Rainbow the safest wallet?",
      a: "No. No wallet removes seed theft, malicious-signature or device-compromise risk. Compare the protections for the networks you use. A hot wallet can be convenient and still lose everything to a leaked seed phrase or a bad signature.",
    },
    {
      q: "Which chains does Rainbow support?",
      a: "Ethereum and some layer 2 and related networks, depending on the build you have. Check the network list in the app and the current pages on rainbow.me.",
    },
    {
      q: "Are Rainbow swap fees fixed?",
      a: "Do not rely on a fixed table. If the app offers a swap, read the quote on that screen before you confirm.",
    },
    {
      q: "What if someone from support asks for the seed phrase?",
      a: "Stop. A real wallet provider does not need your seed phrase to explain a feature or to look at a public address. Sharing the phrase hands over the keys.",
    },
  ],
  sources: [
    { label: "Rainbow", url: "https://rainbow.me/" },
    { label: "Ethereum.org: wallets", url: "https://ethereum.org/en/wallets/" },
    { label: "Ethereum.org: wallet security", url: "https://ethereum.org/en/security/" },
  ],
  related: [
    "what-is-metamask",
    "metamask-vs-trust-wallet",
    "seed-phrase",
    "wallet-security-checklist",
  ],
  updated: "2026-11-26",
};
