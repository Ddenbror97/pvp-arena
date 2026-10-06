import type { Guide } from "./types";

export const guide: Guide = {
  slug: "casino-account-verification",
  cluster: "Foundations",
  keyword: "casino account verification",
  secondary: [
    "casino kyc documents",
    "casino identity check",
    "withdrawal verification delay",
    "proof of address casino",
  ],
  title: "Casino Account Verification: KYC, Limits, Delays",
  description:
    "Casino account verification is the KYC check before a cashout. See which documents show up, why delays happen, and what no-KYC does not erase.",
  h1: "Casino account verification: KYC documents, limits, and why cashouts wait",
  answer:
    "Casino account verification is the know-your-customer check a cashier runs before it releases a cashout, and sometimes before it lets a large balance keep growing. The usual papers are a photo ID, a proof of address, and something that ties the payout method to the same person. Delays come from blurry files, names that do not match, and review queues. A no-KYC product is a different signup, and it does not erase the chain, the limits, or the operator’s own rules. Gambling is for adults 18 and older.",
  facts: [
    "KYC means know your customer: the operator matches a person to the account before value leaves.",
    "Typical asks are a government photo ID, a proof of address, and a payment method in the same name.",
    "The cashier’s own screen is the list that counts; this page does not invent a universal form.",
    "A mismatch, an expired ID, or a file the reviewer cannot read is a common reason a withdrawal waits.",
    "Licensed operators in places such as Great Britain face identity conditions in the Gambling Commission’s LCCP.",
    "A no-KYC casino skips the passport upload and still keeps other records, which that guide covers.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What the check is",
      body: `**Casino account verification** is the step where the site asks who you are, in documents, before it treats the balance as ready to leave. The industry name is KYC, know your customer. A cousin phrase is customer due diligence. The point for a player is practical. The account you opened with an email or a wallet may still be a provisional account. The cashout is often where the provisional period ends.

The check belongs to the operator and, behind many operators, to a license or a payment partner. You do not design it, and you do not bargain it down with a screenshot of your balance. You either complete it with real documents that match the account, or you are dealing with a product that never asked, which is a different product. This page describes the document path. It does not describe how to avoid a lawful check, and it will not discuss fake papers at all.

### What verification is for

- Matching the person to the account name.
- Matching the payout method to that same person.
- Giving the operator a file it can keep under its own rules.

Bring the file the cashier named, in color if it asked for color, and keep a copy of the confirmation screen with the time on it. That confirmation is your proof the upload happened. Save it with the request id. The [Foundations topic](/guides/topics/foundations) holds the neighboring definitions, including the anti-money-laundering page. Read the request on your own cashier before you read a generic list.`,
    },
    {
      id: "documents",
      title: "Documents that commonly show up",
      body: `Cashiers differ, so treat this as a map of common asks rather than a form you can assume. A government photo ID is the usual start: a passport, a driver’s license, or a national identity card that is still valid. The name and the date of birth should be the name and date of birth on the account. A proof of address is the usual second ask: a utility bill, a bank statement, or a government letter that shows your name and where you live. The cashier states how recent that paper must be. Use that window. A third ask ties the money rail to you: a card photo with sensitive digits covered as the cashier instructs, a statement for that account, or a wallet address you can show you control.

Some sites add a selfie or a short liveness check so the face matches the ID. Some ask only at a threshold. Some ask everyone before the first withdrawal. The email that says “upload these three things” is the assignment. A blog list that adds a fourth document you were not asked for is noise.

| Common ask | What it is there to show |
| --- | --- |
| Photo ID | The account name matches a real document |
| Proof of address | The person lives where the account says |
| Payment check | The payout rail is in that same name |

Send the file the screen requested, in the format it requested. A photo of a photo, a cropped corner, or a glare across the date of birth is how a readable document becomes an unreadable one.`,
    },
    {
      id: "why-it-waits",
      title: "Why a withdrawal waits",
      body: `A pending cashout can mean the documents are still in a queue. A person, or a vendor the casino hired, compares the files with the account. That comparison takes the time the cashier published. If the site printed a window, the clock you argue about is that window, not a number from a forum. If the window passes with no decision, the next step is a support message that quotes the request id, the time you uploaded, and the amount. One message with those facts is enough to start. A stack of identical messages does not make a reviewer read faster.

The wait is often the verification itself, and it can also be a limit. Daily or monthly cashout caps, a bonus rule, or a manual review above a threshold can hold a payout even after the ID looks fine. Those are policy waits. They still use the cashier’s language. [Casino withdrawal pending](/guides/casino-withdrawal-pending) splits a site that has not approved the payout from a transfer that already has a transaction hash. Verification sits on the first side of that split: no hash yet, because the operator has not released the funds.

### While you wait

- Keep the request id and the upload time.
- Do not open a second withdrawal that duplicates the first.
- Do not send a password or a seed phrase to “speed up” the desk.

Anyone who asks for a seed phrase is not working your ticket. The desk needs the documents it listed and the request id, and that is all.`,
    },
    {
      id: "mismatches",
      title: "Mismatches that restart the clock",
      body: `A mismatch is a difference between the paper and the account, or between the paper and the payout rail. The given name is missing a middle name the ID shows. The address on the bill is an old apartment. The card is in a relative’s name. The ID is expired. The file is a screenshot so small the reviewer cannot read the date. Each of those is a reason to send the request back, and a returned request feels like a delay even though it is a new ask.

Fix the mismatch with a document that already matches. Use the name you can prove. If the account was opened under a nickname or a shortened name, the cashier will usually want the legal name on the ID, and you should expect the account profile to be corrected to that name through the site’s own edit flow. Do not invent a bridge between two identities. This page stops at the honest case: one person, one name, papers that show that name.

### Typical send-backs

- Expired ID, or an ID with the dates cut off.
- Address paper older than the window the cashier named.
- Payout method in a different person’s name.
- Blur, crop, or a filter that hides a corner of the document.

If you cannot produce a matching document, say that to support in plain language and ask what the site’s rule is for a payout you are allowed to cancel. Do not shop for a way to make the papers look aligned.`,
    },
    {
      id: "no-kyc",
      title: "What a no-KYC product does not erase",
      body: `A [no-KYC casino](/guides/no-kyc-casino) is the other product type. Signup is an email or a wallet, and the cashier does not ask for a passport. That absence is the product. It is not a veil. The no-KYC guide is where the limits, the on-chain record, and the login traces of that product are explained. This page will not repeat them. The point of the link is the boundary: if a site never asks for ID, you are reading the wrong checklist, and if a site suddenly asks, you have left the no-KYC brochure and entered this one.

Skipping a passport does not skip a public blockchain, a device log the operator keeps, or a payment partner that runs its own due diligence. It also does not skip the site’s terms. A wallet-only cashier can still freeze a withdrawal under those terms. When that happens, the argument is about the terms and the transaction, not about a document you were never shown.

### Keep the products straight

- Document KYC: this page, and the cashier’s upload list.
- Wallet or email signup without that upload: the no-KYC guide.
- A payout that already has a hash: the pending-withdrawal split, then the crypto payout guide.

PVPspinArena’s [wallet](/wallet) is the signed-in balance, deposits, withdrawals, and ledger. It is not a passport scanner. A fresh document request from another casino stays on that casino’s own site. If you want the description of how this site checks a wallet, use the no-KYC guide rather than expecting an ID form here.`,
    },
    {
      id: "aml",
      title: "Why licensed desks ask at all",
      body: `Identity checks exist because gambling businesses move value, and regimes that license them tell them to know who the value belongs to. The UK Gambling Commission’s Licence Conditions and Codes of Practice include customer identity verification among the conditions on licensed operators. That is a Great Britain license condition, not a description of every site on the internet. In the United States, FinCEN’s Customer Due Diligence rule is a banking rule about identifying customers. A casino, a card processor, or a crypto ramp can surface a similar form because a financial partner must keep a file, even when the logo on the form looks like a game.

[AML gambling](/guides/aml-gambling) is the page for what those programs are for: noticing activity that does not match the story, keeping records, and reporting what the regime requires. It is the operator’s program. It is not a player tactic, and this article will not explain how to structure deposits or how to slip past a check. If a check is wrong about you, the path is the operator’s complaints process and, if you need it, a lawyer. It is not a second set of documents that tell a different story.

### What you can expect from a real desk

- A list of documents, in the cashier, with a stated window.
- A decision that approves, refuses, or asks for a clearer file.
- A record of the request id you can quote later.

A site that asks you to skip its own cashier and send files to a personal messenger account is a different risk. Use the support channel the site publishes.`,
    },
    {
      id: "after-the-check",
      title: "After the documents, the payout is still a payout",
      body: `Clearing verification does not teleport the money. A crypto cashout then follows the path in [crypto casino withdrawals](/guides/crypto-casino-withdrawals): the asset, the network, the address you registered, and the review the site still applies to size or to risk. Read the network on the cashier before you confirm. [Casino withdrawal pending](/guides/casino-withdrawal-pending) remains the split between “the site has not sent it” and “the chain has not confirmed it.” Verification delay is the first of those, and only until the site says the documents are accepted.

Limits can outlive the check. Read the cap in the terms or on the cashier and plan the cashout in pieces if the rules say pieces. The [wallet](/wallet) page, once you are signed in, is where a balance and a ledger for this site are visible. A ledger line is not a KYC approval from some other casino. Keep each site’s request id with that site.

### A short order of operations

- Read the document list on the cashier you are actually using.
- Upload real files that match the account and the payout name.
- Wait out the published window, then ask support with the request id if it passes.
- After approval, follow the withdrawal guide for the rail you chose.

18 and older. A delay is frustrating. A fabricated document is a different category of act, and this page does not help with it. If you do not want a document check, the honest fork is a product that says so up front, described on the no-KYC guide, with the limits that product still has.`,
    },
  ],
  faqs: [
    {
      q: "What is casino account verification?",
      a: "It is the KYC check that matches a person to the account, usually before a cashout. Expect a photo ID and, often, proof of address and a payment method in the same name. The cashier’s list is the one that applies.",
    },
    {
      q: "Why is my withdrawal waiting on documents?",
      a: "The operator has not released the funds yet. A queue, a blurry file, a name mismatch, or a cashout limit can all produce that wait. It is not a blockchain confirmation until a transaction hash exists.",
    },
    {
      q: "What if my ID name and my account name differ?",
      a: "The reviewer will usually send the file back. Correct the account to the legal name through the site’s own flow and upload a clear, unexpired ID. Do not alter the document.",
    },
    {
      q: "Does no-KYC mean no records?",
      a: "No. A no-KYC casino skips the passport upload. It can still keep login records, apply limits, and leave a public trail on a blockchain. That product is covered on the no-KYC guide.",
    },
    {
      q: "Who requires these checks?",
      a: "Licensed operators follow the identity rules of their license. The UK Gambling Commission’s LCCP includes customer identity verification. Banking partners may also apply customer due diligence under rules such as FinCEN’s CDD rule. An unlicensed site may ask anyway, under its own terms.",
    },
  ],
  sources: [
    {
      label: "UK Gambling Commission: Licence conditions and codes of practice",
      url: "https://www.gamblingcommission.gov.uk/licensees-and-businesses/lccp",
    },
    {
      label: "FinCEN: Customer Due Diligence Final Rule",
      url: "https://www.fincen.gov/resources/statutes-and-regulations/cdd-final-rule",
    },
    {
      label: "Wikipedia: Know your customer",
      url: "https://en.wikipedia.org/wiki/Know_your_customer",
    },
  ],
  related: [
    "no-kyc-casino",
    "casino-withdrawal-pending",
    "aml-gambling",
    "crypto-casino-withdrawals",
  ],
  updated: "2026-09-29",
};
