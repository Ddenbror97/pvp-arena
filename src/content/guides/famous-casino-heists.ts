import type { Guide } from "./types";

export const guide: Guide = {
  slug: "famous-casino-heists",
  cluster: "Casino knowledge",
  keyword: "casino heist",
  secondary: [
    "casino robbery",
    "casino skim",
    "Bellagio robbery",
    "casino cyberattack",
  ],
  title: "Famous Casino Heists: 10 Real Robberies and Scams",
  description:
    "The most famous real casino heists and scams, how they worked, how most were caught and what they reveal about modern casino security systems.",
  h1: "Casino heist history: ten public cases, without a blueprint",
  answer:
    "Casino heist, in the broad sense people search for, means a theft or a scam aimed at a casino’s chips, cash, or systems. The public record is not a row of clever getaways. It is a mix of armed robberies, insider skims, cheating cases that courts already decided, and cyber incidents that shut buildings down. This page names ten documented episodes and stops at what was reported or adjudicated. It does not explain how to rob, skim, mark cards, or break into a network. Most of these cases ended in arrests, civil judgments, regulator findings, or a disaster in which people died. Security changes were the aftermath, not a movie ending.",
  facts: [
    "An insider skim of the count is a different crime from an armed robbery.",
    "Chip thefts fail when the chips cannot be cashed.",
    "Cheating cases such as edge-sorting were fought in civil court.",
    "The 2017 Resorts World Manila attack was a mass-casualty crime, not a caper.",
    "The 2023 MGM and Caesars cyber incidents were disclosed by the companies.",
    "Nothing here is a how-to. Surveillance and the cashier’s cage exist to make theft fail.",
  ],
  sections: [
    {
      id: "categories",
      title: "Four kinds of casino theft",
      body: `Casino heist searches mash together crimes that security teams file separately. Armed robbery takes chips or cash by force. Chip theft is often the same idea with a disguise and a plan to cash out later, which is where it breaks. An insider skim steals revenue before it is counted, so the books look a little short every day instead of a lot short once. A cyber incident locks the systems that run the floor, or steals data, without anyone jumping a cage.

The [Casino knowledge](/guides/topics/casino-knowledge) cluster holds the cameras, the cheats, and the history as separate pages. [Casino surveillance](/guides/casino-surveillance) is the camera and the people who watch it. [Past posting](/guides/past-posting) and [marked cards](/guides/marked-cards) are cheating categories, and those pages stay the explainers. This one will not teach the moves.

[Fairness](/fairness) on a hashed game is a different security model: you check a commitment after the result. A cage full of chips cannot be checked that way. It is guarded, filmed, and counted. When that fails, you get one of the cases below.

| Kind | What leaves the building | How cases usually end |
| --- | --- | --- |
| Armed robbery | Chips or cash, by force | Arrest, often quickly |
| Chip theft | Chips the thief must cash | Identified at the cashier |
| Insider skim | Money before the count | Audit and prosecution |
| Cyber outage | Access, data, or uptime | Disclosure, restoration, investigation |`,
    },
    {
      id: "skims",
      title: "1 and 2: the Las Vegas skim era",
      body: `The Stardust in Las Vegas was at the center of a famous skim in the 1970s and early 1980s, tied to the Argent Corporation casinos and later to federal prosecutions. Cash was taken out of the flow before it hit the official count, so the theft looked like a weaker day rather than a stick-up. [Stardust casino](/guides/stardust-casino) is the place for the building’s story. Here the point is the category. A skim is an insider crime. It needs someone near the count. It is not a tunnel and a duffel bag, even though popular culture prefers the tunnel.

A separate late-1970s skim at the Tropicana was also the subject of federal prosecutions in that same era of Las Vegas cases. The details that matter for a reader are the shape, not a roster of nicknames: organized crews, casino cash, and indictments. Court records are the source. A blog that adds a mastermind dialogue is writing fiction on top of a real prosecution.

Both cases are why casinos hardened the count: dual custody, cameras on the soft-count room, and independent audits. The lesson for a guest is dull. You will not see the control. You will see that a casino treats the back of the house as more sensitive than the carpet. That is the point of the architecture.`,
    },
    {
      id: "bellagio",
      title: "3: the Bellagio cage robbery",
      body: `In December 2010 a robber in a motorcycle helmet stole a large quantity of chips from the cashier’s cage at the Bellagio in Las Vegas. Contemporary reports put the amount around $1.5 million in chips and later identified the robber as Anthony Carleo. He was arrested after the part every chip thief has to solve and usually cannot: turning famous chips back into money without appearing on a camera at a cashier window.

That is the whole useful story. A disguise gets you out of the cage and into a manhunt. Chips are not anonymous cash once the casino knows the serial pattern and the cage has the video. This page will not describe the approach, the demand, or the exit. Those details are a script. The public lesson is the failure mode. Theft of chips creates a second crime scene at the moment of cashing, and that is where identification gets easier, not harder.

Worked example 1, as a security observation rather than a plan. A casino can freeze redemption on a chip series the way a bank can flag a stolen card. Anyone walking in with a sack of those chips is doing the investigation a favor. The robbery’s profit depends on a cashier who has not been told. Modern cages are built to tell them.`,
    },
    {
      id: "cheats",
      title: "4, 5, 6, and 7: devices, edge-sorting, and insider poker",
      body: `In March 2004 three gamblers won a very large sum at roulette at the Ritz Club in London using a concealed prediction device, a sensor and a computer rather than a gun. They were arrested. Public reporting says they were not ultimately convicted, because predicting a wheel sat in a legal gap at the time. The case still changed how rooms feel about electronics at the table. This page will not describe the sensor, the hiding place, or the calculation. “A hidden device predicted the ball” is the entire mechanism you need.

Phil Ivey and a partner won large sums at baccarat, including at the Borgata, in a dispute that became a civil cheating case about edge-sorting. Courts found the conduct was cheating. The judgments are the record. The technique will not be taught here. If you want a one-line version that does not enable anyone: they arranged the game so tiny manufacturing differences on the cards became information, and judges said that was not ordinary skill.

In 2007 Absolute Poker and UltimateBet were caught in insider cheating: people who could see opponents’ hole cards. A Kahnawake Gaming Commission process around UltimateBet identified insiders. This was a trusted seat at the server, not a mask. The tool will not be described here.

| Case | Public result | What this page omits on purpose |
| --- | --- | --- |
| Ritz Club, 2004 | Arrests; reporting says no final conviction | How the device worked |
| Borgata baccarat dispute | Civil cheating judgments | How to edge-sort |
| Absolute Poker, 2007 | Insider hole-card cheating exposed | How the tool was built |
| UltimateBet | Regulator findings and refunds | Any steps to see hidden cards |`,
    },
    {
      id: "manila",
      title: "8: Resorts World Manila was an attack",
      body: `On June 2, 2017, a gunman attacked Resorts World Manila. Dozens of people died, most of them from smoke during the fires set in the casino, not from a clean grab of cash. The attacker, identified by authorities as Jessie Carlos, took chips he did not live to cash and died at the scene. He had a gambling problem and large debts. Calling this a heist in the movie sense is an insult to the people who died. It belongs on this list because searchers will find it, and because it is the opposite of a clever plan: violence, a fire, a failed theft, and a national shock.

Security conversations after Manila were about entrances, fire, and evacuation. Remember the deaths. A chip is not worth a life. Help lines exist for the debt. This guide will not describe the weapon, the path, or the fires.`,
    },
    {
      id: "cyber",
      title: "9 and 10: Caesars and MGM in September 2023",
      body: `In September 2023 Caesars Entertainment disclosed a cyber incident and disclosed that it paid a ransom. Read the company’s SEC filing for the company’s own words rather than a single headline number. In the same month MGM Resorts suffered a cyber incident that disrupted casinos and hotels for days: slot machines, digital keys, websites, and reservations were widely reported as affected. MGM’s outage was the picture the public saw. Caesars’ payment was the picture in the filing. They are two cases in one wave of attacks, not one identical story.

Public reporting described social engineering of help desks. This page will not repeat the steps, the scripts, or the names of criminal brands in enough detail to copy. The FBI and the companies’ disclosures are the places for investigators and shareholders. For a guest, the lesson was visible without a manual. A casino can be “robbed” by turning off the systems that make it a casino. Restoring service, notifying customers, and arguing about ransom policy were the aftermath. Nobody carried a duffel bag through the lobby on television. The money and the data moved anyway.

Worked example 2, again as a guest observation. If your hotel key and the slot floor fail at once, you are inside an incident, not a lucky night. Follow staff instructions, watch your accounts, and ignore anyone who messages you to “verify” a password because of the outage. The second crime, after the intrusion, is often a fake helper. The company’s real notice will not ask you to hand a stranger your login in a rush.`,
    },
    {
      id: "checklist",
      title: "What these ten cases are for",
      body: `Use the list as history. Refuse it as a curriculum.

- Stardust and Tropicana: insider skims, prosecuted, not adventure stories.
- Bellagio, 2010: chips were stolen and the cash-out failed in public reporting.
- Ritz, 2004: a device at roulette, arrests, and a legal outcome you should read in contemporary reports rather than in a gadget guide.
- Ivey and the Borgata: a civil cheating judgment, not a recipe.
- Absolute Poker and UltimateBet: insiders seeing hole cards, exposed by investigation.
- Resorts World Manila: a fatal attack. Remember the victims.
- Caesars and MGM, 2023: disclosed cyber incidents, one ransom payment, one long outage.

[Casino surveillance](/guides/casino-surveillance) is where the cameras went after the physical cases. The cyber cases show the limit of cameras: a help desk in another city is not a pit. None of the ten is a reason to try. Arrests, judgments, deaths, and outages are the pattern. The pattern is failure and harm, which is why the stories are public in the first place.`,
    },
  ],
  faqs: [
    {
      q: "What is the difference between a casino heist and a skim?",
      a: "A heist in ordinary speech is a one-time theft, often by force or by a disguised grab of chips or cash. A skim is an insider theft that removes money before the official count, so the records look slightly weak instead of robbed. The Stardust case is the famous skim. The Bellagio cage robbery is the famous grab. They need different defenses: audits for a skim, and chip controls for a grab. Both produced prosecutions.",
    },
    {
      q: "Did the Bellagio robber get away with the chips?",
      a: "He got out with a large quantity of chips in December 2010. Reports put the value around $1.5 million and identified Anthony Carleo, who was later arrested. Chips have to be cashed. That second step is where distinctive chips and cage video do their work. This page will not describe how the cage was approached. The useful fact is the failure of the cash-out, which is the part movie scripts skip because it is administrative and effective.",
    },
    {
      q: "Were the 2023 MGM and Caesars incidents robberies?",
      a: "They were cyber incidents, publicly disclosed, in the same September 2023 wave. Caesars disclosed paying a ransom in its securities filings. MGM suffered a widely reported outage of casino and hotel systems that lasted days. No public account describes a gunman with a bag. Treat ransom figures you see in headlines as claims to check against the filing. This guide does not explain the intrusion method. The guest lesson is to follow real company notices and ignore copycat messages.",
    },
    {
      q: "Was Resorts World Manila a successful heist?",
      a: "No. On June 2, 2017, an attack at Resorts World Manila killed dozens of people, mostly from smoke, and the attacker died without a movie-style escape. Authorities identified Jessie Carlos, a gambler with heavy debts. Chips were taken and were not a happy ending. Remember it as a mass-casualty crime, not as a model. If you recognize the debt, use a help line.",
    },
    {
      q: "Can you learn to spot these scams at the table?",
      a: "You can learn the categories: force, a skim, a device, an insider with hidden information, a cyber outage. You should not learn the techniques. Past-posting and marked cards have their own pages so this one does not become a lesson in cheating. Edge-sorting and hole-card tools are omitted on purpose. If something at a real table looks wrong, tell the floor. Replicating a historical scam is a crime, and the historical ending is usually arrest, a lawsuit, or worse.",
    },
  ],
  sources: [
    {
      label: "U.S. Securities and Exchange Commission",
      url: "https://www.sec.gov/",
    },
    {
      label: "Federal Bureau of Investigation",
      url: "https://www.fbi.gov/",
    },
    {
      label: "U.S. Department of Justice",
      url: "https://www.justice.gov/",
    },
  ],
  related: ["casino-surveillance", "past-posting", "marked-cards", "stardust-casino", "history-of-gambling"],
  updated: "2026-10-06",
};
