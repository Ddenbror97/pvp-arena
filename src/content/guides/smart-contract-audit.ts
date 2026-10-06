import type { Guide } from "./types";

export const guide: Guide = {
  slug: "smart-contract-audit",
  cluster: "Provably fair",
  keyword: "smart contract audit",
  secondary: ["Solidity audit report", "smart contract security review"],
  title: "Smart Contract Audit: What the Report Covers",
  h1: "Smart Contract Audit: What the Report Covers",
  description:
    "A smart contract audit is a paid review of code at one commit. Learn what the report can show and what a badge does not promise about a casino.",
  answer:
    "A smart contract audit is a paid review of program code, usually at one recorded commit or one deployed bytecode hash. A firm reads the contracts, looks for bugs that lose funds or break the rules the authors claimed, and writes a report. The report is evidence about that snapshot. It is not a promise that the casino is honest, that the operators will pay you, or that a later upgrade is still safe. If you remember only that boundary, you will read footer badges more calmly.\n\nGambling is for adults 21 and older, and only with money you can afford to lose. An audit does not change the odds. It only tells you something about the code someone was willing to show a reviewer on a given date.",
  facts: [],
  sections: [
    {
      id: "what-the-reviewers-are-paid-to-do",
      title: "What the reviewers are paid to do",
      body: 'The client, often the team that wrote the contracts, hires a security firm or a group of independent reviewers. They agree on a scope: which repositories, which files, which commit, and sometimes which deployed addresses. They agree on a timeline and a price. Reviewers read the code, run tests, and try to break assumptions. The output is a written report that lists findings, usually ranked by severity, plus notes about what the reviewers did not examine.\n\nSeverity labels differ by firm, and a "high" finding at one shop is not a universal unit. Read the definition in that report. A finding might be a way to drain a pool, a way to freeze withdrawals, a math error in a payout, or a smaller issue that wastes fees or confuses an interface. The report may also say the authors fixed some findings and left others in place with a reason. "Audited" does not mean "zero issues." It means "someone wrote down what they found in this snapshot."\n\nThe commit identifier is the heart of the document. Source code changes. A report that names a commit lets you compare that commit to the repository, if the repository is public. A report that names a bytecode hash lets you compare it to what a block explorer shows at the contract address. A report that names neither, and a blog post that only says "we passed an audit," gives you a story without a target. You cannot check a story against a chain.\n\nReviewers are not regulators. They do not license the casino, they do not hold the bankroll, and they do not owe you a payout if the game goes badly. Their duty is defined by the contract with the client. Some firms publish reports. Some deliver them privately and let the client quote a sentence. If you cannot open the report, you do not have the audit. You have a claim that an audit happened.',
    },
    {
      id: "what-a-snapshot-cannot-promise",
      title: "What a snapshot cannot promise",
      body: "Code reviewed on Monday can be replaced on Friday. Many contracts are upgradeable. A proxy keeps a stable address while an admin key points that address at a new implementation. An audit of the old implementation says nothing automatic about the new one. A serious report will say whether upgrade rights exist and who holds them. Your job is to notice that paragraph. A team that can swap the logic can ship a safer fix, and it can also ship a worse program under the same brand.\n\nAdmin keys are a product decision, not a footnote. A contract that lets an owner pause transfers, change fees, or move a treasury is a different risk from a contract that has renounced those powers. The audit can describe the powers. It cannot promise the key holder will stay benevolent. If the key sits in a hot wallet, the review of the Solidity does not review the laptop that holds the key.\n\nOut of scope is where optimistic readers get hurt. Front ends are often out of scope. The website can send your wallet a call the audited contract never intended, or it can point at a different address than the one in the report. Oracles, bridges, and token contracts owned by other teams are often out of scope. Economic questions, such as whether the game is a good bet, are often out of scope. A clean security review of a betting contract does not make the bet positive expectation.\n\nDeployment can diverge from the repository. The team might deploy a modified bytecode, or deploy the audited code and then upgrade it. Checking the explorer against the hash in the report is the step that catches that. If you do not know how to read bytecode, you can still ask the site for the address, the hash, and the report, and you can refuse to treat a missing answer as a pass.\n\nTime passes. Dependencies get hacked. Compilers change. A report from years ago, aimed at a contract that has been edited monthly, is a historical document. Look at the date. Look at the version. Do not let a badge designed once keep working forever in your head.",
    },
    {
      id: "audits-casinos-and-other-kinds-of-review",
      title: "Audits, casinos, and other kinds of review",
      body: "A [smart contract casino](/guides/smart-contract-casino) is a product that settles bets in contracts. If that is the claim, a contract audit is one of the documents that should exist, and it still is not the whole claim. Randomness may come from an oracle or a commit-reveal scheme the report mentions and does not fully prove for every future bet. The bankroll may sit in the contract or in an address an admin controls. Read which one the report describes. Then read whether you can verify a single result yourself. Those are different skills.\n\nA fairness lab that tests a random number generator or a stated return percentage is a different product. [Casino fairness audits](/guides/casino-fairness-audits) explains seals, scope, and why a certificate is narrower than marketing. Do not file a Solidity review and a lab seal in the same mental box. One can be present while the other is absent. Neither one is a license, and neither one is a personal proof for the spin you just lost.\n\nHybrid sites make the split sharper. Some operators use contracts for deposits and a private server for the games. An audit of the deposit contract can be real and still say nothing about how the server picks winners. If the games are sold as \"on-chain\" while only the cashier is a contract, the audit's scope will show that, if you read it. If the scope is a vault and the ads are about roulette, you have found the gap.\n\nOff-chain custody is the other gap. A report can say the contract will release funds to a winner and say nothing about whether the company runs a separate hot wallet that can go empty. PVPspinArena offers jackpot, coinflip, and roulette settled in USD. Deposit and payout wallets are separate. This article is not a claim that those games are a particular audited contract, and it is not a map of the site's treasury. If a site you play, including this one, publishes a report, judge that PDF by the commit, the date, and the scope. If it does not publish one, do not invent one from a slogan.",
    },
    {
      id: "how-to-read-the-report-without-a-scoreboard",
      title: "How to read the report without a scoreboard",
      body: "Start at the end and the beginning. The beginning should name the commit or the hash and the files. The end should list findings and whether each one was fixed, acknowledged, or left open. Read the open ones. A critical issue marked fixed should point at a later commit. If you cannot see that later commit, the \"fixed\" line is a statement by the authors, not something you have checked.\n\nIgnore leaderboards that rank audit firms by a made-up safety score. This page will not supply pass rates, average finding counts, or a winner among vendors. Firms differ in style. Some write long threat models. Some specialize in a language or a chain. A famous name on a PDF is not a substitute for the scope section. A less famous name on a PDF that names the exact bytecode can be more useful than a logo with no hash.\n\nWatch for reports that review a library and get quoted as if they reviewed the casino. A token contract's audit is not an audit of the betting contract that uses the token. A wallet's audit is not an audit of the site you connected. The title page has to match the product you are about to fund.\n\nPublic contest reviews, where many researchers look at code for a reward, are another form of paid review. They are still scoped and dated. A contest that ends does not watch the code next month. Treat the contest write-up like a report: what was in bounds, what was found, what changed afterward.\n\nIf you find a mismatch, the practical response is to wait or to walk away. Arguing in a chat about a badge rarely produces the commit hash. Asking once, in writing, for the report link is enough. Silence is information.",
    },
    {
      id: "what-you-still-check-yourself",
      title: "What you still check yourself",
      body: 'An audit does not sign your transaction. Before you send funds to a contract, confirm the address in the project\'s own docs matches the address in your wallet, and prefer an address you have compared to an explorer. Phishing sites quote real audit PDFs and then ask you to sign against a different contract. The PDF cannot see your screen.\n\nKeep position sizes such that a bug you did not understand is a loss you can survive. Reviewers miss things. Clients hide things. Upgrades happen on a weekend. The report reduces some uncertainty about a snapshot. It does not cap your loss at zero.\n\nUse the game\'s own proof system when it has one. A commit-reveal or a published seed check answers "was this result the result the rules produce?" A security audit answers "did these reviewers see a bug in this code?" You want the question that matches your doubt. If your doubt is "will they pay a documented win," look at custody, limits, and history, not only at a code review. If your doubt is "can a stranger drain the pool," the code review is closer to the question, and the admin key section still matters.\n\nStore the PDF or the link with the date you read it. Marketing pages change. A copy you saved is the version you actually judged. When the site announces a new release, look for a new review or accept that you are back to trusting an unread diff.',
    },
    {
      id: "a-badge-is-not-the-engagement",
      title: "A badge is not the engagement",
      body: "Teams buy the review, then buy a graphic. The graphic is easy to copy onto a lookalike domain. The engagement is the scope letter plus the report. When you evaluate a casino, open the report from the auditor's site if they host one, or from a repository commit, not only from the casino's footer image. Match the project name. Match the chain. Match the address. Then decide what you still do not know.\n\nNothing in that process makes gambling safe, legal where you live, or profitable. It makes one technical claim checkable. Leave the claim unchecked and the badge is decoration.\n\nThe rest of this subject is on the [Provably fair guides](/guides/topics/provably-fair). See [smart contract casino](/guides/smart-contract-casino), [casino fairness audits](/guides/casino-fairness-audits), [provably fair casino](/guides/provably-fair-casino). PVPspinArena settles jackpot, coinflip, and roulette in US dollars. Read [fairness checks](/fairness) before you play.",
    },
  ],
  faqs: [
    {
      q: "Does an audit mean the casino is honest?",
      a: "No, an audit is a review of the code that was in scope at one commit, and honesty also depends on admin keys, servers, and whether the deployed code matches the report. A fair game can sit in unaudited code, and an audited contract can still be aimed at a business that refuses withdrawals.",
    },
    {
      q: "Does the audit cover updates shipped later?",
      a: "Not unless a new review covers the new commit or the new bytecode. Upgradeable contracts can change behavior after the report, so the badge on the homepage can outlive the code it described.",
    },
    {
      q: "Is a smart contract audit the same as a fairness lab seal?",
      a: "No, a contract review looks at program logic and security bugs, while a fairness lab typically tests game math or an RNG under its own scope. Those products answer different questions, and the casino fairness audits page covers the lab side.",
    },
    {
      q: "What should I look for in the report?",
      a: "Look for the firm name, the date, the repository or bytecode identifier, the commit or hash, and a statement of what was out of scope. A footer badge with none of those details is an advertisement.",
    },
    {
      q: "Can I rely on the audit for my own bet?",
      a: "You can use it as one input, and you still cannot replay your personal result from the audit PDF. If the game offers a proof you can check, that proof is a separate tool from the security review.",
    },
  ],
  sources: [],
  related: ["smart-contract-casino", "casino-fairness-audits"],
  updated: "2026-09-26",
};
