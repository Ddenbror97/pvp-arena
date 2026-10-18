import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-casino-license",
  cluster: "Foundations",
  keyword: "crypto casino license",
  secondary: [
    "crypto gambling licence",
    "anjouan license",
    "costa rica gambling license",
    "licensed crypto casino",
  ],
  title: "Crypto Casino License: What It Proves and Misses",
  description:
    "What a crypto casino license proves, what it does not, Curacao versus others, and why a certificate is not a substitute for hashed results.",
  h1: "Crypto casino license: what the paper proves and what it misses",
  answer:
    "A crypto casino license is a permission from a regulator — often offshore — for a named company to offer games of chance. It can prove the operator registered, paid fees and accepted some rules in that jurisdiction. It does not prove each bet was fair, that they will pay you, or that the site is lawful where you live. Curacao is not the same as a UK or Malta licence. A PDF is not a substitute for hashed results you can replay.",
  facts: [
    "A licence is issued to a company for a jurisdiction; it is not a global passport and not a per-spin proof.",
    "Curaçao now routes online gaming through the Curaçao Gaming Authority under the National Ordinance on Games of Chance (LOK).",
    "Anjouan and similar offshore papers are cheaper and thinner than UK, Malta or Isle of Man regimes.",
    "Costa Rica structures are often company or data-processing setups, not a dedicated remote-gambling licence like the UKGC's.",
    "Provably fair commitments prove a result mapping; they do not replace a licence, and a licence does not replace them.",
  ],
  sections: [
    {
      id: "what-it-proves",
      title: "What a crypto casino license actually proves",
      body: `A licence is a document. A regulator looked at an application, took money, and said a company may offer certain games from that place under those rules. That can include a registered entity, a named director, a complaints path, and — in stricter places — audits, bankroll checks and advertising limits.

What it proves on a good day:

- **Someone filed paperwork** in that jurisdiction.
- **A number or seal exists** you can look up on the regulator's site, not only on the casino footer.
- **There may be a dispute channel** that is not the casino's own chat.

What it does not prove:

- The RNG on *this* bet followed the published RTP.
- The hot wallet can cover Friday's withdrawals.
- You are allowed to play from your country.
- The footer seal matches the live domain (seals get copied).
- Taxes you owe. That is between you and your authority. This is not tax advice and not legal advice.

This sits in [foundations](/guides/topics/foundations) with [fake casino sites](/guides/fake-casino-sites): a badge is a claim. Check the claim at the source.

A licensed crypto casino is still a casino. Minus-EV games stay minus-EV.`,
    },
    {
      id: "curacao-vs",
      title: "Curaçao versus Anjouan, Costa Rica and stricter papers",
      body: `Offshore is a spectrum, not a synonym.

### Curaçao

For years "a Curaçao licence" often meant a sublicence under a master holder — a structure that was easy to market and hard for a player to enforce. Curaçao has been moving to a direct Curaçao Gaming Authority (CGA) regime under the Landsverordening op de kansspelen (LOK). The [CGA portal](https://portal.gamingcontrolcuracao.org/page/online-gaming-info) is where applications now go. The [Curaçao gambling license](/guides/curacao-gambling-license) guide is the deep dive. For this page, remember: old sublicence badges and new CGA numbers are not the same artefact. Look up the current record.

### Anjouan license

Anjouan (Comoros) sells a cheaper, faster offshore paper that many crypto brands use when they want a PDF and a number. Payment processors and game studios treat it as weaker than Malta or the UK. A footer that only says Anjouan is information, not comfort.

### Costa Rica gambling license

Costa Rica is widely used for companies that process data or hold software. It is not a UK-style remote-gambling licence. If the only claim is "Costa Rica corporation," you may be looking at a company registration, not a gaming permission. Ask which statute authorises *taking bets*.

### Stricter regimes

UK Gambling Commission, Malta Gaming Authority, Isle of Man, Gibraltar and similar shops are heavier: cheaper to fake on a graphic, harder to fake in a register. They still do not hash your roulette spin.

Compare seals by opening the **regulator's** search, not the casino's PNG.

Master-and-sublicence structures, where they still exist or linger in old footers, mean the company you sent coins to may not be the company the regulator last reviewed. If the seal names a holder you cannot match to the terms, you do not have a lookup. You have a sticker.`,
    },
    {
      id: "complaints",
      title: "What a complaint can do — and what it cannot",
      body: `Players talk about licences as insurance. Sometimes a regulator will lean on an operator over an unpaid withdrawal. Sometimes they will revoke a licence after a pattern of complaints. That is real, and it is slower and narrower than people hope.

A complaint usually cannot:

- Reverse a settled bet you now dislike.
- Force a US hot wallet to refill if the money is gone.
- Make an Anjouan or Curaçao paper override a geo-ban in your country.
- Turn an opaque slot into a hashed one after the fact.
- Recover funds from a clone domain that stole a real seal.

A complaint can, in a functioning regime:

- Create a paper trail the operator has to answer.
- Feed a pattern that leads to conditions or revocation.
- In stricter shops, trigger reviews of bankroll or advertising.

UKGC-scale complaints are a different sport from emailing a generic Curaçao inbox. Do not import UK expectations onto a $50 crypto skin with an Anjouan number.

If the site's only dispute path is a Telegram admin, you do not have a regulator relationship. You have a group chat. That is the [fake casino sites](/guides/fake-casino-sites) pattern even when a PNG says otherwise.

This is not legal advice and not a promise that any named authority will act on your ticket. It is a map of what the paper is for.`,
    },
    {
      id: "worked-example",
      title: "Worked example: reading a footer in five minutes",
      body: `You open a licensed crypto casino. Footer: "Licensed in Curaçao, licence 1234/JAZ."

| Check | Pass looks like | Fail looks like |
| --- | --- | --- |
| Number on regulator site | Same company + domain | No record, or a different brand |
| Company name | Matches terms and wallet entity | Terms say Ltd A, seal says Ltd B |
| Domain list | This exact URL is listed | Seal is for a sister skin |
| Product scope | Crypto / the games you play are in scope | Licence is sports only |
| Complaints | Regulator form exists | "Contact us on Telegram" only |

Five minutes is enough to catch a stolen PNG. It is not enough to prove solvency. If the lookup fails, you do not need a sixth minute. Leave.

[Are online casinos rigged](/guides/are-online-casinos-rigged) covers the other half: even a real licence can sit on a site that still uses an opaque RNG.`,
    },
    {
      id: "not-hashed",
      title: "Why a certificate is not a substitute for hashed results",
      body: `Labs certify generators. Regulators license companies. Neither automatically publishes a per-round commitment you can replay.

A [provably fair casino](/guides/provably-fair-casino) shows a hash before the bet and a seed after, plus a mapping you can run yourself. That answers "was this outcome the one the recipe produces?" It does not answer "will they still be here in a month?" or "may I play from Texas?"

A licence answers (partly) "are they a known company under this law?" It does not answer the spin.

You want both when you can get both. If you can only get one, know which question you are leaving open.

- **Licence only:** you might have a complaint form and an opaque slot.
- **Hash only:** you can check the draw and still be paid late, or not at all, by a nameless hot wallet.
- **Neither:** you are in a Telegram PDF.

A lab certificate on an RNG is a third artefact. It says a sample of output looked unbiased in a test last year. It does not bind today's server, and it does not name your payout wallet. People paste all three — licence, lab, hash — into one sentence. Keep them apart.

PVPspinArena publishes fairness so you can check Jackpot, Coinflip and Roulette. Open [fairness](/fairness). A footer seal would not replace that page, and that page does not replace your local law.`,
    },
    {
      id: "player-duties",
      title: "What you still have to check — including your own country",
      body: `The licence is about their permission *there*. Your permission is about *here*.

1. **Look up the seal** on the regulator site.
2. **Read whether your country is excluded** in their terms. Many offshore casinos ban the US, UK or both.
3. **Do not treat crypto as a veil.** A blockchain deposit does not rewrite the statute where you sit.
4. **Separate tax from licence.** Wins can be taxable where you live even if the site is offshore. Not tax advice.
5. **Age.** 18+ or the higher local age. A licence does not admit minors.

If you cannot legally play, a prettier CGA number does not help. I will not coach you around a geo-ban.

Responsible tools should exist on a serious site. If the only 'protection' is a Twitter reply, that is also information.`,
    },
    {
      id: "this-site",
      title: "How to use this information on PVPspinArena",
      body: `PVPspinArena is player-versus-player Jackpot and Coinflip plus a coloured Roulette wheel. The chip is USDC and ETH on Base. We are not a bingo hall, horse book, NFT pit or Telegram bot.

Read the [terms](/terms) for the legal wrapper we actually publish. Use the verifier for the math wrapper. If a stranger DMs a 'licence update' and a new deposit address, that is a clone, not a regulator.

A future licence page, if we add one, will be a lookup you can repeat — not a gold badge in a screenshot. Until you can repeat a lookup, treat marketing as marketing.

Hashed results on Jackpot, Coinflip and Roulette answer the spin. They do not answer whether you are allowed to play from your chair. Do not treat a commit-reveal as a permission slip. Do not treat a permission slip as a commit-reveal. Adults keep those files in different folders.

If you need a responsible-gambling stop, the licence footer will not provide it. Use the [responsible gambling](/responsible-gambling) page and the tools where you live.`,
    },
    {
      id: "summary",
      title: "Paper answers one question. The hash answers another",
      body: `A crypto casino license can prove a company registered with a named regulator. Curaçao's CGA/LOK era is not the old sublicence sticker. Anjouan is thinner. Costa Rica is often not a gaming licence at all. None of those PDFs replay a seed.

Check the register, check your law, check the commit-reveal. PVPspinArena asks you to check the round. It does not ask you to confuse a certificate with a result.

If a brand will not give you a number you can paste into a regulator search, the conversation is over. A gold frame around the word Licensed is not a lookup. It is clip art. If you cannot repeat the lookup next month, you never had a licence in your notes. You had an ad.

A footer badge still has to match a register. The [Malta Gaming Authority licence](/guides/malta-gaming-authority-license) is a real Maltese permission, not a passport into the UK or the US. [AML in gambling](/guides/aml-gambling) is why a licensed cashier asks who you are.`,
    },
  ],
  faqs: [
    {
      q: "What does a crypto casino license prove?",
      a: "That a company obtained permission from that regulator to offer certain games under that law. It does not prove your individual bets or your local legality.",
    },
    {
      q: "Is a Curaçao licence the same as a UK licence?",
      a: "No. The UKGC regime is heavier. Curaçao has been shifting from sublicences to CGA licences under the LOK. Always look up the current record.",
    },
    {
      q: "Is an Anjouan license 'real'?",
      a: "It is a real offshore paper from that authority. It is not equivalent to Malta or the UK in player protection or industry acceptance.",
    },
    {
      q: "Does Costa Rica issue a gambling licence like the UKGC?",
      a: "Usually you are looking at a company or processing setup, not a UK-style remote-gambling licence. Ask which law authorises taking bets.",
    },
    {
      q: "Can a licence replace provably fair?",
      a: "No. A licence is about the company. A hash is about the result. You can have one, the other, both or neither.",
    },
    {
      q: "Is this legal advice?",
      a: "No. Licensing and whether you may play depend on your country and the site's terms. Ask a qualified lawyer for advice about your situation.",
    },
  ],
  sources: [
    {
      label: "Curaçao Gaming Authority — online gaming info",
      url: "https://portal.gamingcontrolcuracao.org/page/online-gaming-info",
    },
    { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/" },
    { label: "Malta Gaming Authority", url: "https://www.mga.org.mt/" },
    { label: "Curaçao Gaming Authority portal (CGA)", url: "https://portal.cga.cw/" },
  ],
  related: [
    "what-is-a-crypto-casino",
    "proof-of-reserves",
    "fake-casino-sites",
    "no-kyc-casino",
    "anonymous-casino",
    "crypto-casino-usa",
    "anjouan-gaming-license",
    "kahnawake-gaming-license",
    "crypto-casino-australia",
    "is-crypto-gambling-legal",
    "how-to-start-an-online-casino",
    "aml-gambling",
  ],
  updated: "2026-09-26",
};
