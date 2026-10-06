import type { Guide } from "./types";

export const guide: Guide = {
  slug: "metamask-scams",
  cluster: "Crypto payments",
  keyword: "metamask scams",
  secondary: ["metamask phishing", "fake metamask extension"],
  title: "MetaMask Scams: Fake Apps, Seeds and Blind Signs",
  h1: "MetaMask Scams: Fake Apps, Seeds and Blind Signs",
  description:
    "MetaMask scams to refuse: fake extensions, seed-phrase support agents, airdrop sites, unlimited token approvals, and blind signature requests.",
  answer:
    "MetaMask scams rarely break the cryptography. They borrow the logo and ask you to do the one thing the real app does not need: hand over the Secret Recovery Phrase, or sign a prompt you cannot read. MetaMask is a self-custody wallet. The company does not hold the phrase, and there is no password reset that recovers it after a thief or a typo takes it. The password on your device only unlocks the local vault. Scammers talk as if a support desk can see that vault. It cannot.\n\nGambling is only for people 21 or older, and only with money you can afford to lose. A scam is a separate loss from a losing wager. This page names the patterns. It does not reteach how to store a phrase. That belongs in the [seed phrase](/guides/seed-phrase) guide and the [wallet security checklist](/guides/wallet-security-checklist). Read those for storage and habits. Use this page to recognize the approach.",
  facts: [],
  sections: [
    {
      id: "fake-extensions-and-fake-download-pages",
      title: "Fake extensions and fake download pages",
      body: "The extension in your browser is the real product only if you installed it from the official store listing the publisher identifies. MetaMask scams ship a lookalike: a sponsored ad, a video link, a chat attachment, or a button on a casino clone. The icon matches. The publisher name is slightly wrong, or the install never touches the real store. The first screen then asks you to “import” a wallet by typing the phrase into the page.\n\nA real install does the opposite. If you are new, the official app shows you a phrase to write down offline. If you are restoring, you type an existing phrase into the official app you opened yourself, not into a website. Any download flow that collects the words in a browser form is finished. Close it. If you already typed the phrase there, assume the keys are stolen. Move remaining funds to a new wallet with a new phrase, using a clean official install, and retire the old words.\n\nUpdates are a cousin of the same trick. A random tab says your wallet is obsolete and offers a file. Open the browser’s extension store yourself and see whether the real listing has an update. Do not run an installer from the tab. On a phone, the same rule applies to app stores: publisher name first, then install. A configuration profile or a side-loaded app from a support chat is not customer service.",
    },
    {
      id: "seed-phrase-support-agents",
      title: "Seed-phrase support agents",
      body: "The second pattern is a person. They arrive in a reply, a direct message, email, or a call. They know you mentioned a stuck deposit or a locked password. They offer to fix it if you read the Secret Recovery Phrase, screen-share the phrase, or enter it on a “secure verification” page they host. Sometimes they wear the company name. Sometimes they wear the casino’s name. The request is identical, and the answer is no.\n\nNobody legitimate needs those words to see a public transaction hash, to explain a wrong network, or to reset a local password. A local password can be replaced only inside the official app, and only if you still have the phrase. Support cannot do it for you, and they cannot do it if the phrase is lost. Hang up. Do not argue inside the chat. The conversation is the tool. Leave it.\n\nImpersonators also ask you to “confirm you are human” by signing something while they watch. Screen sharing a wallet is a gift of every popup they can rush you through. If you need help, use help pages you navigated to yourself, and never from a link the stranger just sent. Describe the problem without revealing keys, addresses you consider private, or balances you do not want broadcast. A transaction hash is not a phrase. Keep that line bright.",
    },
    {
      id: "airdrop-sites-and-surprise-prizes",
      title: "Airdrop sites and surprise prizes",
      body: "Airdrop scams promise tokens you did not buy. The page asks you to connect, then to approve spending, or it skips ahead and asks for the phrase “to link the claim.” A real distribution, when one exists, would still be a prompt you can read inside the official wallet, for an asset you expected, on a site you found yourself. A banner that appears the moment you search “MetaMask claim” is not that.\n\nSome pages dust an unknown token into an address and tell you to visit a site to sell it. The visit is the trap. The token is bait. You do not have to interact with every asset the wallet can display. Hiding a junk token is enough. Do not import a random contract address a prize page gives you, and do not sign a message whose only purpose is “eligibility” on a domain you have never used.\n\nGiveaways on social feeds use the same script: reply, then move to a form. MetaMask scams love urgency, a countdown, and a famous name in the header. Urgency is a reason to stop. The phrase does not expire. A real balance will still be there after you close the tab and open the wallet from the toolbar to see what you actually hold.",
    },
    {
      id: "unlimited-approvals-and-blind-signatures",
      title: "Unlimited approvals and blind signatures",
      body: "An unlimited token approval lets a contract move that token from your address later, up to the whole balance, without a new confirmation for each pull. The wallet is working as designed when it asks you to set that cap. The scam is the context: a login, an airdrop, a “wallet repair,” or a gambling cashier that only needed a normal transfer. Reject unlimited caps you did not decide to grant. A spending approval is not how you prove you own an address.\n\nA blind signature is a request that shows a hash or a blob you cannot read, dressed up as a login or a claim. A normal message signature shows a sentence. If you cannot tell what you are authorizing, you are not informed enough to press confirm. Reject it. Blind requests are a favorite because they look technical, and people assume the technical look means the site is allowed to skip plain language. It is not.\n\nMetaMask’s native networks are Ethereum and EVM chains. Scam pages sometimes add a detour: install a Snap, add a network, or bridge to Solana or Bitcoin “to secure the wallet.” This guide will not repeat those clicks. Snaps and bridges are optional add-ons with extra trust, and a walkthrough is exactly what a fake site clones. The in-app network list is the source of truth. If a repair flow is not already inside the app you opened from the toolbar, it is not a repair.",
    },
    {
      id: "what-to-do-instead-of-improvising",
      title: "What to do instead of improvising",
      body: "Open the wallet from its own icon. Read the account and the network. Disconnect sites you do not recognize. Do not follow a link from the person who alarmed you. If you signed an approval you regret, stop using that tab and review allowances from a tool you navigated to yourself, which the wallet security checklist points at in more detail. If you typed the phrase anywhere but the official app during a restore you intended, create a new wallet and move funds. Speed matters after a phrase leak. A new password on the old phrase does not.\n\nDo not send a “test” of the phrase to anyone. Do not store the words in a screenshot to be helpful to the agent. Do not install a remote-control app so they can click for you. Those are the same scam with extra steps. The [seed phrase](/guides/seed-phrase) guide is where backup rules live. Follow that, not a comment under a video.\n\nPVPspinArena settles jackpot, coinflip, and roulette in USD and does not require MetaMask. It will not ask for a phrase, and a message that claims otherwise is impersonation. Other sites can still be honest EVM casinos or hostile copies. The difference is the prompt in your wallet and the domain you bookmarked, not the polish of the art. MetaMask scams succeed when the prompt is treated as a captcha. Treat it as a payment decision every time.",
    },
    {
      id: "a-short-refusal-list",
      title: "A short refusal list",
      body: "You can memorize the refusals without memorizing every brand of fraud. You refuse to type the Secret Recovery Phrase into a website. You refuse to read it aloud. You refuse installers that did not come from the official store. You refuse unlimited approvals that are not a transfer you planned. You refuse signatures you cannot read. You refuse Snap and bridge instructions pasted by a stranger. You refuse urgency.\n\nNone of those refusals requires a special setting buried in a menu that changes every year. They require the official app, the network list it shows, and a willingness to cancel. Cancel is a complete security action. The funds stay. The scammer moves on to someone who wanted the airdrop more than the balance they already had.",
    },
    {
      id: "a-real-prompt-never-begins-with-your-phrase",
      title: "A real prompt never begins with your phrase",
      body: "The official app can ask for the local password when you open it from the toolbar. It can ask you to pick an account. It can show a sentence to sign, a send to confirm, or an approval with a cap. It does not begin a support chat. It does not host an airdrop countdown. It does not tell you to install a second copy of itself from a file on the desktop. When a flow starts in a browser tab and only later “opens MetaMask,” check that the window is the extension you installed, anchored to the browser, not a fullscreen lookalike. The domain in the wallet’s request should be one you typed or bookmarked.\n\nMetaMask scams also lean on shame. People who already lost a fee, or who feel late to a token, are rushed into a worse signature. Stopping is allowed. The balance you still control is the whole point of self-custody. The company cannot reverse a signature and cannot reissue a phrase, so the moment before the click is the only moment that works. If you are unsure, cancel, lock the wallet, and come back from the icon later. Nothing honest expires in the next two minutes.\n\nKeep the native-network fact close when the scam wears a technical costume. Ethereum and EVM chains are the home list, and that list inside the app is the source of truth. A page that requires a Snap, a fake Bitcoin mode, or a Solana repair before it will “refund” you is changing the subject. Refunds of a self-custody mistake are not a mode the company switches on. They are either a transfer you sign to your own new wallet, or they are not available. Choose the new wallet only after the phrase leak, and never by importing the old phrase into the attacker’s page.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [wallet security checklist](/guides/wallet-security-checklist), [seed phrase](/guides/seed-phrase), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.\n\nThree tasks sit next to the scare: [exporting a MetaMask private key](/guides/export-metamask-private-key), [MetaMask swap fees](/guides/metamask-swap-fees) and [how to withdraw from MetaMask](/guides/how-to-withdraw-from-metamask). None of them should start with a seed phrase pasted into a chat.",
    },
  ],
  faqs: [
    {
      q: "What are the MetaMask scams worth refusing on sight?",
      a: "Fake extensions, support agents who ask for the Secret Recovery Phrase, airdrop claim sites, unlimited token approvals, and blind signature requests. Each one tries to get a signature or the phrase itself.",
    },
    {
      q: "Can MetaMask support reset my wallet if I was scammed?",
      a: "MetaMask is self-custody, so the company does not hold the phrase and there is no password reset that recovers it. If the words reached a website, those keys are compromised.",
    },
    {
      q: "Should I enter my seed phrase to claim an airdrop?",
      a: "Claiming a real token would be a prompt inside the official app, not a form on a website. A page that wants the phrase is taking the wallet, not delivering a prize.",
    },
    {
      q: "Is an unlimited approval part of a normal login?",
      a: "A login can be a readable message, while an unlimited approval lets a contract pull a token later. You should reject that approval when you only meant to connect.",
    },
    {
      q: "Does PVPspinArena prevent MetaMask scams?",
      a: "PVPspinArena settles jackpot, coinflip, and roulette in USD and does not require MetaMask. No site can stop you from signing a bad prompt in a different tab, so the refusal still has to happen in the wallet.",
    },
  ],
  sources: [],
  related: ["wallet-security-checklist", "seed-phrase"],
  updated: "2026-09-26",
};
