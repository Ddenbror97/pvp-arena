import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-delete-metamask-account",
  cluster: "Crypto payments",
  keyword: "how to delete metamask account",
  secondary: ["delete metamask wallet", "remove metamask extension"],
  title: "How to Delete a MetaMask Account the Safe Way",
  h1: "How to Delete a MetaMask Account the Safe Way",
  description:
    "How to delete a MetaMask account in the app without erasing the on-chain keys. Back up the Secret Recovery Phrase before you remove anything.",
  answer:
    "How to delete MetaMask account data is a local cleanup, not an on-chain eraser. MetaMask is a self-custody wallet. The company does not hold your Secret Recovery Phrase, and there is no password reset that recovers a lost phrase. Removing an account from the app, or uninstalling the extension, takes the interface off this browser profile. The keys still control the funds if the phrase exists. The chain does not notice that you hid a row in a menu.\n\nBack up before you remove anything. If the only copy of the phrase is inside the vault you are about to delete, you can lock yourself out of money the chain still assigns to those keys. Gambling is only for people 21 or older, and only with money you can afford to lose. Deleting a wallet is not a responsible-gambling tool by itself. Empty the play account on purpose if you want it empty, then remove the app.",
  facts: [],
  sections: [
    {
      id: "what-delete-can-mean",
      title: "What “delete” can mean",
      body: "People use one verb for three different actions. Hiding an account removes that address from the account list on this device. Resetting or locking the vault forgets the local copy of the keys and asks for the phrase if you want them back. Uninstalling the extension or the mobile app removes the software and the local vault from that device. None of these deletes the Ethereum account from the network. None of them burns the phrase if you already wrote it down. None of them asks MetaMask’s company to approve the change, because the company never had the keys.\n\nA [self-custody wallet](/guides/self-custody-wallet) works this way on purpose. You are the custodian. There is no account-closure department that marks the address dead. As long as someone has the phrase, they can restore the addresses in a compatible app and sign. That someone should be you, which is why the backup comes first. If a website offers to delete your MetaMask for you and the form wants the phrase, the website is taking the account, not closing it.\n\nThe local password is the other confusion. Forgetting it blocks the vault on this device. It does not destroy the on-chain account. With the phrase, you restore inside the official app and choose a new password. Without the phrase, the forgotten password and the deleted extension are the same outcome: no access, and no company rescue. Decide which outcome you want before you click remove.",
    },
    {
      id: "the-chain-still-has-the-address",
      title: "The chain still has the address",
      body: "Balances live on the networks, not in the extension’s graphics. After you uninstall, a block explorer can still show the address if you look it up, and anyone who has the keys can still move what is there. How to delete a MetaMask account in the interface therefore does not “wipe” a token. If tokens remain, they remain. If you wanted them gone from your control, you had to send them somewhere else while you could still sign, or you had to accept that the phrase still controls them.\n\nSending them somewhere else means a normal transfer you confirm in the app: the right account, the right network from the in-app list, the right destination. MetaMask’s native networks are Ethereum and EVM chains. It does not natively hold Solana, Bitcoin, or XRP the way a dedicated wallet does. Do not try to “delete” a missing Solana balance by installing a Snap from a help page. This guide will not walk through that install. Snaps and bridges are optional add-ons with extra trust. If the asset is on another chain, use that chain’s wallet, and back up that wallet’s phrase too.\n\nThere is also nothing to gain by publishing the phrase and calling it a deletion. Publishing the phrase donates the funds to whoever imports it first. The address still exists. You have only added new signers you do not know. Destruction, if you truly want no one to have the coins, is a transfer to an address you accept as gone, done while you still control the keys. That is a serious step. Do it only when you understand there is no undo, and do not do it because a stranger dared you.",
    },
    {
      id: "back-up-then-decide-what-you-are-removing",
      title: "Back up, then decide what you are removing",
      body: "Open the official app from the toolbar or the phone icon. Confirm you can see the accounts you care about. Write the Secret Recovery Phrase on paper if you do not already have an offline copy, and if you still need those funds or might. The [seed phrase](/guides/seed-phrase) guide is the place for how to store that paper. This page will not repeat a storage course. It will say the order: backup first, removal second. Check the paper against the app’s confirmation step if the app offers one. A backup you cannot read is not a backup.\n\nIf you are done with a single address and you still want the rest of the wallet, you do not uninstall. You move funds off that address if any remain, then hide or remove that account in the account list the app provides. Labels in the app change, so follow the account menu in the extension you opened yourself, not a screenshot on a blog. The phrase can derive the hidden account again later. Hiding is housekeeping. It is not amnesia for the keyring.\n\nIf you are done with the whole vault on this device, backup first, send what you still want to keep to a destination you control, disconnect sites you no longer use, then uninstall from the browser’s extension page or the phone’s app settings. Removing the extension from one browser profile leaves other profiles and phones alone. If you restored the same phrase on a laptop and a phone, uninstalling the laptop copy does not touch the phone. The phrase is what ties them together.",
    },
    {
      id: "removal-steps-after-the-phrase-is-offline",
      title: "Removal steps after the phrase is offline",
      body: "Do these only after the Secret Recovery Phrase is written offline, or after you have deliberately moved the funds and accepted the result. None of these steps belongs on a website form.\n\n### See what the account still holds\n\nUnlock the official app with the local password. Select the account. Check each network you have actually used. The in-app network list is the source of truth for what this install shows. Note balances you still mean to keep. Ignore junk tokens you never bought. You do not need to touch them to remove the app.\n\n### Move what you intend to keep\n\nSend those balances to an address you control, on the matching network, and confirm they arrived before you continue. If you are hiding one account and keeping the phrase, you may leave the funds and simply stop using the address. If you are uninstalling and retiring the phrase, the funds have to leave first or they leave with the phrase.\n\n### Remove the account or the app\n\nUse the account menu in the official app to remove or hide the account you no longer want listed. To remove the software, uninstall the extension from the browser profile you are in, or uninstall the mobile app from the device settings. Do not run an “uninstaller” downloaded from a casino or a support chat. That file is not how to delete a MetaMask account. It is how machines get a second wallet you did not choose.\n\n### Confirm you can restore or that you no longer need to\n\nIf you kept the phrase, you should be able to restore in the official app on a device you trust and see the same addresses. Do a restore check only if you are unsure of the paper, and do it in the official app, never on a webpage. If you meant to retire the phrase, store or destroy the paper in line with how finished you are, knowing anyone who finds it owns the keys. The company cannot revoke it.",
    },
    {
      id: "one-phrase-many-accounts-many-devices",
      title: "One phrase, many accounts, many devices",
      body: "Deleting one derived account does not rotate the Secret Recovery Phrase. Every account that phrase can derive stays recoverable. If one address was exposed to a scam approval, hiding it is not the full response. Stop using the compromised approval path, and if the phrase itself was typed into a site, every account under that phrase is exposed together. Create a new wallet with a new phrase and move funds. Removing the extension without a new phrase leaves the thief’s copy in charge.\n\nDevices remember more than the extension. A cloud backup of a phone, a screenshot, or a second browser profile can still hold a vault or a picture of the words. Uninstall is not a hunt through every backup you ever made, but you should know those copies exist. A password manager entry that stores the phrase is a copy. Treat it with the same seriousness as the paper. The [self-custody wallet](/guides/self-custody-wallet) framing is the right one: you are closing a window on a device, not closing the account at a bank.\n\nPVPspinArena settles jackpot, coinflip, and roulette in USD. It does not require MetaMask, and deleting MetaMask does not close a dollar balance on the site. Those are separate. If you connected a wallet there or anywhere, disconnect it in the wallet before you uninstall so you are not confused later about what still has permission. An old token approval can outlive the extension if the keys are restored. Removal of the icon is not revocation of every contract permission you already signed.",
    },
    {
      id: "when-the-goal-is-an-empty-play-account",
      title: "When the goal is an empty play account",
      body: "Sometimes the real goal is to stop gambling from a hot wallet, not to perform surgery on the chain. Send the play balance somewhere you accept, or leave it and simply stop connecting that account. Uninstall if the extension tempts you and you have the phrase offline. You can install again later from the official store. The address will be waiting if the phrase is waiting. That is a feature when you slip, and it is the reason “I deleted it” is not the same sentence as “nobody can move it.”\n\nHow to delete a MetaMask account safely is the order: know which action you mean, back up or move funds, remove the local listing or the app from the official controls, and refuse every helper who wants the phrase to finish the job. The chain keeps the history. Your paper decides whether you keep the keys.\n\nThe rest of this subject is on the [Crypto payments guides](/guides/topics/crypto-payments). See [seed phrase](/guides/seed-phrase), [self custody wallet](/guides/self-custody-wallet), [crypto wallet for gambling](/guides/crypto-wallet-for-gambling). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [wallet](/wallet) before you play.",
    },
  ],
  faqs: [
    {
      q: "How to delete a MetaMask account so the coins disappear?",
      a: "You cannot delete an on-chain account by removing it in the app. Deleting the extension or hiding the account leaves the keys in control of the funds if the Secret Recovery Phrase still exists.",
    },
    {
      q: "Should I back up before I remove MetaMask?",
      a: "Write down the Secret Recovery Phrase offline before you remove the extension or reset the vault. Without that phrase or another backup, the company cannot restore the keys.",
    },
    {
      q: "Does forgetting the password delete the account?",
      a: "The password only locks the local vault. There is no password reset that recovers a lost Secret Recovery Phrase, but the phrase can restore the same accounts inside the official app.",
    },
    {
      q: "If I remove one account, do the others vanish?",
      a: "Hiding one account in the app hides that address in the list. The same phrase can derive it again, and other accounts from that phrase remain unless you retire the phrase itself.",
    },
    {
      q: "Does PVPspinArena delete my MetaMask if I close my profile?",
      a: "PVPspinArena settles jackpot, coinflip, and roulette in USD and does not require MetaMask. Closing a site profile does not remove keys from your device or erase balances on a chain.",
    },
  ],
  sources: [],
  related: ["seed-phrase", "self-custody-wallet"],
  updated: "2026-09-26",
};
