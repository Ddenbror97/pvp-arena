import type { Guide } from "./types";

export const guide: Guide = {
  slug: "famous-casino-heists",
  cluster: "Casino knowledge",
  keyword: "casino heist",
  secondary: ["casino robbery", "casino skim", "Bellagio robbery", "casino cyberattack"],
  title: "Casino Heists: Skimming, Robbery and Cyber Incidents",
  description:
    "Documented casino thefts and cyber incidents, using archives and company filings. Separate reported losses, criminal allegations and proven proceeds.",
  h1: "Casino heist cases: what the primary records establish",
  answer:
    "A casino heist can mean an armed robbery, insider theft or a digital attack, but those are different events with different evidence. UNLV's Stardust archive documents the skimming era, while MGM and Caesars disclosed separate cybersecurity incidents in 2023. Company impact estimates, stolen cash and exposed personal data should not be treated as the same kind of loss.",
  facts: [
    "The Stardust archive describes an insider-skimming scandal and ensuing prosecutions.",
    "MGM's 2023 filings describe operational and financial effects of a cyber incident.",
    "Caesars' 2023 filing describes unauthorized access to loyalty-program data.",
  ],
  sections: [
    {
      id: "section-1",
      title: "The Stardust: an insider-skimming case",
      body: `UNLV's Stardust collection records the property's corporate history and the scandal around revenue diverted before it entered the official count. The collection description discusses a 1983 federal indictment and subsequent convictions. Read the individuals, allegations and outcomes separately rather than assigning collective guilt to every person associated with the resort.

[Stardust history](/guides/stardust-casino) follows the building and ownership changes. [Casino surveillance](/guides/casino-surveillance) explains why count-room controls and records matter.`,
    },
    {
      id: "section-2",
      title: "MGM: disruption is not the amount stolen",
      body: `MGM's October 2023 Form 8-K estimated a roughly $100 million negative effect on September Adjusted Property EBITDAR across its Strip and regional operations. That is the company's operating-impact estimate, not a statement that criminals stole $100 million in cash. The initial September disclosure also described an investigation and protective system shutdowns.`,
    },
    {
      id: "section-3",
      title: "Caesars: customer data exposure",
      body: `Caesars' September 2023 quarterly filing reports that an unauthorized actor obtained a copy of data including its loyalty-program database after an attack involving an outsourced support vendor. The company described sensitive identification data among the affected records. This was a company disclosure; it does not establish the identity or final legal outcome for every possible offender.`,
    },
    {
      id: "section-4",
      title: "How to compare the record",
      body: `Identify whether a number is a stolen sum, an alleged amount, an accounting impact or a confirmed award of damages. Then identify the record's date and author. A filing supplies evidence of what a company disclosed; an indictment supplies allegations, and a judgment supplies the court's determination.

The [casino cage](/guides/casino-cage) and [marked cards](/guides/marked-cards) concern different controls and conduct. None of these cases makes a casino's size a guarantee of security.`,
    },
  ],
  faqs: [
    {
      q: "Is every casino heist an armed robbery?",
      a: "No. Insider diversion, robbery, fraud and a cyber incident involve different conduct and records.",
    },
    {
      q: "Did MGM say $100 million in cash was stolen?",
      a: "No. Its cited October 2023 filing estimated an effect on Adjusted Property EBITDAR, not a cash theft of that amount.",
    },
    {
      q: "What did Caesars disclose in 2023?",
      a: "Its filing described unauthorized access to data including its loyalty-program database after an attack involving an outsourced support vendor.",
    },
    {
      q: "Does an indictment prove guilt?",
      a: "No. It records allegations. Distinguish an indictment from a conviction or other final judicial outcome.",
    },
  ],
  sources: [
    {
      label: "UNLV: Stardust records and historical description",
      url: "https://special.library.unlv.edu/ark%3A/62930/f1wt0f",
    },
    {
      label: "MGM: October 2023 Form 8-K, incident impact estimate",
      url: "https://www.sec.gov/Archives/edgar/data/789570/000119312523251667/d461062d8k.htm",
    },
    {
      label: "Caesars: quarter ended September 30, 2023, data incident disclosure",
      url: "https://www.sec.gov/Archives/edgar/data/1590895/000159089523000122/czr-20230930.htm",
    },
  ],
  related: [
    "casino-surveillance",
    "past-posting",
    "marked-cards",
    "stardust-casino",
    "history-of-gambling",
  ],
  updated: "2026-11-26",
};
