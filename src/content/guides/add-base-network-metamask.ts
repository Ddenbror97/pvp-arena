import type { Guide } from "./types";

export const guide: Guide = {
  slug: "add-base-network-metamask",
  cluster: "Crypto payments",
  keyword: "add base to metamask",
  secondary: ["base network metamask", "base chain id", "base rpc url", "switch to base network"],
  title: "How to Add Base to MetaMask: Settings and Steps",
  description:
    "Add Base to MetaMask in minutes: the official network settings, chain ID 8453, RPC URL and explorer, plus how to add USDC and fix common network errors.",
  h1: "How to add Base to MetaMask",
  answer:
    "To add Base to MetaMask, open the network menu, choose to add a network and select Base from the list of popular networks, or enter it manually: network name Base, RPC URL https://mainnet.base.org, chain ID 8453, currency symbol ETH and block explorer https://basescan.org. Then switch to Base before sending or receiving funds.",
  facts: [
    "Base is an Ethereum layer-2 network built by Coinbase on the OP Stack.",
    "Base mainnet uses chain ID 8453 and ETH as its gas token.",
    "Your MetaMask address is the same on Ethereum and Base, but balances are separate.",
    "PVPspinArena accepts USDC and ETH on Base mainnet, plus on-chain Bitcoin.",
    "Only add networks using official settings; fake RPCs can show false balances.",
  ],
  sections: [
    {
      id: "what-is",
      title: "What is Base and why add it?",
      body: "Base is a layer-2 blockchain built on top of Ethereum. It was launched by Coinbase in 2023 and uses the OP Stack, the same open-source technology behind Optimism. Transactions are processed on Base and then posted back to Ethereum, which gives Base much lower fees while inheriting security from Ethereum.\n\nBecause Base is compatible with Ethereum, it uses the same address format. Your MetaMask address works on both, but each network keeps its own balances. USDC on Ethereum and USDC on Base are separate, and you only see Base balances when MetaMask is switched to Base.\n\nYou need Base in MetaMask if you want to:\n\n- Receive USDC or ETH withdrawn from an exchange on Base.\n- Deposit to sites that accept Base, such as PVPspinArena.\n- Pay the low network fees Base is known for.\n\nMetaMask includes Ethereum by default but may not show Base until you add it. If you are new to MetaMask, start with our [MetaMask casino guide](/guides/metamask-casino).",
    },
    {
      id: "settings",
      title: "Base network settings",
      body: "These are the official Base mainnet settings published in the Base documentation.\n\n- **Network name**: Base\n- **RPC URL**: https://mainnet.base.org\n- **Chain ID**: 8453\n- **Currency symbol**: ETH\n- **Block explorer URL**: https://basescan.org\n\n### Chain ID matters most\n\nThe chain ID is how wallets and apps tell networks apart. If the chain ID is not 8453, it is not Base mainnet. Base Sepolia, a test network, uses chain ID 84532. Test networks use tokens with no real value, so make sure you are on mainnet for real funds.\n\n### About the RPC URL\n\nThe RPC URL is the server MetaMask uses to read the blockchain and send transactions. The public Base RPC is fine for everyday use but can be rate-limited at busy times. Reputable infrastructure providers also offer Base RPC URLs. Never use an RPC URL from an unknown source, because a malicious RPC can show wrong balances or track your activity.\n\nAlways compare these values against the [Base documentation](https://docs.base.org/chain/network-information) if in doubt.",
    },
    {
      id: "one-click",
      title: "Method 1: add Base from MetaMask's list",
      body: 'Recent versions of MetaMask include Base in a list of popular networks. This is the easiest and safest method because the settings are built in.\n\n1. **Open MetaMask** and unlock it.\n2. **Click the network selector** at the top left. It usually shows Ethereum Mainnet.\n3. **Choose "Add network"** or look for a section of popular or additional networks.\n4. **Find Base** in the list and click Add.\n5. **Review the details** in the pop-up. Check that the chain ID is 8453.\n6. **Approve.** MetaMask adds Base to your networks.\n7. **Switch to Base** from the network selector.\n\n### On mobile\n\nIn the MetaMask mobile app, tap the network name at the top of the wallet screen, then tap Add network and select Base from the popular list. The steps are the same.\n\n### From a trusted site\n\nSome sites offer an "Add Base" or "Switch network" button that asks MetaMask to add the network for you. MetaMask shows the details before anything changes. Always check the chain ID and only accept this from sites you trust, such as the official Base website or a well-known block explorer.',
    },
    {
      id: "manual",
      title: "Method 2: add Base manually",
      body: 'If Base does not appear in the list, you can enter the settings yourself.\n\n1. **Open MetaMask** and click the network selector.\n2. **Choose "Add network"**, then "Add a network manually" or "Add custom network".\n3. **Enter the network name**: Base.\n4. **Enter the RPC URL**: https://mainnet.base.org.\n5. **Enter the chain ID**: 8453. MetaMask checks this against the RPC and warns if it does not match.\n6. **Enter the currency symbol**: ETH.\n7. **Enter the block explorer URL**: https://basescan.org.\n8. **Save**, then switch to Base.\n\n### If MetaMask shows a warning\n\nMetaMask compares your entries with known network lists. If the chain ID does not match the RPC, or the symbol differs from what MetaMask expects, it shows a warning. Stop and check your entries. A warning is often a typing mistake, but it can also mean the RPC is not what it claims to be.\n\n### Edit or remove later\n\nYou can edit or delete networks in MetaMask\'s settings under Networks. Removing a network does not delete your funds; it only hides that network until you add it again.',
    },
    {
      id: "usdc",
      title: "Adding USDC on Base to MetaMask",
      body: "After adding Base, MetaMask shows your ETH balance on Base automatically. USDC may need to be added so it appears in your token list.\n\n### Using MetaMask's token search\n\n1. Switch to Base.\n2. Scroll to the tokens list and choose \"Import tokens\".\n3. Search for USDC and select the entry for Base.\n4. Confirm the import.\n\n### Using the contract address\n\nIf the search does not find it, import the token using its contract address. Copy the official USDC contract address for Base from Circle's published list of USDC contract addresses, not from social media or search ads. Paste it in the custom token field and MetaMask fills in the symbol and decimals.\n\n### Beware of fake tokens\n\nScammers create tokens called USDC with fake contracts and send them to random wallets. They may show a balance but have no value. Only trust the USDC contract published by Circle. If you see a token you did not buy, do not interact with it or visit any site it mentions.\n\nOur [how to buy USDC guide](/guides/how-to-buy-usdc) shows how to get USDC onto Base in the first place.",
    },
    {
      id: "gas",
      title: "Getting ETH on Base for gas",
      body: "Every transaction on Base, including sending USDC, needs a small fee paid in ETH on Base. If your ETH balance on Base is zero, MetaMask cannot send your USDC.\n\n### How much\n\nFees are usually a fraction of a cent to a few cents. A small amount of ETH covers many transfers. Keep a little extra for busy periods.\n\n### Where to get it\n\n- **Exchange withdrawal.** Buy ETH on an exchange and withdraw it choosing the Base network.\n- **Bridge from Ethereum.** The official Base bridge and other bridges can move ETH from Ethereum to Base. Bridging from Ethereum costs an Ethereum mainnet fee, which is higher.\n- **In-wallet purchase.** MetaMask's buy option can deliver ETH directly on Base.\n\n### A common mix-up\n\nETH on Ethereum mainnet is not the same as ETH on Base, even though both show as ETH in the same wallet. Switch to Base and check the balance there before sending.",
    },
    {
      id: "using",
      title: "Using Base with PVPspinArena",
      body: "PVPspinArena accepts deposits on Base mainnet only. Once Base is added, you can fund your account in a few steps.\n\n1. **Verify your wallet.** On your profile, connect MetaMask and sign a free message. This proves you own the address.\n2. **Switch MetaMask to Base.** Check that chain ID 8453 is active.\n3. **Copy the deposit address** from the wallet page.\n4. **Send USDC or ETH** from your verified account.\n5. **Wait for confirmations.** Deposits are credited once safely confirmed and checked by two independent providers.\n\n### If a deposit does not arrive\n\n- Check you sent on Base, not Ethereum.\n- Look up the transaction on basescan.org using the hash from MetaMask.\n- Make sure you sent from the verified address.\n\nBase's low fees make small deposits practical, which also makes it easier to stick to a planned [gambling budget](/guides/gambling-budget) by depositing per session. Our [USDC casino guide](/guides/usdc-casino) explains each step of the deposit process.",
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting Base in MetaMask",
      body: 'Most network problems have simple fixes.\n\n- **"Chain ID returned by the RPC does not match"**: re-enter the chain ID as 8453 and the RPC as https://mainnet.base.org.\n- **Balance shows zero after a withdrawal**: switch to Base. Check the transaction on basescan.org. If it arrived, add USDC to your token list.\n- **"Insufficient funds for gas"**: add a little ETH on Base.\n- **Transaction pending for a long time**: use MetaMask\'s speed-up option, or wait. Base blocks are produced about every two seconds, so long delays are unusual.\n- **RPC errors or slow loading**: the public RPC may be busy. Try again later or switch to a reputable provider\'s Base RPC.\n- **Base appears twice**: delete the duplicate in settings. Keep the one with chain ID 8453.\n- **Sent on Base Sepolia by mistake**: test networks have no real value. Real funds need Base mainnet.\n\nIf funds appear on the explorer but not in the app you are using, contact that site\'s support with the transaction hash.',
    },
    {
      id: "next",
      title: "Checking your setup",
      body: "Before you move real money, run a quick check that everything is correct. Open MetaMask, switch to Base and confirm the network name reads Base and that the chain ID in the network settings is 8453. Then look up your own address on basescan.org: you should see the same ETH and USDC balances that MetaMask shows. If the two disagree, your RPC settings may be wrong, so re-enter the official values.\n\nNext, send a very small amount, such as one dollar of USDC, between two of your own accounts or from an exchange. Watching it arrive teaches you what a normal Base transfer looks like and how quickly it confirms.\n\nWhen you are ready to play, read [how it works](/how-it-works) for an overview of deposits and balances on PVPspinArena, and visit the [Fairness page](/fairness) to see how every game result can be checked in your browser. Both pages explain what happens after your USDC leaves MetaMask.",
    },
    {
      id: "summary",
      title: "Summary",
      body: "To add Base to MetaMask, select it from the popular networks list or enter the settings manually: name Base, RPC https://mainnet.base.org, chain ID 8453, symbol ETH and explorer https://basescan.org. Then switch to Base to see and send balances there.\n\nImport USDC using MetaMask's token search or Circle's official contract address, and keep a little ETH on Base for fees. Your address is the same on every network, but balances are not, so always check the network before sending.\n\nWith Base set up, you can deposit to PVPspinArena from your verified wallet and play games like [crypto jackpot](/guides/crypto-jackpot) with low fees.\n\nMore crypto payments reading lives in our [Crypto payments guides](/guides/topics/crypto-payments).",
    },
  ],
  faqs: [
    {
      q: "What is the Base chain ID?",
      a: "Base mainnet uses chain ID 8453. The Base Sepolia test network uses 84532 and its tokens have no real value.",
    },
    {
      q: "What is the RPC URL for Base?",
      a: "The official public RPC URL is https://mainnet.base.org. Reputable infrastructure providers also offer Base RPC URLs if the public one is busy.",
    },
    {
      q: "Is my MetaMask address different on Base?",
      a: "No. The same address works on Ethereum and Base, but balances are separate, so switch to Base to see funds sent on Base.",
    },
    {
      q: "Why can I not see my USDC on Base?",
      a: "MetaMask may need USDC added to the token list. Switch to Base and import USDC from the search list or with Circle's official contract address.",
    },
    {
      q: "Does PVPspinArena support networks other than Base?",
      a: "No. PVPspinArena accepts USDC and ETH on Base mainnet, plus on-chain Bitcoin. Funds sent on other networks will not be credited.",
    },
  ],
  sources: [
    {
      label: "Base documentation: network information",
      url: "https://docs.base.org/chain/network-information",
    },
    { label: "MetaMask Help Center: adding networks", url: "https://support.metamask.io/" },
    {
      label: "Circle: USDC contract addresses",
      url: "https://developers.circle.com/stablecoins/usdc-contract-addresses",
    },
    { label: "BaseScan block explorer", url: "https://basescan.org" },
  ],
  related: [
    "usdc-casino",
    "crypto-casino-withdrawals",
    "instant-withdrawal-casino",
    "how-to-buy-usdc",
    "buy-crypto-with-card",
  ],
  updated: "2026-11-26",
  howTo: true,
};
