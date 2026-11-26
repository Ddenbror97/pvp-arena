import type { Guide } from "./types";

export const guide: Guide = {
  slug: "50-50-raffle",
  cluster: "Lottery",
  keyword: "50/50 raffle",
  secondary: ["50/50 raffle rules", "online raffle", "crypto raffle"],
  title: "50/50 Raffle: How It Works, Rules and Online Options",
  description:
    "How a 50/50 raffle works: rules, legal limits, odds per ticket, running one online, and how crypto jackpot pots copy the same player-funded idea.",
  h1: "50/50 raffle: how the split, the odds, and the rules work",
  answer:
    "A 50/50 raffle sells tickets and splits the money, often half to one winner and half to a club, school, or charity. Your chance is about 1 divided by the number of tickets if there is one winner and every ticket counts once. It is not a casino game, and the legal rules depend on where the tickets are sold.",
  facts: [
    "The prize in a classic 50/50 is a share of ticket sales, not a fixed jackpot funded by a sponsor.",
    "With one winner and equal tickets, each ticket’s chance is 1/N.",
    "Buying more tickets raises your chance and also raises the prize, because you added money to the pool.",
    "A crypto jackpot is a different product: win chance equals your stake share, and there is no charity half.",
  ],
  sections: [
    {
      id: "how-the-split-works",
      title: "How a 50/50 raffle actually splits the money",
      body: "Someone sells numbered tickets. At the draw, one number wins. The organization counts the cash, keeps a share, and pays the rest to the holder of that number. When people say 50/50 they usually mean half and half. Some raffles that still use the name pay the winner 40% and keep 60, or they take card fees out before the split. The name is not the contract. The posted rule is the contract.\n\nThe prize grows only because people buy tickets. If nobody buys, there is no pot. That is the part that feels like a player-funded game. It is also the part people romanticize. Half of a small pot is a small prize. Half of a large pot is large because a lot of money was collected, including money from people who will not win.\n\nWrite down four numbers before you call anything a 50/50 raffle: ticket price, expected or final ticket count, the winner’s percentage, and what is deducted before the split. “Half” of the gross is a different prize from “half” of what is left after payment fees. Online sales make that gap obvious. A dollar ticket paid by card might net the organizer 70 cents. If the split is on the net, the winner’s half is 35 cents per ticket sold, not 50.\n\n[Lottery pool agreement](/guides/lottery-pool-agreement) is a different document. That page is about coworkers sharing a lottery ticket. A raffle is the organizer selling chances in the organizer’s own draw. Do not use a pool agreement to run a public raffle, and do not use raffle habits to split a lottery ticket with friends.",
    },
    {
      id: "odds-per-ticket",
      title: "Odds per ticket, with the extra tickets included",
      body: "If one winning number is drawn and every ticket has one unique number, each ticket wins with probability 1/N. Ten tickets, one chance in ten. A thousand tickets, one chance in a thousand. Buying five tickets gives you 5/N, as long as the draw cannot pick you twice for the same prize.\n\nHere is the part that surprises people at a school gym. You buy extra tickets, so your chance goes up, and the prize goes up too because your money joined the pot. Those are not free edges. Example, labeled as an example. Tickets are 2. Right now 100 tickets are sold, prize is half of 200, so 100, and one ticket is 1/100. You buy 10 more. Ticket count is 110. Gross is 220. Winner’s half is 110. Your 10 tickets are 10/110, about 9.1%, of a prize you helped fund. Your expected winner’s share is about 0.091 times 110, which is 10, and you spent 20. You do not “get ahead” by buying more of a 50% split. You buy a larger slice of a prize that is still about half the money.\n\nIf the raffle pays the winner less than half after fees, the expected return per dollar is even lower. The fun, the cause, or the night out is the rest of the purchase. Treat the ticket as spending, not as an investment. Adults only, and only where the draw is allowed.\n\nA [crypto jackpot](/guides/crypto-jackpot) uses a related fraction and a different payout. Your win chance equals your share of the pot, and the winner takes the pot minus a fee rather than half. Do not quote jackpot odds as raffle odds.",
    },
    {
      id: "running-one-online",
      title: "What changes when the raffle is online",
      body: "A paper ticket at a dinner has a stub, a jar, and a room full of witnesses. An online raffle has a payment processor, a list of email addresses, and a draw nobody can see unless you publish the method. The split can still be half. The trust problem is larger.\n\nPractical example. A rec-league hockey team sells 4 tickets at 10 each through a web form. Gross is 400 if 40 people pay. The form takes 3% plus a small fixed fee. Suppose fees land at 20 for the whole sale. If the rules say the winner gets half of gross, the winner is owed 200 and the team must pay that even though only 380 arrived. If the rules say half of net proceeds, the winner gets half of 380, which is 190, and the team keeps 190. Both can be called a 50/50 raffle in casual speech. Only one of them matches “half the money people thought they put in.”\n\nPublish the draw before sales close. A reasonable public method is a committed random seed, or a televised or recorded draw from the sold numbers, with unsold numbers excluded. Drawing from every number you printed, including unsold tickets the organizer still holds, gives the organizer a pile of free chances. That is a different game, and it is a bad one for buyers.",
    },
    {
      id: "legal-limits",
      title: "Check the organizer’s authorization",
      body: "Raffle permissions depend on the organizer, selling location, ticket method and applicable charitable-gaming rules. Before selling entries, check who may run the draw, whether a permit is required, what proceeds may fund, where sales may occur and how the winner must be recorded. Online sales can have additional restrictions. A charity label alone does not answer those questions.",
    },
    {
      id: "checklist-before-you-buy",
      title: "Checklist before you buy a ticket or host a draw",
      body: "Use this list whether the raffle is a fundraiser or a site borrowing the phrase.\n\n- The winner’s percentage is a number, and you know whether it applies to gross or net.\n- Fees are described before you pay.\n- You know N, or you know you will be told N before the draw closes.\n- Unsold numbers cannot win.\n- The draw method is chosen before sales end.\n- You can see the winning number and your own numbers in the same list.\n- The organizer is a real organization you can identify, not a username created yesterday.\n- You can afford to lose the ticket price. The cause, if there is one, is the point of the half you do not get back.\n- You are not treating the ticket as rent money.\n- You have checked the local rule if you are the person selling tickets.\n\nTwo more lived-in cases. A parent buys 5 tickets at a match because the prize board says “50/50” and the jar looks full. Ask what the current pot is and how many tickets are out. A full jar can be last week’s unsold roll. A streamer sells “50/50” entries in chat and pays the winner the full pot minus a 10% cut. That is closer to a jackpot fee than to a charity split. Neither case is dishonest automatically. Both are easy to misread if you only heard the name.",
    },
    {
      id: "what-the-half-is-for",
      title: "What you are really paying for",
      body: "The honest description of a 50/50 raffle is a donation wrapped around a prize. Half, or whatever share the rule keeps, is the cost of the ticket as a contribution. The other half is a prize you probably will not win. If the cause matters to you, the kept half can be worth the purchase even at bad odds. If you only wanted the best chance to turn money into more money, a raffle is a poor tool. The keeper’s share is large on purpose.\n\nDo not chase a growing pot by buying a stack of tickets you cannot afford. The prize rising is your own money and your neighbors’ money. Expected return stays near the winner’s percentage, minus fees, and that percentage is well below 100%.\n\nPlayers who like the “everyone funds one prize” feeling and want a casino version with a public fee should read the jackpot guide and then look at a live round, not invent a raffle inside a group chat. Group-chat raffles are where the stub, the witness, and the license all go missing at once.\n\nNothing here is tax advice either. A prize can be taxable to the winner, and a charitable gift is not automatically deductible because a raffle ticket was called a donation. Ask a tax professional if money changed hands for real. Play and purchases are for adults.\n\nExplore the [lottery topic](/guides/topics/lottery) for related rules and examples.\n\nContinue with [crypto lottery](/guides/crypto-lottery).\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
    },
  ],
  faqs: [
    {
      q: "Is every 50/50 raffle a true half split?",
      a: "No. Some keep more than half, and some take payment fees before they split. Read the percentage and whether it applies to gross sales or net proceeds.",
    },
    {
      q: "What are my odds in a 50/50 raffle?",
      a: "If one winner is drawn and every sold ticket counts once, each ticket is 1/N. Five tickets are 5/N. Unsold tickets should not be in the draw.",
    },
    {
      q: "Does buying more tickets guarantee a profit?",
      a: "No. Extra tickets raise your chance and also add money to the prize pool. On a half split, expected return stays near half your spend before fees.",
    },
    {
      q: "Can I run a 50/50 raffle online from anywhere?",
      a: "No. Raffle and remote-sales permissions depend on the relevant jurisdiction, organizer and permit conditions. Confirm the applicable requirements before selling tickets.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Raffle",
      url: "https://en.wikipedia.org/wiki/Raffle",
    },
    {
      label: "IRS: Tax-exempt organizations and raffles",
      url: "https://www.irs.gov/charities-non-profits/charitable-organizations/tax-exempt-organizations-and-raffle-prizes-reporting-requirements-and-federal-income-tax-withholding",
    },
  ],
  related: ["crypto-lottery", "peer-to-peer-gambling", "lottery-pool-agreement"],
  updated: "2026-11-26",
};
