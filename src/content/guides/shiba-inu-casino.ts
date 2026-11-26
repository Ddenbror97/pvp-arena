import type { Guide } from "./types";

export const guide: Guide = {
  slug: "shiba-inu-casino",
  cluster: "Crypto payments",
  keyword: "shiba inu casino",
  secondary: ["shib casino", "gamble with shib", "shiba inu gambling", "shib deposit casino"],
  title: "Shiba Inu Casino: SHIB Networks and Gas Tokens",
  description:
    "SHIB deposits need the exact supported network. Distinguish Ethereum gas in ETH from Shibarium gas in BONE and verify the receiving token before sending.",
  h1: "Shiba Inu casino deposits: SHIB, Ethereum and Shibarium",
  answer:
    "A Shiba Inu casino may support a SHIB token on a particular network; the ticker alone is insufficient. SHIB on Ethereum uses ETH for gas, while the Shiba ecosystem identifies BONE as Shibarium's gas token. Confirm the casino's supported network and token before sending. A shared 0x address format does not make the two networks interchangeable.",
  facts: [
    "SHIB, BONE and the Shibarium network are different parts of the ecosystem.",
    "Ethereum transaction gas is paid in ETH.",
    "The Shiba ecosystem identifies BONE as the gas token for Shibarium.",
    "A token transfer must match the receiving service's network support.",
  ],
  sections: [
    {
      id: "ethereum",
      title: "A SHIB balance does not pay Ethereum gas by itself",
      body: "[Ethereum's gas documentation](https://ethereum.org/en/developers/docs/gas/) explains that transactions consume gas paid in ether. If your SHIB is on Ethereum, keep enough ETH to complete the intended transfer. A large token quantity does not solve a missing gas balance.\n\nThe [Ethereum gambling guide](/guides/ethereum-gambling) covers that receiving network, and [gas fees explained](/guides/gas-fees-explained) distinguishes transaction cost from gambling fees.",
    },
    {
      id: "shibarium",
      title: "Shibarium requires a separate network check",
      body: "The [Shiba ecosystem site](https://shib.io/) identifies BONE as its gas token and links its Shibarium products. An operator saying 'SHIB accepted' still needs to specify which network and representation it credits.\n\nDo not move assets through a bridge merely because an Ethereum transfer quote is inconvenient. Bridging adds a separate transaction and support requirement. A casino that lists only Ethereum SHIB has not thereby agreed to credit a Shibarium transfer.",
    },
    {
      id: "identity",
      title: "Read the asset, network and actual received amount",
      body: "Record the receiving network, token identifier, address, minimum and the amount expected after any sender-side charges. Confirm that the wallet is showing the intended asset, not a copied ticker. A small test must still exceed the cashier's minimum.\n\nA successful token transfer can leave the casino account uncredited if the network or token was unsupported. The [withdrawal guide](/guides/crypto-casino-withdrawals) explains the service-credit distinction.",
    },
    {
      id: "exposure",
      title: "Keep token-price risk separate from the game",
      body: "If a casino converts SHIB into a dollar balance, inspect the actual conversion quote. If it keeps the account in SHIB, its dollar value can move while you play. Neither arrangement improves a game's payout probabilities.\n\nThe [Crypto payments collection](/guides/topics/crypto-payments) compares other assets. Plan a loss limit in a unit you understand and use [responsible gambling](/responsible-gambling) if price movements are encouraging larger deposits.",
    },
  ],
  faqs: [
    {
      q: "Can SHIB pay for its own Ethereum transfer?",
      a: "Ethereum gas is paid in ETH, so a SHIB balance alone may be insufficient.",
    },
    {
      q: "Which token pays Shibarium gas?",
      a: "The Shiba ecosystem identifies BONE as Shibarium's gas token.",
    },
    {
      q: "Does a 0x address prove the right network?",
      a: "No. EVM networks can use the same address format. Match the receiving service's selected network.",
    },
    {
      q: "Does a cheap SHIB transfer reduce game risk?",
      a: "It only affects payment cost. Token-price exposure and gambling outcomes are separate.",
    },
  ],
  sources: [
    {
      label: "Ethereum.org — Gas and fees",
      url: "https://ethereum.org/en/developers/docs/gas/",
    },
    {
      label: "Shiba Inu — ecosystem and BONE gas token",
      url: "https://shib.io/",
    },
  ],
  related: [
    "ethereum-gambling",
    "gas-fees-explained",
    "how-to-create-a-crypto-wallet",
    "crypto-casino-withdrawals",
    "usdc-casino",
  ],
  updated: "2026-11-26",
  cta: {
    title: "Check the receiving instructions",
    text: "Confirm the SHIB network and its required gas asset before signing a transfer.",
    primary: {
      to: "/how-it-works#wallet",
      label: "Site deposit instructions",
    },
    secondary: {
      to: "/guides/crypto-casino-withdrawals",
      label: "Withdrawal checks",
    },
  },
};
