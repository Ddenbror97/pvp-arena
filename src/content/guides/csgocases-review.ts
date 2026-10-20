import type { Guide } from "./types";

export const guide: Guide = {
  slug: "csgocases-review",
  cluster: "CS:GO heritage",
  keyword: "csgocases",
  secondary: ["csgocases promo code", "is csgocases legit", "csgocases odds"],
  title: "CSGOCases Review: Challenge Page, No Odds",
  description:
    "CSGOCases on 20 October 2026 returned a Cloudflare challenge, HTTP 403. Odds, a promo code, a licence number, and a cash-out clock are not published.",
  h1: "CSGOCases returned a challenge page, not a case sheet",
  answer:
    "CSGOCases, requested at the brand domain on 20 October 2026, returned Cloudflare's challenge page and HTTP 403. The body was the line Just a moment, not a case list, a promo code, or odds. A licence number and a withdrawal clock are not published. We did not open an account or send a skin.",
  facts: [
    "Last tested 20 October 2026. The homepage, /terms, and /tos each returned HTTP 403 with a Cloudflare challenge titled Just a moment.",
    "No promo code, drop table, licence number, or cash-out clock was on the HTML that arrived.",
    "The challenge page set robots to noindex,nofollow. That is Cloudflare's interstitial, not an operator policy we could read.",
    "Valve's 9 December 2015 trading post still explains holds on Steam items. A 2026 hold length is not copied from a case site that did not load.",
    "This site does not sell skins. Two $50 Coinflip stakes make a $100 pot, the fee is $5, and the winner is paid $95.",
  ],
  sections: [
    {
      id: "request",
      title: "What the csgocases request actually returned",
      body: `Opened 20 October 2026. The first response was HTTP 403. The HTML title was Just a moment. The visible instruction was to enable JavaScript and cookies. The page also carried a Cloudflare challenge script and a robots meta of noindex,nofollow.

That is not a lobby. A legit check needs a company name, a terms file, and a drop list. None of those strings were in the HTML we saved. The word csgocases appears in the host we typed. It does not appear as a published odds table.

The same 403 came back for /terms and for /tos. A missing terms path is not the same as a terms path that loaded and said nothing. Here the path never rendered.

You are in [CS:GO heritage](/guides/topics/csgo-heritage). Adults 18+ only. A skin is not a wage.`,
    },
    {
      id: "legit",
      title: "A challenge page cannot answer is csgocases legit",
      body: `Legit, on this site, means a document you can open: a company, a licence number you can paste into a register, and a cashier rule. The challenge page names Cloudflare, not an operator. So the legit question stays open.

[How lookalike lobbies are spotted](/guides/fake-casino-sites) is the habit of typing the host yourself. A chat link that skips the challenge and asks for a trade is a different risk. Do not treat a DM as the site that 403'd.

We did not create an account, did not connect Steam, and did not send an item. A review that claims a withdrawal time without a timed cash-out is inventing one. This page will not do that.

Three cons follow from the pages that failed. First, the operator text did not load. Second, no public promo code was printed. Third, no odds sheet was printed, so a fairness claim cannot be checked.`,
    },
    {
      id: "code",
      title: "No csgocases promo code was on the page",
      body: `A promo code is a string the operator prints, with a roll and an expiry. The challenge HTML has no such string. A code from a forum, a clip, or an affiliate box is not on the page we opened, so it is not printed here.

If a later visit shows a code inside an account, that code belongs to that visit. Date it. Do not paste it backward onto 20 October 2026.

Bonus terms are not published. There is no match percent, no wagering multiple, and no list of games that count. A scorecard cell that says unpublished is the honest cell.

[A case with a published drop list](/guides/csgo-case-opening) is a different object. Official case odds, where Valve prints them, are not this domain's odds. Do not import a Valve percent into a host that did not render.`,
    },
    {
      id: "odds",
      title: "CSGOCases odds stay unpublished until a sheet loads",
      body: `Odds are a list: each item, a weight, and a price if the site sells the open. The challenge page has none of those rows. Writing a house edge from memory would be a guess. The cell says not published.

Provably fair, for a skin case, would be a seed you can recompute after the open. No seed page loaded. A badge in a video is not that seed.

[Checking a committed seed](/guides/provably-fair-casino) is how a hashed dollar round is audited. A Steam trade is not that audit. Different confirmations.

Support is not published. There was no email, no chat hours, and no complaint address in the 403 HTML. A reply time is not published because we did not file a ticket on a page that never opened.`,
    },
    {
      id: "skins",
      title: "Skin withdrawal and Valve's hold, kept separate",
      body: `Valve's post of 9 December 2015 says that without a mobile authenticator enabled for at least 7 days and trade confirmations on, items can be held up to 3 days, or up to 1 day if the accounts have been friends for at least a year. Community Market purchases cannot be traded for 7 days in that same post.

That post is about Steam. It is not a cash-out clock for this brand. The brand clock is not published.

[Selling a skin on a marketplace you typed](/guides/skin-cashout-guide) is a different path from depositing into a case site. A marketplace bid is not a case drop.

[A bot that asks you to send items first](/guides/csgo-trade-bot) is the impersonation risk. Confirming the wrong offer can lose the item you meant to keep. This review does not teach that trade.

The sibling host that redirected on the same day is [the polygon domain that now points elsewhere](/guides/csgopolygon-review). Do not paste this 403 onto that redirect, or the reverse.

A second visit, if you make one, should be the same host typed again. csgocases on a lookalike spelling is not this test. csgocases inside a Steam inventory name is not this test either. The only csgocases page this review stands on is the one that returned Just a moment.

If the challenge clears later, the next note needs a company name before any skin moves. Until that name exists, csgocases remains a host we could not read, not a cashier we priced.`,
    },
    {
      id: "table",
      title: "Scorecard when the csgocases lobby did not render",
      body: `Example A. Someone quotes a 90% return for csgocases. The quote is not on the page we saved. The return stays not published. A $10 open at an invented 90% is not a calculation this page will print.

Example B. Two $50 Coinflip stakes on PVPspinArena make a $100 pot. The fee is $5. The winner is paid $95. That fee is ours. It is not a case price.

Example C. A chat offers a code that "unlocks" a withdrawal. No code was on the challenge page. Treating the chat code as published would invent a bonus.

| | This case host | A house-banked casino | PVPspinArena |
| --- | --- | --- | --- |
| Fee or edge | not published | A posted edge on the game | 5% of a Coinflip or Jackpot pot |
| Who you play | not published | The house | Another player |
| Payout speed | not published | not one number | $20 minimum cash-out |
| Provably fair | no seed page loaded | Usually no | Yes, on our games |
| Minimum bet | not published | not one number | $1 Coinflip |

| Check | What 20 October 2026 showed |
| --- | --- |
| HTTP status | 403 on the homepage, /terms, and /tos |
| Visible title | Just a moment |
| Promo code | not published |
| Odds | not published |
| Licence number | not published |
| Cash-out clock | not published |

[Coinflip](/coinflip) shows the 5% cut before you match. [Fairness](/fairness) recomputes the bit. Neither check covers a skin case that did not load. The figures are also in the [terms](/terms).`,
    },
    {
      id: "who",
      title: "Who should not treat the challenge as a cashier",
      body: `Not for anyone who needs a licence number today. Not for anyone who will deposit a skin because a clip named the brand. Not for anyone under 18.

The United States does not get a permission slip from a page that did not name a regulator. Local law still applies. This is not legal advice.

[Responsible gambling](/responsible-gambling). Call 1-800-GAMBLER in the US and Canada if the session is no longer a hobby. A failed page load is a reason to stop, not a reason to try a mirror from a chat.

IRS Topic 419 still treats gambling winnings as income when they are income. A skin you cannot price from a loaded page is not a number we will invent for a tax line.

csgocases stays unpublished on every cashier cell until a later request returns more than a challenge. That sentence is the whole update rule.`,
    },
    {
      id: "again",
      title: "What a later csgocases visit still has to show",
      body: `A challenge can clear. The next page still has to earn the review. csgocases would need a company name, a terms URL that is not a 403, and a drop table before any percent is written down.

Until those three exist, leave the scorecard blank. A screenshot of a spinner is not a terms file. A balance in a video is not a withdrawal we timed.

Write the date on the note. 20 October 2026 is this test. A different day can replace it only by opening the host again, not by remembering this paragraph.`,
    },
    {
      id: "check",
      title: "Checklist before you look for csgocases again",
      body: `Stop if a line fails. Do not "fix" a 403 by following a chat link.

- [ ] I typed the host myself. I did not follow a DM.
- [ ] The page that loads is not only Just a moment.
- [ ] A company name and a terms file are visible before I connect Steam.
- [ ] A promo code, if any, is on that operator page, not in a forum.
- [ ] Odds are a table I can read, or I leave them unpublished.
- [ ] No one claiming support has asked for a Steam Guard code.
- [ ] I am not treating a trade hold from 2015 as this site's cash-out clock.
- [ ] The skin is spare. Rent is not the stake.
- [ ] I know this review did not time a withdrawal.
- [ ] If the spending is hard to stop, I use 1-800-GAMBLER.

Fees: not published. Payout speed: not published. Fairness proof: not published. Licensing: not published. Support: not published. Bonus terms: not published. That is the scorecard until a real page loads.`,
    },
  ],
  faqs: [
    {
      q: "Is CSGOCases legit?",
      a: "The pages we requested on 20 October 2026 did not answer that. The homepage, /terms, and /tos returned HTTP 403 and a Cloudflare challenge titled Just a moment. No company name, licence number, or terms file was in that HTML. A legit label needs a document. This visit did not get one. We did not open an account.",
    },
    {
      q: "Is there a CSGOCases promo code?",
      a: "No code was printed on the challenge page. A string from a video, a forum, or a chat is not a code we opened on the operator's site. Bonus terms, including any wagering multiple, are not published. If an account later shows a code, date that screen. Do not treat it as the page from this test.",
    },
    {
      q: "Are CSGOCases odds provably fair?",
      a: "Odds were not on the HTML we saved, so they are not published. A provably fair case would show a seed you can recompute after the open. No seed page loaded. A fair badge in a clip is not that check. Do not borrow a drop percent from a different case.",
    },
    {
      q: "How do you withdraw skins?",
      a: "A withdrawal clock for this brand is not published, because the cashier never rendered. Valve's 9 December 2015 post describes Steam holds of up to 3 days, or up to 1 day for long-time friends, when the mobile authenticator rules in that post are not met. That post is not this brand's payout promise. We did not send a skin.",
    },
    {
      q: "Did the site shut down?",
      a: "The test does not prove a shutdown. It proves that three URLs returned a Cloudflare challenge and HTTP 403 on 20 October 2026. A later visit could load a lobby. Until it does, odds, a licence, and a cash-out time stay unpublished. Do not fill the gap with a mirror from a message.",
    },
    {
      q: "How does this compare with a PvP pot?",
      a: "A case site, when it loads, prices you against a drop list. This one did not load, so the edge is not published. A Coinflip on PVPspinArena is two stakes and a 5% pot fee. Two $50 stakes make a $100 pot, the fee is $5, and the winner receives $95. You can recompute that bit on the fairness page. That check does not audit a skin case.",
    },
  ],
  sources: [
    {
      label: "CSGOCases homepage, HTTP 403 Cloudflare challenge, 20 October 2026",
      url: "https://csgocases.com/",
    },
    {
      label: "CSGOCases /terms, HTTP 403, 20 October 2026",
      url: "https://csgocases.com/terms",
    },
    {
      label: "Valve, Security and Trading, 9 December 2015",
      url: "https://store.steampowered.com/news/19618/",
    },
    {
      label: "IRS Topic 419, gambling income and losses",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
  ],
  related: [
    "csgopolygon-review",
    "csgo-case-opening",
    "skin-cashout-guide",
    "fake-casino-sites",
    "csgo-trade-bot",
    "provably-fair-casino",
  ],
  updated: "2026-10-20",
};
