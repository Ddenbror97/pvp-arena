const wpa = [
  { label: "WPA Rules of Play, effective 21 October 2026 (PDF)", url: "https://wpapool.com/wp-content/uploads/2026/10/WPA-Rules-2026-10-21-211.pdf" },
  { label: "WPA rules index", url: "https://wpapool.com/rules/" },
];

const fargoSources = [
  { label: "FargoRate", url: "https://fargorate.com/" },
  { label: "APA Equalizer", url: "https://poolplayers.com/equalizer/" },
];

const apaSources = [
  { label: "APA Equalizer", url: "https://poolplayers.com/equalizer/" },
  { label: "APA league rules download", url: "https://rules.poolplayers.com/download/" },
  { label: "APA official team manual (PDF)", url: "https://media.poolplayers.com/tmrb/team-manual-english.pdf" },
];

const mosconiSources = [
  { label: "APA note on the 2025 Mosconi Cup and FargoRate", url: "https://bd.poolplayers.com/BD0426/pool-probabilities-fargorate-analysis" },
  { label: "FargoRate", url: "https://fargorate.com/" },
];

const skill = { cluster: "Skill wagers", topic: "skill-wagers", sources: wpa };
const knowledge = { cluster: "Casino knowledge", topic: "casino-knowledge", sources: wpa };

const money = ["8-ball-pool-for-money", "pool-payday-review", "games-that-pay-real-money"];

export const C = [
  {
    ...skill,
    slug: "how-to-win-8-ball-pool",
    keyword: "8 ball pool tips",
    secondary: ["how to win 8 ball pool", "8 ball pool strategy", "8 ball pool tricks"],
    title: "8 Ball Pool Tips: Pattern Play and Safeties",
    description:
      "8 ball pool tips on pattern play, cue-ball leaves, and safeties. No win rate is promised. This 1v1 table takes 5% of the pot and calls a pocket only on the 8.",
    h1: "8 ball pool tips that choose the next leave",
    answer:
      "8 ball pool tips, on a cash table, are choices about the next ball and the cue ball you leave behind it. How to win 8 ball pool is the same search with a smaller count, about 30 a month, beside strategy and tricks near 20. None of those phrases is a promised win rate. The useful work is pattern play, a leave, and a safety when the 8 sits near the other pocket.",
    facts: [
      "The figures used here put how to win near 30 monthly searches, strategy near 20, and tricks near 20.",
      "A fair cash match on this site is equal stakes. No secret handicap is written into the seat.",
      "The fee is 5% of the pot. The winner is credited 95% when the match settles.",
      "You call a pocket only for the 8. The 8 on the break wins unless the cue ball scratches.",
      "Ghost-ball aim is a teaching picture. This page does not publish a measured make percentage.",
    ],
    tableLead:
      "People who search 8 ball pool tips are often looking at a free client, a prize app, and a cash pot as if they were one game.",
    tableTitle: "Where a tip actually gets paid",
    moneyTitle: "What the tip is worth in a pot",
    moneyLabel: "Tips example",
    stake: 500,
    checkTitle: "Before the pattern becomes a stake",
    checkHead: "Run this list before you break",
    checks: [
      "Name the stake out loud. The choices are $1, $2, $5, $10, $25, and $50.",
      "Remember that only the 8 is call-pocket.",
      "Plan a safety before you plan a hero bank.",
      "Treat three timeouts as a forfeit, not as extra thinking time you can stockpile.",
      "Ignore any tip that quotes a make percentage this site never measured.",
      "Stop the session on the number you wrote down before the first rack.",
    ],
    whereTitle: "Tips that sit next to this one",
    siblings: [
      ["8-ball-pool-break", "the opening break"],
      ["8-ball-pool-aim", "aim and spin"],
      ["pool-shots", "banks, kicks, and safeties"],
    ],
    related: [...money, "8-ball-pool-break", "8-ball-pool-aim"],
    faqs: [
      { q: "Do 8 ball pool tips guarantee a win?", a: "No. Pattern play and a good leave raise the chance you get another shot. They do not publish a win rate, and this page will not invent one. The 5% fee still comes off the pot when you win." },
      { q: "What is the first strategic choice?", a: "Which group to take, and only if the first pocket leads to a second ball. The table is open until a legal pocket assigns solids or stripes. A ball that blocks your next pocket is a reason to look at the other group." },
      { q: "When should you play safe?", a: "When the 8 is near their pocket, or when the run-out path is a low-percentage bank and a safety exists. A safety only has to take the shot away. It does not have to look clever." },
      { q: "Does English help the object ball?", a: "English moves the cue ball more than the object ball. Use it to park the cue ball for the next shot. It is a poor rescue for a line you already missed in your stance." },
      { q: "Is this the WPA call-shot game?", a: "No. WPA 8-ball, in the rules effective 21 October 2026, is call-shot, and an 8 on the break is not a win in that book. Here you call a pocket only for the 8, and the break 8 wins unless the cue ball scratches." },
      { q: "Can a rank or a cue upgrade replace the leave?", a: "No. Cue upgrades are not sold here, and a free-game rank does not set the stake. Both players post the same cash. The leave is the advantage you can actually play." },
    ],
    sections: [
      {
        id: "pattern",
        title: "Pick a path, not a single ball",
        body: `Pattern play is the part of 8 ball pool tips that still matters after the cue ball hits. Name a group only when the first pocket also hands you a second ball. If the path dies after one make, that pocket was a hope. Clear the ball that will block a pocket you still need before you start a pretty run. A ball sitting in front of your next ball is either your next shot or a reason to take the other group. The table stays open until a legal pocket assigns solids or stripes, so the first made ball is the decision.

Stop when the 8 sits in the jaws of their pocket and you still have a choice. A safety that leaves them long, or hooked, is the shot. Firing a thin cut because it looks brave is how equal players donate racks. How to win 8 ball pool, as a strategy, is mostly refusing that donation.`,
      },
      {
        id: "leave",
        title: "The cue ball is the second result",
        body: `Every make has two results, and the second one decides the inning. Pocket the object ball and stop the cue ball where the next shot is a center-ball hit, or a small follow, rather than a full-table cut. Sidespin is a parking tool. It changes the cue ball's path more than it changes the object ball, so it will not forgive a bad line. If you stand up and cannot see the next ball, the previous shot already failed.

8 ball pool tricks that only move the cue ball one diamond and leave a shot are the ones worth keeping. A trick that needs the other player to miss is not a plan. On a money rack the plan has to survive a competent safety in reply. Look one ball ahead before you chalk, then play the speed that arrives there.`,
      },
      {
        id: "safety",
        title: "Play safe while you still can",
        body: `A safety is due earlier than most players admit. If the 8 is hanging in their pocket and you have two balls left, clearing those two can hand them the rack. Leave them without a shot instead. The safety does not need a name. It needs to take the line away, even if your object ball stays on the table and the inning looks quiet.

Do not fire a low-percentage bank when a safety exists. The bank might fall on a given night. This page will not invent the odds that it does. When the safety is available and the bank needs two rails plus a wish, the safety is the strategy. Hero shots are how a session of equal players gets expensive, one donated rack at a time. The fee does not refund a brave miss, and the other player keeps the inning.`,
      },
      {
        id: "money-table",
        title: "What changes when the rack is cash",
        body: `This match is 1v1 8-ball only. It is not a race and it is not a handicap. You call a pocket only for the 8. Any other of your balls may fall in any pocket. The 8 on the break wins unless the cue ball scratches, and that scratch loses. Three timeouts forfeit the seat. The World Pool-Billiard Association book effective 21 October 2026 is call-shot, and it does not award the rack for an 8 on the break. Read that split before you stake.

Stakes are $1, $2, $5, $10, $25, and $50, posted equally. The fee is 5% of the pot. No FargoRate is applied and no APA skill level is stored. The playing surface is 2.54 m by 1.27 m, a 9-foot playing surface, under physics id pool-phys-v2. The engine adds no random miss. A make-on-the-break rate is not published here, and neither is a ghost-ball make percentage.`,
      },
    ],
    moreTitle: "Leaves, fees, and the shot you skip",
    more: [
      `A useful leave is boring to watch and expensive to skip. Put the cue ball on the correct side of the next object ball, close enough that speed is a choice rather than a rescue. If the next ball is frozen on the rail, arrive on the side that lets you see it. English can bend the cue ball into that parking spot. It should not be asked to steer the object ball into a pocket you aimed wrong. When the parking spot does not exist, play the safety on this shot, not on the next one.`,
      `The cash part is simple enough to say without a slogan. Both players choose the same stake from the published list, the pot is the sum, and settlement keeps 5%. A win credits 95% to the rules winner. That winner is a legal 8, or the opponent's loss on an early 8, a wrong pocket, a scratch on the 8, three timeouts, or a forfeit. A table cancelled before the break returns both stakes. Nothing in that arithmetic is a forecast of how often you will be the winner.`,
      `Ghost-ball aim belongs in the lesson, not in a statistic. Picture the ball that would fill the pocket, then hit the real object ball at that contact point. The picture does not come with a make percentage, because this page never measured one. The same restraint covers the break. People ask how often the 8 falls on the snap. The lobby does not print that rate, so a tip that quotes one is borrowing a number from somewhere else. Play the pattern you can see.`,
    ],
  },
  {
    ...skill,
    slug: "8-ball-pool-break",
    keyword: "8 ball pool break",
    secondary: ["8 ball break", "break in 8 ball pool"],
    title: "8 Ball Pool Break: What the Opening Shot Decides",
    description:
      "8 ball pool break on this table: the 8 wins if it drops and the cue ball stays up. A make-on-the-break rate is not published. The fee is 5% of the pot.",
    h1: "What an 8 ball pool break is allowed to win",
    answer:
      "8 ball pool break, on this table, can end the rack: if the 8 falls and the cue ball stays on the table, that is a win. A scratch on that same break loses. The figure used for this page is about 70 searches a month at keyword difficulty 20. A make-on-the-break rate is not published here, so this guide will not invent break-pot odds to fill the gap.",
    facts: [
      "About 70 monthly searches and keyword difficulty 20 are the figures carried for this phrase.",
      "The opening break is played from the kitchen, behind the head string.",
      "Pocketing the 8 on the break wins unless the cue ball scratches.",
      "WPA 8-ball effective 21 October 2026 does not award the rack for an 8 on the break.",
      "No break-win percentage and no break-pot odds are printed on this site.",
    ],
    tableLead:
      "An 8 ball pool break looks similar in a free client and in a cash match. The rule that follows the 8 is not the same product.",
    tableTitle: "Three tables, three breaks",
    moneyTitle: "A break still settles like any other rack",
    moneyLabel: "Break example",
    stake: 1000,
    checkTitle: "Before you hit the opening cue ball",
    checkHead: "Check the break, then the stake",
    checks: [
      "Place the cue ball in the kitchen for the opening break.",
      "Know that an 8 in a pocket wins only if the cue ball does not scratch.",
      "Do not quote a make-on-the-break rate. This site does not publish one.",
      "Call a pocket only if you are shooting the 8 later, not on ordinary balls.",
      "Remember three timeouts forfeit the seat after the racks get thoughtful.",
      "Post the same stake as the other player. The break is not a handicap.",
    ],
    whereTitle: "Pages that follow the opening shot",
    siblings: [
      ["how-to-win-8-ball-pool", "pattern tips after the break"],
      ["8-ball-pool-rules", "the rules split"],
      ["8-ball-pool-aim", "where the cue ball should arrive"],
    ],
    related: [...money, "how-to-win-8-ball-pool", "8-ball-pool-rules"],
    faqs: [
      { q: "Does the 8 on the break win?", a: "On this table, yes, unless the cue ball scratches. A scratch on the break 8 loses the rack. The WPA rules effective 21 October 2026 do not treat a break 8 as a win. Know which book you are playing before you celebrate." },
      { q: "What are the odds the break pots the 8?", a: "This page does not know, and it will not invent them. A make-on-the-break rate is not published in the lobby. Any percentage you see in a chat is not a figure from this site." },
      { q: "Where does the break start?", a: "From the kitchen, behind the head string. Ball in hand later in the rack, after a foul, is anywhere. The opening break does not get that freedom." },
      { q: "Should you try to run out off the break?", a: "Only if the leave gives you a path. Spreading the balls is useful. A spread that leaves the 8 at their pocket and you with no shot is a problem you created. Pattern tips still apply on shot two." },
      { q: "Does a stronger cue change the break?", a: "Cue upgrades are not sold here. A heavier stick from a shop does not change pool-phys-v2, and this page will not rank brands. The physics id does not add a random miss on top of the hit you actually played." },
      { q: "Is the break a separate bet?", a: "No. The stake is on the rack. The fee is 5% of the pot at settlement, whether the rack ends on the break or ten shots later. A cancel before the break returns both stakes." },
    ],
    sections: [
      {
        id: "opening",
        title: "What the opening hit is for",
        body: `An 8 ball pool break is the only shot that starts with a full triangle and a cue ball behind the head string. You are trying to spread your future problems so that shot two has a pocket and a leave. Power without a place to stand is just noise. If the wings stay frozen and the 8 is the only ball that moved, you have a hard rack and you earned it. Look at the balls that went to rails. Those are the ones that might be next.

The kitchen is the area behind the head string. The opening cue ball lives there. After a foul later, ball in hand is anywhere on this table, which is a different privilege. Do not confuse the two and place the break cue ball down-table. The shot clock still runs. Three timeouts forfeit the seat, including if you spend them admiring the rack.`,
      },
      {
        id: "eight-ball",
        title: "The break 8 is a rule, not a percentage",
        body: `If the 8 falls on the break and the cue ball remains on the table, the breaker wins. If the cue ball scratches on that shot, the breaker loses. That is the whole rule. It is not a side bet and it is not a bonus paid by the house. The other player posted the same stake. The pot already exists. The fee at settlement is still 5%.

A make-on-the-break rate is not published here. Break-pot odds are not published either. Printing 40% or 12% because a forum sounded confident would be a guess with a dollar sign next to it. The WPA book effective 21 October 2026 does not award the rack for an 8 on the break at all. If you learned that book, the win on this site will feel sudden. Read it before the stake, not after.`,
      },
      {
        id: "leave-after",
        title: "Shot two is part of the break",
        body: `The break is finished when the balls stop, and the thinking starts. If you pocketed a ball on a legal break and the table is still open, the next pocket assigns the group. Take the group that gives you a second ball, not the group that happens to include the ball you just made. A stripe that fell by accident is not a marriage.

Play safe off the break when the 8 is already near their pocket and your first shot is a thin nothing. Spreading balls into a lost position is a common way to turn a fine break into a lost rack. There is no random miss in pool-phys-v2 to blame. The cue ball went where the tip sent it. English will move that cue ball more than the object ball if you load the next shot with sidespin.`,
      },
      {
        id: "cash-break",
        title: "Equal stakes on a 9-foot surface",
        body: `The playing surface is 2.54 m by 1.27 m, the size of a 9-foot playing surface. Break speed that felt right on a 7-foot bar box will run long here. That is a feel issue, not a published formula for power. This page will not invent a tip position that guarantees a wing ball. Cue weight in the 18 to 21 ounce shop-talk range is not a WPA break specification, and this site does not sell the stick.

Both players post $1, $2, $5, $10, $25, or $50. No FargoRate adjusts the break. No APA skill level shortens the rack. A fair money match is equal stakes. You call a pocket only when you shoot the 8. Ordinary balls may drop anywhere. Jump shots are not a button, and they are often illegal under bar rules anyway. Win the rack the rules name, or do not.`,
      },
    ],
    moreTitle: "After the balls stop moving",
    more: [
      `Count the pockets before you celebrate a spread. A cluster on the foot rail is not a gift if both of your next balls live inside it. Take the open ball that lets you touch that cluster later with control. If neither group offers that, a safety that leaves the cue ball on the head rail can be worth more than a lucky make. The other player is staking the same cash. Donating shot two is a gift with a receipt.`,
      `The hash of the rack seed is committed before the balls are shown. The seed shuffles the coloured balls. It does not pick the winner, and it does not add a miss. When the rack ends, the server recomputes the shots. A browser cannot file a break win the replay rejects. That is the settlement. A story in chat about a break that should have counted is not a second cashier. The pot pays the replay, then stops. Chat cannot reopen it.`,
      `People ask for a drill that raises the break-win rate by a stated amount. There is no such number on this page. Practice a quiet cue-ball path: a firm hit, a center or slightly-above-center tip, and a cue ball that stays near the middle instead of flying to a corner. If it scratches, the rule is the rule. If the 8 drops clean, the rack is over and the pot settles with the 5% fee still attached. Count the leave, not a rumour about odds.`,
    ],
  },
  {
    ...skill,
    slug: "8-ball-pool-aim",
    keyword: "8 ball pool aim",
    secondary: ["8 ball pool spin", "ghost ball aim"],
    title: "8 Ball Pool Aim: Ghost Ball, Spin, and Contact",
    description:
      "8 ball pool aim uses a ghost ball as a teaching picture, not a measured make rate. English moves the cue ball more than the object ball. No miss is randomized.",
    h1: "8 ball pool aim without a fake make percentage",
    answer:
      "8 ball pool aim starts with a ghost ball, which is a picture of the contact point, not a measured make percentage. The spin phrase people add, 8 ball pool spin, is a larger search on the figures used here, about 90 a month at keyword difficulty 8, while aim itself sits near 40 at difficulty 0. English moves the cue ball more than the object ball. This table adds no random miss on top of the hit.",
    facts: [
      "Aim is carried here at about 40 monthly searches, keyword difficulty 0. Spin is about 90 at difficulty 8.",
      "The ghost ball is a teaching idea. No make percentage is attached to it on this page.",
      "Physics id pool-phys-v2 does not insert a random miss.",
      "You still call a pocket only for the 8. Aiming an ordinary ball at a pocket does not make it a called shot.",
      "Cue upgrades are not sold, and a cosmetic cue does not change the contact point.",
    ],
    tableLead:
      "8 ball pool aim is taught inside free clients with lines and inside cash matches with none. The contact point does not care which cashier wrapped the table.",
    tableTitle: "Aiming aids versus the hit you play",
    moneyTitle: "A good line still pays the fee",
    moneyLabel: "Aim example",
    stake: 200,
    checkTitle: "Before you trust the line",
    checkHead: "Aim in this order",
    checks: [
      "Picture the ghost ball, then aim the real ball at that contact point.",
      "Use English to place the cue ball, not to drag the object ball sideways.",
      "Refuse any chart that quotes a make percentage from this site.",
      "Call the pocket only when the ball is the 8.",
      "Play a safety if the cut is thin and a safe leave exists.",
      "Remember the surface is 2.54 m by 1.27 m, so long cuts stay long.",
    ],
    whereTitle: "Aim sits between these pages",
    siblings: [
      ["pool-shots", "banks, kicks, and masse"],
      ["how-to-win-8-ball-pool", "leaving the cue ball"],
      ["pool-terminology", "the words for spin and contact"],
    ],
    related: [...money, "pool-shots", "how-to-win-8-ball-pool"],
    faqs: [
      { q: "What is a ghost ball?", a: "It is an imagined ball sitting on the object ball at the contact point that would send it along your line. You aim the cue ball at the center of that picture. It is a teaching idea. This page does not claim a measured make percentage for it." },
      { q: "Does spin change where the object ball goes?", a: "A little, compared with what it does to the cue ball. English moves the cue ball more than the object ball. If the object ball is missing the pocket, fix the line before you add sidespin." },
      { q: "Why did a centered hit miss with no 'luck' factor?", a: "Pool-phys-v2 does not add a random miss. A miss is the line, the speed, or the contact you played. The replay recomputes that shot. It does not roll a second number to decide whether a thin cut was forgiven." },
      { q: "Should you use an aim line from a free app?", a: "Those lines are that client's teaching layer. This cash table does not owe you the same overlay. The ghost-ball picture still works without it. A legendary cue from a free game does not move the contact point." },
      { q: "Does aim differ for the 8?", a: "The contact point is the same idea. The rule is not. You must call the pocket for the 8. A make in the wrong pocket loses. Ordinary balls may fall in any pocket, so aiming them is about the leave as much as the hole." },
      { q: "Can spin replace a safety?", a: "No. A low-percentage cut with a dramatic swerve is still a low-percentage cut. If a safety exists, it is the higher-quality decision. 8 ball pool spin is a tool for the cue ball after a ball you can actually pocket." },
    ],
    sections: [
      {
        id: "ghost",
        title: "The ghost ball is a picture",
        body: `8 ball pool aim gets clearer when you stop aiming at the pocket and start aiming at a contact point. Picture a ball frozen to yours on the side that lines up with the pocket. That picture is the ghost ball. Hit the real object ball where the ghost ball's center would be. The method is old, ordinary, and enough for center-ball shots. It is not a sensor and it is not a percentage.

This page must not be read as a measured make rate. Nobody timed a thousand ghost-ball cuts on this table and printed the result. If a video quotes 70% for a half-ball cut, that number is not from here. Use the picture. Pocket the ball or miss it honestly. Then leave the cue ball for the next one, which is the part aim charts usually skip.`,
      },
      {
        id: "english",
        title: "Spin is mostly a cue-ball tool",
        body: `8 ball pool spin, as players search it, covers follow, draw, and English. Follow sends the cue ball forward after contact. Draw brings it back. English is sidespin, and it changes the cue ball's path off the object ball and off the rails more than it bends the object ball into the pocket. If you are missing the shot, sidespin is an excuse, not a correction.

Use a center hit until the line is real. Add a tip of English when you already know the ball will fall and you need the cue ball to park on a chosen side. A masse is a different shot, a steep curve, and it belongs on the shots page. Jumping the cue ball is not a button on this site, and bar rules often forbid it. Do not aim as if a jump will save a blocked line.`,
      },
      {
        id: "speed",
        title: "Speed finishes the line",
        body: `A correct contact point with the wrong speed still leaves a mess. Soft follow into a short next ball is a different shot from a firm hit that rockets the cue ball up-table. Decide the leave first, then the speed that produces it, then the aim that pockets the current ball at that speed. Reversing the order is how players make the ball and scratch, or make the ball and hook themselves.

The playing surface is 2.54 m by 1.27 m. Long rails are long. A speed that dies at a side pocket on a bar box will still be moving here. There is no random miss to soften that. Physics id pool-phys-v2 replays the hit you sent. Three timeouts forfeit if you spend the clock redrawing the ghost ball. Pick the line, then shoot it. A second look is allowed. A third timeout is the forfeit.`,
      },
      {
        id: "called",
        title: "Aim is not the same as a called shot",
        body: `You can aim an ordinary ball at a pocket with care and still have a legal hit if it falls somewhere else, or if another of your balls falls with it. This table calls a pocket only on the 8. The WPA book effective 21 October 2026 calls ball and pocket. Players who grew up in that book will over-call shots here. That is a rules habit, not an aiming virtue. Say the pocket when the ball is the 8. Stay quiet, and accurate, on the rest.

The 8 in the wrong pocket loses. A scratch while pocketing the 8 loses. Aim the 8 as carefully as any other ball, then add the call. No FargoRate widens the pocket. No APA skill level does either. Equal stakes mean the better line is the whole edge, minus the 5% fee when the rack pays.`,
      },
    ],
    moreTitle: "Contact, spin, and what the replay keeps",
    more: [
      `Stand so the cue, the ghost-ball center, and the pocket are one line, then lower your head enough to see it. A stance that changes between practice and the stake is a different aim. Chalk, bridge, and a still head matter more than a new shaft this site does not sell. If the bridge shakes, the ghost ball was fiction. Reset. The shot clock is real, and three timeouts forfeit, but a rushed bridge is how thin cuts miss by a diamond.`,
      `Draw and follow are speed and tip height, not magic. A low tip with a level cue brings the cue ball back if you actually hit low and through. A high tip runs forward. Sidespin plus a high tip produces a curve you may not have budgeted. Strip the shot down to one effect until you can predict the cue ball. Predicting the object ball is the ghost ball. Predicting the cue ball is the leave. You need both, on every money ball.`,
      `The replay will show the same miss twice. That is the point of pool-phys-v2. It is not a second chance and it is not a random reroll. If your aim was a half-tip off, the recomputed shot is a half-tip off. Use that to correct the picture, not to argue the table cheated the cut. The rack seed shuffled colours. It did not choose whether your contact point was true. Fix the picture, then take the next rack with that correction.`,
    ],
  },
  {
    ...skill,
    slug: "pool-shots",
    keyword: "pool shots",
    secondary: ["bank shot pool", "masse shot", "kick shot pool"],
    title: "Pool Shots: Banks, Kicks, Safeties, and Masse",
    description:
      "Pool shots for a money match: banks, kicks, caroms, masse, and safeties. A jump is not a button here. When a safety exists, skip the low-percentage bank.",
    h1: "Pool shots you can name without inventing odds",
    answer:
      "pool shots are the named ways the cue ball and an object ball can meet: a straight hit, a bank, a kick, a carom, a safety, or a masse. On the figures used for this page, pool shots sits near 720 searches a month at keyword difficulty 30, bank shot pool near 390 at 18, and masse near 480 at 26. None of those counts is a make percentage. A jump is not a button on this table.",
    facts: [
      "Pool shots is carried near 720 monthly searches, keyword difficulty 30.",
      "Bank shot pool is near 390 at difficulty 18. Masse is near 480 at difficulty 26.",
      "A bank sends the object ball to a rail before the pocket. A kick sends the cue ball to a rail first.",
      "Jump shots are often illegal in bar rules and are not a button here.",
      "This page does not publish make percentages for banks, kicks, or masse shots.",
    ],
    tableLead:
      "Pool shots look identical in a coin game and in a cash rack until a jump, a called 8, or a fee enters the conversation.",
    tableTitle: "Which client even lets you play the shot",
    moneyTitle: "A named shot still settles at 5%",
    moneyLabel: "Shot example",
    stake: 2500,
    checkTitle: "Before you choose the spectacular option",
    checkHead: "Prefer the shot you can leave",
    checks: [
      "Name the shot: bank, kick, carom, masse, or safety.",
      "If a safety exists, do not fire a low-percentage bank.",
      "Do not look for a jump button. There is not one.",
      "Use English to move the cue ball, not as a substitute for the line.",
      "Call the pocket if the object ball is the 8, including on a bank.",
      "Ignore make-rate charts that this site did not publish.",
    ],
    whereTitle: "Shots next to aim and the words",
    siblings: [
      ["8-ball-pool-aim", "ghost-ball aim"],
      ["pool-terminology", "names for these shots"],
      ["how-to-win-8-ball-pool", "when a safety is the pattern"],
    ],
    related: [...money, "8-ball-pool-aim", "pool-terminology"],
    faqs: [
      { q: "What is a bank shot in pool?", a: "The object ball hits a rail and then a pocket. You are banking the object ball, not the cue ball. On this table a banked 8 still has to be called in that pocket. A banked ordinary ball may count in any pocket." },
      { q: "What is a kick?", a: "The cue ball hits a rail before it reaches the object ball. Players use a kick when the straight line is blocked. It is legal here. It is still a low-percentage choice when a safety would leave the other player stuck." },
      { q: "What is a carom?", a: "The cue ball, or the object ball, glances off another ball. A carom can pocket a ball that was not on the original line. It also creates extra movement you must include in the leave. It is not a license to hit everything and hope." },
      { q: "Is a masse allowed?", a: "A masse is a steep, elevated hit that curves the cue ball. It is a real shot, and the search volume shows people want it explained. It is not a button, and it is a poor substitute for a safety you can see. This page gives it no make percentage." },
      { q: "Can you jump the cue ball?", a: "Jump shots are often illegal in bar rules. They are not a button on this site. If the line is blocked, look for a kick or a safety. Do not play as if an elevation button will appear." },
      { q: "Do pool shots change the fee?", a: "No. A bank, a kick, and a straight stop shot settle the same way. The fee is 5% of the pot. The winner is whoever the 8-ball rules name. Spectacle is free. The pot is not." },
    ],
    sections: [
      {
        id: "family",
        title: "A short family of real shots",
        body: `Pool shots, in a money rack, are a small vocabulary. A straight shot is cue ball to object ball to pocket. A bank is object ball to rail to pocket. A kick is cue ball to rail to object ball. A carom uses a third ball as a rail you did not plan for until you needed it. A safety may pocket nothing. A masse curves the cue ball with elevation. Learn the names so you can choose. The choice is the strategy.

The figures are large because the words are common: about 720 searches for pool shots, about 390 for bank shot pool, about 480 for masse, at the difficulties noted above. Common is not the same as high percentage. This page will not attach a make rate to any of them. The ghost ball still helps you find contact. It still is not a statistic.`,
      },
      {
        id: "banks",
        title: "Banks lose to safeties more often than videos admit",
        body: `A bank shot pool players love is the one that crosses the table and dies in the corner. Play it when it is the path, or when the leave off the bank is the next ball. Decline it when a safety exists and the bank is a wish. The instruction is plain: do not fire at a low-percentage bank when a safety exists. The 8 near their pocket makes that instruction stricter, not looser.

Call the pocket on a banked 8. The rail does not exempt the call. Speed matters because a hard bank comes off the rubber differently from a soft one, and English changes the cue ball after the hit more than it steers the object ball. If you need sidespin to make the bank, you may be aiming at the wrong contact. Reset the ghost ball on the rail path before you decorate the cue.`,
      },
      {
        id: "kicks",
        title: "Kicks and caroms are escapes, not styles",
        body: `Use a kick when a ball blocks the straight line and you can still see a rail-first path to your object ball. Use a carom when a nearby ball can deflect the cue ball onto the one you need. Both are standard. Both are ways to stay at the table. Neither is a personality. If the kick leaves you selling out once it misses, and a safety would have frozen the cue ball on a rail, play the safety.

The playing surface is 2.54 m by 1.27 m, so a two-rail kick is a long trip. Pool-phys-v2 will send the cue ball along the hit you played, with no random miss to widen the pocket. Practice the one-rail kick before you collect two-rail stories. A miss is a miss the replay can show. It is not a cue upgrade you failed to buy, because this site does not sell cues.`,
      },
      {
        id: "masse-jump",
        title: "Masse is a curve. A jump is not a button",
        body: `A masse shot elevates the cue and curves the cue ball around an obstacle. It is legal to describe and legal to attempt when the rules you are in allow the elevation. It is a difficult way to pocket a ball and a common way to scratch or to leave a gift. On a cash rack, attempt it when the alternative is a certain loss and you understand the curve. Otherwise play the safety. No make percentage is printed beside the word masse on this page.

Jump shots are a separate idea: the cue ball leaves the cloth and comes down past a blocking ball. Bar rules often mark them illegal. This site does not offer a jump button. If you are blocked, kick or play safe. The fee stays 5% either way. Equal stakes do not include a bonus for the more acrobatic miss.`,
      },
    ],
    moreTitle: "Choosing among shots you can already name",
    more: [
      `Stand behind the shot and say the name before you shoot. If you cannot say bank, kick, carom, safety, or center-ball, you are improvising with money on the table. Improvising is allowed. It is just a weak habit. The pattern page is the place for the order of balls. This page is the place for the shape of one shot. Use both. A run out is a chain of shapes that leave the cue ball, not a chain of highlights.`,
      `English on a bank changes the angle the cue ball takes afterward, which is why players add it and then wonder why the object ball missed. Aim the object ball first. Add only enough side to park. Follow and draw belong to the same decision. A stop shot, cue ball dying at contact, is often the best pool shot in a rack because the leave is obvious. Obvious leaves win money matches. Mysterious curves win comments in a chat, not the pot.`,
      `Three timeouts forfeit, so do not spend them inventing a masse. Look once for the safety, once for the straightforward pocket, and shoot. The 8 still needs a called pocket if it is the ball you are banking or kicking at. Ordinary balls do not. The WPA call-shot book is a different product. Here the shot list is physical, and the calling rule is narrow on purpose. Narrow is easier to remember once the stake is already posted and the clock is running.`,
    ],
  },
  {
    ...skill,
    slug: "pool-terminology",
    keyword: "pool terminology",
    secondary: ["pool terms", "billiard terms", "what is a lock in pool"],
    title: "Pool Terminology for a Money Match, Plainly",
    description:
      "Pool terminology for a stake match: ball in hand, safety, run out, lock, scratch, kitchen, and English. A lock is one opinion. The table can still scratch.",
    h1: "Pool terminology a stake actually uses",
    answer:
      "pool terminology on this page is the short list a money match needs: ball in hand, safety, run out, lock, scratch, kitchen, head string, English, masse, kick, bank, and carom. The figure used here is about 720 searches a month at keyword difficulty 22. A lock means the speaker thinks the match is already decided, and the table can still scratch. This is not a glossary of invented hustler slang.",
    facts: [
      "Pool terminology is carried near 720 monthly searches, keyword difficulty 22.",
      "Ball in hand on this table, after a foul, means you may place the cue ball anywhere.",
      "The opening break still starts in the kitchen, behind the head string.",
      "A lock is an opinion that the match is over. A scratch can reopen it.",
      "No fake hustler dictionary is added to pad the list.",
    ],
    tableLead:
      "Pool terminology drifts between bar rooms, league nights, and apps. The definitions below are the ones this cash table is willing to use.",
    tableTitle: "Same words, different products",
    moneyTitle: "The words do not change the fee",
    moneyLabel: "Terms example",
    stake: 100,
    checkTitle: "Words to settle before the stake",
    checkHead: "Agree the meanings",
    checks: [
      "Scratch means the cue ball was pocketed.",
      "Ball in hand after a foul is anywhere, not only in the kitchen.",
      "A lock is talk. It is not a rule that ends the match.",
      "Call the pocket only for the 8, whatever nickname the shot has.",
      "Do not invent slang to sound sharp. Use the words on this list.",
      "Keep seed phrases out of the conversation. They are not a pool term.",
    ],
    whereTitle: "Terms beside the shots they name",
    siblings: [
      ["pool-shots", "the shots those words name"],
      ["8-ball-pool-rules", "called pockets and fouls"],
      ["9-ball-rules", "where 9-ball uses different words"],
    ],
    related: [...money, "pool-shots", "9-ball-rules"],
    faqs: [
      { q: "What does ball in hand mean?", a: "You may place the cue ball before the next shot. On this table, after a foul, that place is anywhere. The opening break is the exception: the cue ball starts in the kitchen, behind the head string." },
      { q: "What is a scratch?", a: "The cue ball went into a pocket. On the 8, a scratch loses the rack, including when the 8 falls on the same shot. On the break, a scratch with the 8 also loses. Other scratches hand the opponent ball in hand." },
      { q: "What is a lock?", a: "A lock is a match the speaker thinks is already decided. It is talk, not a rule. The table can still scratch, the 8 can go in the wrong pocket, and three timeouts can forfeit a seat that looked certain." },
      { q: "What are kitchen and head string?", a: "The head string is the line across the table at the head. The kitchen is the area behind that line. You break from there. You do not live there for the rest of the rack on this site." },
      { q: "What is a run out?", a: "You pocket the rest of your group and the 8 in one turn. It assumes a legal 8 in the called pocket, without a scratch. It is a description of a turn, not a promise that the turn will happen." },
      { q: "Are hustler nicknames defined here?", a: "No. This page will not invent a slang glossary. If a word is not in the list above, it is not needed to stake a match. English, masse, kick, bank, and carom are the shot words that are." },
    ],
    sections: [
      {
        id: "table-words",
        title: "Words that place the cue ball",
        body: `Pool terminology starts with where the cue ball may sit. The head string is the line near the head of the table. The kitchen is behind it. The opening break is played from the kitchen. After that, a foul gives ball in hand anywhere on this site. Players who say ball in hand and mean kitchen only are describing a different room. Ask before you stake, or read the rules page and play this one as written.

A scratch is the cue ball pocketed. It is a foul. It is also, on the 8, a loss if the 8 fell with it or the 8 was the ball you were legally shooting under the loss rules. People stretch scratch to mean any miss. That stretch causes arguments. On this page a scratch is the cue ball in a pocket. A miss that leaves the cue ball up is a miss.`,
      },
      {
        id: "inning-words",
        title: "Safety, run out, and lock",
        body: `A safety is a shot played to leave the opponent without a good reply. You may pocket nothing. You may even pocket one of your balls if the leave is the point, and you still have to obey the foul rules. A safety is not a moral category. It is a choice, and it is the right choice when the 8 is near their pocket.

A run out is pocketing what you have left, then the 8, in one turn. Calling a turn a run out before the 8 falls is optimism. A lock is sharper talk: the speaker thinks the match is already decided. Treat that as a mood. The table can still scratch. The 8 can still find the wrong pocket. Three timeouts can still forfeit the seat that was supposed to be a lock. Do not stake extra because someone used the word.`,
      },
      {
        id: "shot-words",
        title: "English, masse, kick, bank, carom",
        body: `English is sidespin. It moves the cue ball more than the object ball, off the hit and off the rails. Follow and draw are tip height, often lumped into spin searches, and they are not English even though people mix the words. A masse is an elevated stroke that curves the cue ball. A kick sends the cue ball to a rail before the object ball. A bank sends the object ball to a rail before the pocket. A carom is a glance off another ball.

Those six words cover the shots page. They do not need nicknames. Jump is a word too, and it is here so you know it is not a button, and that bar rules often forbid it. If someone offers a private glossary of hustler terms, you are not missing a secret rule. You are missing a sales pitch. Play the words in this section.`,
      },
      {
        id: "money-words",
        title: "Words this cashier will not redefine",
        body: `Stake means both players post the same amount: $1, $2, $5, $10, $25, or $50. Pot means the sum. Fee means 5% of that pot at settlement. The winner's credit is 95%. None of those words hides a FargoRate or an APA skill level. This site stores neither. A fair money match is equal stakes, not a secret race length. The list of stakes is the whole menu.

Call-pocket, here, applies to the 8 only. The WPA book effective 21 October 2026 uses call-shot for 8-ball, which is a wider meaning of call. If you import the wider meaning into a sentence on this site, you will mis-explain the product. The playing surface is 2.54 m by 1.27 m. Physics id pool-phys-v2 has no random miss. A seed phrase is not pool terminology. Never type one into a chat about a match. The cashier does not ask for one.`,
      },
    ],
    moreTitle: "Using the list without padding it",
    more: [
      `Say the plain word at the table. Scratch, safety, ball in hand, and the called pocket on the 8 will settle more arguments than a colourful nickname. If you and a friend disagree about kitchen, point at the head string and break from behind it. If you disagree about lock, agree that the word does not pay anyone. The replay pays the rules winner. Vocabulary is how you avoid staking a different game from the one on the server. Agree the words, then post the stake.`,
      `Billiard terms and pool terms overlap and then split. Carom is used in both. A billiard game without pockets is not this match. This site is pocket 8-ball, 1v1, call the 8 only. When a search for billiard terms lands here, the useful part is the shared shot language: English, masse, kick, bank, carom. The pockets, the 8, and the 5% fee are the pool-match part. Do not import a carom-game score into an 8-ball pot. The pot is one rack.`,
      `There is a temptation to publish fifty slang entries so the page looks complete. That would be a fake glossary, and this page refuses it. If a term is not needed to break, to foul, to call the 8, or to name a shot you can play here, it stays off the list. Ask in plain language. The rules page is the longer rule set. This page is the dictionary that keeps the rule set from being misunderstood. Short lists cause fewer stake disputes.`,
    ],
  },
  {
    ...skill,
    sources: fargoSources,
    slug: "fargo-rate",
    keyword: "fargo rate",
    secondary: ["fargo rating", "fargo rate pool"],
    title: "Fargo Rate: Even Games and the Point Gaps",
    description:
      "Fargo rate comes from games won and lost. Equal ratings mean even. About 100 points is a 2:1 gap. This site applies no FargoRate. Cash stakes here are equal.",
    h1: "What a fargo rate says about one game",
    answer:
      "fargo rate is a rating built from games won and lost. The same rating means the two players are treated as even. On the figures used for this page, fargo rate is about 8,100 searches a month at keyword difficulty 28, and fargo rating about 4,400 at difficulty 70. This site does not apply a FargoRate to a stake. A fair cash match here is equal money, not a secret handicap.",
    facts: [
      "FargoRate's own description: ratings come from games won and lost, and equal ratings mean an even game.",
      "About 100 points apart is a 2:1 game-win ratio, about 200 is 4:1, and about 300 is 8:1, as FargoRate states it.",
      "Pros often sit around 700 to 800. Many league players sit around 200 to 700. There is no top or bottom.",
      "It covers 8-ball, 9-ball, and 10-ball on 7-foot or 9-foot tables, with a global optimization daily at 6am GMT.",
      "This table stores no FargoRate and no APA skill level. Stakes are equal.",
    ],
    tableLead:
      "A fargo rate search often wants a handicap. The three products below do not become the same product just because a rating exists somewhere else.",
    tableTitle: "A rating site is not a cashier",
    moneyTitle: "Equal stakes, with the gap left outside",
    moneyLabel: "Rating example",
    stake: 5000,
    checkTitle: "Before you treat a number as a stake",
    checkHead: "Read the rating, then the table",
    checks: [
      "Same FargoRate means even, on FargoRate's own wording.",
      "Do not invent a formula past the 2:1, 4:1, and 8:1 gaps FargoRate publishes.",
      "Remember this site does not read your rating at the cashier.",
      "APA skill levels are a different system. They are not stored here either.",
      "A fair money match is equal stakes, not a hidden race.",
      "Keep the rating talk out of any chat that asks for a wallet seed.",
    ],
    whereTitle: "Ratings beside league nights and the Cup",
    siblings: [
      ["apa-pool-league", "APA skill levels"],
      ["mosconi-cup", "the Cup note that uses FargoRate"],
      ["pool-betting", "equal stakes, not a price"],
    ],
    related: [...money, "apa-pool-league", "mosconi-cup"],
    faqs: [
      { q: "What is a fargo rate?", a: "It is FargoRate's rating of a player from games won and lost. Two players with the same rating are treated as even. The homepage describes the system. This page does not add a private formula on top of that description." },
      { q: "How big is a 100-point gap?", a: "FargoRate says players 100 points apart are about a 2:1 game-win ratio. About 200 points is 4:1. About 300 points is 8:1. Those are the ratios this page will repeat. It will not interpolate a new curve." },
      { q: "What ratings do pros and league players have?", a: "FargoRate says pros are often in the 700 to 800 range, and many league players are in the 200 to 700 range. It also says there is no top and no bottom to the scale." },
      { q: "Which games does it cover?", a: "FargoRate says 8-ball, 9-ball, and 10-ball, on 7-foot or 9-foot tables. A global optimization runs daily at 6am GMT. This site's match is 8-ball only, on a 2.54 m by 1.27 m surface, and it does not submit games to that optimization." },
      { q: "Does this site handicap with FargoRate?", a: "No. No FargoRate is applied. No APA skill level is stored. Both players post $1, $2, $5, $10, $25, or $50. The fee is 5% of the pot. The shorter player does not receive extra games." },
      { q: "Is FargoRate the same as the APA Equalizer?", a: "No. The Equalizer is the APA's skill-level race chart, set through league offices. FargoRate is a separate rating from wins and losses. A Mosconi Cup note uses FargoRate for an illustration. That note is not this cashier." },
    ],
    sections: [
      {
        id: "even",
        title: "Wins, losses, and an even number",
        body: `A fargo rate is FargoRate's running picture of results. The homepage grounds it in games won and lost. If two players carry the same rating, the system calls that matchup even. That is a statement about a large history of games, not a promise about the next rack on a website that never reads the number. You can be even on paper and still play a poor safety today.

The search is large. About 8,100 monthly searches for fargo rate at keyword difficulty 28, and about 4,400 for fargo rating at difficulty 70, are the figures used here. Difficulty 70 is a crowded head term. This page explains the public description. It does not pretend to be the rating site, and it does not pretend the rating settles a pot. Settlement on this site is still the 8-ball replay, rating or no rating.`,
      },
      {
        id: "gaps",
        title: "The gaps FargoRate actually states",
        body: `FargoRate publishes a few ratios and this page stops there. Players about 100 points apart are about a 2:1 game-win ratio. About 200 points apart is about 4:1. About 300 points apart is about 8:1. A 50-point gap, a 12-point gap, or any smoother curve is not something this page will invent. If another article, including an APA note on the Mosconi Cup, prints its own illustration, that illustration stays attributed to that article.

There is no top and no bottom. The scale is not a percentage from 0 to 100. Pros often land around 700 to 800. Many league players land around 200 to 700. Those ranges are FargoRate's description of who tends to sit where. They are not a ladder this site climbs, and they are not a price list. A number in that band does not buy a discount on the fee.`,
      },
      {
        id: "tables",
        title: "Which games go into the number",
        body: `FargoRate says it rates 8-ball, 9-ball, and 10-ball played on 7-foot or 9-foot tables. A global optimization runs daily at 6am GMT. That is the update rhythm on the homepage, not a live tick inside this match. Our playing surface is 2.54 m by 1.27 m, which is a 9-foot playing surface, and the game is 8-ball only. Games here are not described by FargoRate as an input, and this page will not claim they move anyone's rating.

Physics id pool-phys-v2 replays shots. It does not look up a rating before the break. The rack seed shuffles colours. The better player, if there is one, has to aim. No random miss narrows the gap that FargoRate would have described as 2:1 or 8:1. The cloth is the same size for both seats, 2.54 m by 1.27 m, on every rack you post.`,
      },
      {
        id: "not-here",
        title: "Why the cashier ignores the number",
        body: `A fair money match is usually equal stakes, not a secret handicap. This site takes that sentence literally. You post the same dollars as the other player. The fee is 5% of the pot and the winner receives 95%. Nobody receives a shorter race because a rating says they are the underdog. If you want a handicapped race, you are describing league play, and the APA Equalizer is the system that league uses for skill levels. It is a different page.

Stakes remain $1, $2, $5, $10, $25, and $50. Three timeouts forfeit. You call a pocket only on the 8. The 8 on the break wins unless the cue ball scratches. None of those rules consults a rating. Bringing a FargoRate printout into a dispute will not change the replay. The replay is the settlement. Cue upgrades are not sold as a way to close a rating gap either.`,
      },
    ],
    moreTitle: "Using the number without staking it",
    more: [
      `A rating is a conversation about who is likely to win a long series of games. A single rack is a noisy sample of that conversation. Two players 100 points apart are about 2:1 in FargoRate's game-win wording, which still leaves the shorter player winning a game about one time in three. People hear 2:1 and stake as if the result were scheduled. It is not. On this site the stake is equal anyway, so the ratio is background, not a payout table.`,
      `The APA Equalizer does not speak in FargoRate points. It speaks in skill levels and race lengths on a scoresheet. Mixing the words is how a player demands three games on a website that offers one rack for equal cash. Read the Equalizer page if you play APA. Read this page if you want to know why the rating will not move the pot. The sources are the FargoRate homepage and the Equalizer page, and this guide stays inside what those pages support.`,
      `No formula beyond the published ratios appears here on purpose. A clever equation would be an invention. The daily 6am GMT optimization is FargoRate's process, described so you know the number is not a live pulse. This match does not wait for 6am, does not submit a score, and does not store the rating beside your name. Equal cash, a called 8, and a 5% fee are the entire model. The model is small because the match is one rack.`,
    ],
  },
  {
    ...skill,
    slug: "best-pool-cue",
    keyword: "best pool cue",
    secondary: ["pool cue", "pool cue weight", "pool cue tip size"],
    title: "Best Pool Cue: Shop Talk, Not a Brand Rank",
    description:
      "Best pool cue, without a brand rank or an invented price. Common shop talk is 18-21 ounces and a 12-13 mm tip, not a WPA rule. This site does not sell cues.",
    h1: "Best pool cue talk that refuses a shopping list",
    answer:
      "best pool cue is a shopping phrase, and this page will not rank brands or invent a price to answer it. The head term pool cue is far larger, about 22,200 searches a month at keyword difficulty 31 on the figures used here, and this page does not pretend to own it. Best pool cue itself sits nearer 480 searches at difficulty 9. Common shop talk is 18 to 21 ounces and a tip around 12 to 13 mm. That talk is not a WPA specification.",
    facts: [
      "Best pool cue is carried near 480 monthly searches, keyword difficulty 9.",
      "Pool cue, near 22,200 at difficulty 31, is a head term this page does not claim.",
      "18 to 21 ounces and a tip around 12 to 13 mm are labeled as common shop talk.",
      "A Miniclip cue upgrade is cosmetic coins, not cash, and the coin price is not published here.",
      "This site does not sell cues, and cue upgrades are not a product on the table.",
    ],
    tableLead:
      "A search for the best pool cue mixes a real stick, a coin cosmetic, and a cash match that does not sell either one.",
    tableTitle: "A cue in the shop versus a cue on a screen",
    moneyTitle: "The stick is not a line item in the pot",
    moneyLabel: "Cue example",
    stake: 500,
    checkTitle: "Before you trust a cue ranking",
    checkHead: "What this page will say",
    checks: [
      "Do not expect a brand ladder. None is published here.",
      "Treat 18 to 21 ounces as shop talk, not as a rulebook line.",
      "Treat a 12 to 13 mm tip the same way.",
      "Remember a free-game cue upgrade spends cosmetic coins, not cash.",
      "Do not look for a cue to buy on this site.",
      "Play the match with the cue the client already gives you.",
    ],
    whereTitle: "Cue talk beside the table and the rank",
    siblings: [
      ["pool-table-size", "table size and cue room"],
      ["8-ball-pool-rank", "free-game cues and ranks"],
      ["best-pool-games", "which client you are actually in"],
    ],
    related: [...money, "pool-table-size", "8-ball-pool-rank"],
    faqs: [
      { q: "What is the best pool cue?", a: "This page will not name one. Brand ranks and prices would be inventions. Common shop talk puts many playing cues around 18 to 21 ounces with a tip around 12 to 13 mm, and that talk is not a line in the WPA book." },
      { q: "Does a heavier cue pot more balls?", a: "Not by a percentage this site measured. Weight changes feel. Pool-phys-v2 does not add a random miss, and it does not read the brand printed on a stick this website never sold." },
      { q: "What does a Miniclip cue upgrade cost?", a: "The coin price is not published here. Those upgrades are cosmetic coins, not cash. They do not move a US-dollar pot on this site, because this site does not sell cues at all." },
      { q: "Will a new cue change the 5% fee?", a: "No. The fee is 5% of the pot between two players. The cue is not a stake and not a discount. Stakes stay $1, $2, $5, $10, $25, or $50, posted equally." },
      { q: "Is tip size in the WPA rules?", a: "This page does not claim that. The 12 to 13 mm figure is common shop talk, labeled that way so it is not mistaken for a specification in the WPA rules effective 21 October 2026. Read that book for the rules it does contain." },
      { q: "Can I bring a rating and a cue to change the match?", a: "You can own any legal cue you like offline. On this table the match is 1v1 8-ball, call pocket only on the 8, with no FargoRate and no cue shop. The replay settles the shots you played." },
    ],
    sections: [
      {
        id: "shopping",
        title: "A shopping phrase with no shelf",
        body: `Best pool cue is what people type when they want a purchase. This page is the wrong shelf on purpose. Naming a winner among brands would require prices, tests, and a method this site does not have. Inventing those prices would be worse than silence. The head term pool cue, about 22,200 monthly searches at keyword difficulty 31, belongs to manufacturers and retailers. Difficulty 31 on a term that large is not a page this guide is pretending to capture.

What the page can do is separate three objects that share the word. A wood cue in a shop. A picture of a cue inside a free client. The shot you play on a cash table that does not sell equipment. Only the third object is for sale here, and it is the match, not the stick. Best pool cue at about 480 searches and difficulty 9 is still a shopping query. The answer is the refusal.`,
      },
      {
        id: "shop-talk",
        title: "Ounces and millimetres, labeled as talk",
        body: `Walk into a shop and you will hear a narrow band repeated: playing cues often discussed around 18 to 21 ounces, and tips often discussed around 12 to 13 mm. That is common shop talk. It is not a specification this page found in the WPA rules, and it should not be quoted as one. Players outside that band play perfectly well. Break cues are often talked about as heavier. This page will not turn that rumour into a required number either.

A tip that is maintained will hold chalk. A tip that is mushroomed will not. Those are maintenance sentences, not a product review. Shaft taper, joint pin, and wrap are preferences. Listing them as a ranked buyer's guide would smuggle the brand ladder back in. If you want the rulebook, use the WPA file effective 21 October 2026. If you want a cue, use a shop. If you want a pot, use the cashier.`,
      },
      {
        id: "cosmetic",
        title: "Coins on a cue are not cash",
        body: `Free clients sell the look of a cue. A Miniclip-style upgrade spends cosmetic coins. The coin price is not published on this page, so it will not be guessed. The upgrade does not become a US-dollar balance, and it does not travel into this match as a stat. Legendary cues, ranks, and a pass are progression inside that free game. They are described on the rank page. They are mentioned here only so a painted shaft is not confused with an edge.

This site does not sell cues. Cue upgrades are not a button beside the stake. Physics id pool-phys-v2 replays the hit. It does not read a cosmetic. There is no random miss that a prettier stick is allowed to cancel. If your contact point was off, the replay will say so, regardless of the artwork wrapped around a free-game cue you bought with coins somewhere else.`,
      },
      {
        id: "the-hit",
        title: "What actually moves the pot",
        body: `The pot moves when the rules name a winner. You and one opponent post the same stake. The fee is 5% and the credit is 95%. Call a pocket only for the 8. The 8 on the break wins unless the cue ball scratches. Three timeouts forfeit. None of that asks what the cue weighs. A fair match is equal stakes, not a secret handicap and not a secret shaft.

The playing surface is 2.54 m by 1.27 m. A longer cue can matter in a small room, and the table-size page treats extra cue room as a planning figure, not as a WPA line. Room rental prices are not invented here either. Bring whatever legal cue your home table allows. On this website the client provides the stroke. The cashier provides the stake. The two should not be mixed into a store.`,
      },
    ],
    moreTitle: "Feel, fiction, and the fee",
    more: [
      `People defend a cue the way they defend a stance, and both can be real preferences. Preference is not a test. If two sticks feel different in your bridge hand, keep the one you aim with. Do not expect this page to convert that feeling into a make percentage. Ghost-ball aim stays a teaching picture with no measured rate attached. The cue did not earn a statistic by being expensive, and it did not lose one by being a plain house cue.`,
      `A break cue, a playing cue, and a jump cue are shop categories. This match does not ask you to declare which one you are holding, because it is not selling them and it has no jump button. Bar rules often forbid jump shots anyway. Elevate into a masse only if you already understand that the curve is difficult and a safety may be the better pool shot. The equipment conversation ends where the called 8 begins, and the called 8 is the whole finish.`,
      `If a page online ranks ten cues with prices and coupon language, it is a different genre. This one will not copy those prices and will not add a code. The only number in dollars that belongs here is the stake list and the 5% fee. $1, $2, $5, $10, $25, and $50 are the matches. A cue that costs more than the stake is a personal object. It does not sit in the pot, and the replay will not score it.`,
    ],
  },
  {
    ...skill,
    slug: "pool-table-size",
    keyword: "pool table size",
    secondary: ["9 foot pool table", "7 foot pool table", "pool room size"],
    title: "Pool Table Size: 7, 8, and 9 Foot Surfaces",
    description:
      "Pool table size uses the usual 7, 8, and 9 foot names. This playing surface is 2.54 m by 1.27 m. Five feet of cue room is a planning figure, not a WPA line.",
    h1: "Pool table size, named the way shops name it",
    answer:
      "pool table size is usually spoken as 7 foot, 8 foot, or 9 foot, and those names are what people mean in a shop. The figure used for this page is about 2,400 searches a month at keyword difficulty 25. This site's playing surface is 2.54 m by 1.27 m, which is the size of a 9-foot playing surface. A planning figure people use is roughly 5 feet of cue room past the rails. That figure is not a line in the WPA book.",
    facts: [
      "Pool table size is carried near 2,400 monthly searches, keyword difficulty 25.",
      "7 foot, 8 foot, and 9 foot are the usual names, not a price list.",
      "The playing surface here is 2.54 m by 1.27 m.",
      "Roughly 5 feet of cue room past the rails is a planning figure, not a WPA rule.",
      "No room rental price is printed, because this page does not have one to copy.",
    ],
    tableLead:
      "Pool table size changes the walk to a pocket. It does not by itself tell you whether the client pays coins, a prize, or a cash pot.",
    tableTitle: "The same names on three kinds of table",
    moneyTitle: "The cloth is one size. The stake is your choice",
    moneyLabel: "Table example",
    stake: 1000,
    checkTitle: "Before you compare rooms and screens",
    checkHead: "Size, then the rules",
    checks: [
      "Name the table as 7, 8, or 9 foot before you argue about speed.",
      "Use 2.54 m by 1.27 m when you mean this site's playing surface.",
      "Treat five feet of cue room as a planning figure only.",
      "Do not import a room price this page never published.",
      "Remember the game here is still 1v1 8-ball, not a room booking.",
      "Call the pocket only on the 8, on this cloth and any other.",
    ],
    whereTitle: "Size beside the cue and the book",
    siblings: [
      ["best-pool-cue", "cue length and shop talk"],
      ["pool-tournaments", "event rooms versus this cloth"],
      ["8-ball-pool-rules", "what the book actually specifies"],
    ],
    related: [...money, "best-pool-cue", "8-ball-pool-rules"],
    faqs: [
      { q: "What are the usual pool table sizes?", a: "Shops usually say 7 foot, 8 foot, and 9 foot. Bar boxes are often the 7-foot name. A full-size table is the 9-foot name. This page does not add a fourth official name or a price for any of them." },
      { q: "How big is the table on this site?", a: "The playing surface is 2.54 m by 1.27 m. That is the size of a 9-foot playing surface. Every money match uses that cloth. Physics id pool-phys-v2 runs on it, with no random miss." },
      { q: "How much room do you need around a table?", a: "A planning figure people use is roughly 5 feet of cue room past the rails. It is a planning figure, not a sentence in the WPA rules. This page will not convert it into a minimum lease or a dollar cost." },
      { q: "Does a 7-foot table change the rules?", a: "The cloth length changes the walk and the speed. The rules of this match do not. You still call a pocket only for the 8, and the 8 on the break still wins unless the cue ball scratches. The WPA book is a separate ruleset." },
      { q: "Are room prices listed?", a: "No. Inventing a hourly rate for a pool hall would be a fake original. If you need a room, the hall's own board has the figure. This page only has the playing-surface measurement and the planning note about cue room." },
      { q: "Does FargoRate care about table size?", a: "FargoRate's homepage says it covers 8-ball, 9-ball, and 10-ball on 7-foot or 9-foot tables. This site does not apply that rating. The surface size here is stated so you know which cloth the shots use." },
    ],
    sections: [
      {
        id: "names",
        title: "Three names, used loosely and often",
        body: `Pool table size, in ordinary speech, collapses a lot of carpentry into three labels. People say 7 foot for the bar box, 8 foot for a middle table some homes buy, and 9 foot for the table they saw on television. The labels refer to the playing surface more honestly than to the outer cabinet, and even then the inches vary by maker. This page will not publish a secret fourth standard or a tolerance it did not measure.

About 2,400 monthly searches at keyword difficulty 25 is the figure carried for the phrase. That is a real information query. The honest answer is the three names plus the one surface this match actually uses. It is not a catalogue. No slate thickness, no cushion profile, and no branded rail is ranked. Those would be shop specifications this site does not sell and has not tested.`,
      },
      {
        id: "ours",
        title: "The cloth this match always uses",
        body: `The playing surface is 2.54 m by 1.27 m. That rectangle is the size of a 9-foot playing surface, and it is the only one the money match runs. A speed you learned on a 7-foot box will run long here. Long kicks stay long. The ghost ball is still just a picture of contact, with no make percentage published for either size. Physics id pool-phys-v2 replays the shot on this rectangle. It does not roll a miss to simulate a smaller table.

You call a pocket only for the 8. The 8 on the break wins unless the cue ball scratches. Three timeouts forfeit. Stakes are equal: $1, $2, $5, $10, $25, or $50. The fee is 5% of the pot. Table size does not open a second stake list. A bigger cloth is not a handicap and not a FargoRate input on this cashier.`,
      },
      {
        id: "room",
        title: "Cue room is a plan, not a rule",
        body: `People planning a room often leave roughly 5 feet beyond the rails so a cue can be drawn back. Call that what it is: a planning figure. It is not a line in the WPA book effective 21 October 2026, and quoting it as if the association mandated a floor plan would be a false citation. Some rooms have less space and players shoot with a shorter cue or a raised bridge. This page will not police that.

It also will not invent a price for the room. Hourly hall rates, basement renovation costs, and delivery fees for slate are someone else's invoice. If a number is not on that invoice in front of you, it is not on this page. The cue page similarly refuses brand prices. Together the two pages cover the stick and the cloth without becoming a store.`,
      },
      {
        id: "play",
        title: "What size changes, and what it does not",
        body: `Size changes the distance between balls and the time a safety needs. A thin cut on 9 foot is a longer miss than the same angle on 7 foot. Pattern play still means choosing a group with a second ball, and a safety is still correct when the 8 sits at their pocket. English still moves the cue ball more than the object ball. None of those ideas depend on a catalogue.

The WPA rules describe how the games are played. They are the reference when this page talks about call-shot versus our call-the-8-only split. They are not a furniture manual. Jump shots remain absent as a button, and they are often illegal in bar rules regardless of whether the bar box is 7 foot. Bring the size into your stance. Leave the fee at 5%, and leave the room price where the hall printed it.`,
      },
    ],
    moreTitle: "Measuring the cloth you are actually on",
    more: [
      `If you are buying a home table, measure the room before you fall in love with the 9-foot name. The planning figure of roughly 5 feet past the rails is a starting sketch, and stairs, posts, and a low light will edit it. This page stops at the sketch. A salesperson who quotes a different clearance is talking about their product. Write their number on their paperwork. Do not ask a rules guide to launder it into a specification or a fee.`,
      `On this site you do not bring a table. The surface is already 2.54 m by 1.27 m, every match, both seats. That removes the argument about whether someone plays better on a bar box. You both have the long cloth. The edge, if you have one, is the leave and the safety, not the slate. No APA skill level shortens the rectangle. No rank from a free client shrinks it either. Both players walk the same 2.54 m by 1.27 m.`,
      `Tournament television uses large tables, and league nights use whatever the host room owns. Those rooms can be any of the three names. This match is not a weekly bracket and it does not publish a leaderboard of table sizes. One surface, one rule card, one fee. If you need the organizer's purse for a famous event, that number lives on the organizer's page. It is not hiding inside a measurement of the cloth, and this page will not invent the purse to decorate the size.`,
    ],
  },
  {
    ...knowledge,
    slug: "pool-tournaments",
    keyword: "pool tournaments",
    secondary: ["pool tournament", "8 ball tournament"],
    title: "Pool Tournaments Without a Made-Up Bracket",
    description:
      "Pool tournaments belong to organizers. This site has published no weekly bracket and no leaderboard. A money match here is 1v1 8-ball with a 5% fee on the pot.",
    h1: "Pool tournaments, and the bracket this site does not run",
    answer:
      "pool tournaments are events an organizer fields, with a format and a purse that organizer publishes. The figure used here is about 590 searches a month, keyword difficulty 22, and an advertiser cost around $1.64. This site has not published a weekly bracket. It will not invent a leaderboard to look like it has. A money match here remains 1v1 8-ball, equal stakes, fee 5% of the pot.",
    facts: [
      "Pool tournaments is carried near 590 monthly searches, keyword difficulty 22, CPC about $1.64.",
      "No weekly bracket is published on this site.",
      "No leaderboard of invented events is printed to fill that gap.",
      "The US Open and the Mosconi Cup are separate pages, and each stays inside what this site will actually say.",
      "A cash match here is one opponent, not a field of 64.",
    ],
    tableLead:
      "Pool tournaments, prize apps, and a two-player pot all use the word winner. Only one of them is a bracket, and this site is not that one.",
    tableTitle: "A field, an app, and a single rack",
    moneyTitle: "The pot is still two stakes",
    moneyLabel: "Event example",
    stake: 200,
    checkTitle: "Before you call a match a tournament",
    checkHead: "Separate the event from the rack",
    checks: [
      "Ask who publishes the bracket. This site does not.",
      "Do not treat the settled-match list as a leaderboard of events.",
      "Leave purses on the organizer's page unless this guide quoted one, and it did not.",
      "Remember APA functions ban gambling, which is the league's rule.",
      "Stake this table as 1v1 equal cash, not as a race.",
      "Ignore a chat bracket that asks you to pay a stranger first.",
    ],
    whereTitle: "Events that have their own pages",
    siblings: [
      ["us-open-pool", "the US Open search"],
      ["mosconi-cup", "the Mosconi note"],
      ["apa-pool-league", "league nights, not a bracket"],
    ],
    related: [...money, "us-open-pool", "mosconi-cup"],
    faqs: [
      { q: "Does this site run pool tournaments?", a: "No weekly bracket is published here. A leaderboard of made-up stops would be a fake original. When a real bracket exists, it can have a page. Until then the public record is the list of settled 1v1 matches, and that list is not a tour." },
      { q: "What is the entry fee?", a: "There is no tournament entry on this page. A money match has a stake, $1 through $50, matched by the other player. The fee is 5% of the pot at settlement. That is not an entry into a field." },
      { q: "Where do famous purses live?", a: "On the organizer's current materials. This page does not copy a purse for the US Open or a prize for the Mosconi Cup. The US Open guide says the purse was not reproduced. The Cup guide stays inside one APA note." },
      { q: "Is a league night a tournament?", a: "APA play is a league with skill levels and race charts, described on the APA page. It is not this website. The team manual prohibits gambling at APA functions. A cash match here is a different room." },
      { q: "Can two friends set a bracket in chat?", a: "They can play each other here, one match at a time, each posting a stake. A Discord or Telegram room is not an official table, and paying the field off-site is how people get cheated. The cashier is the match." },
      { q: "Does the winner of a rack get a trophy ranking?", a: "No. Ranks in a free client do not transfer. FargoRate is not applied. You win 95% of that pot or you lose the stake. The next rack starts even again." },
    ],
    sections: [
      {
        id: "what-an-event-is",
        title: "An event has a field. A match has two seats",
        body: `Pool tournaments, as players search them, are weekends with a draw, a race length, and a board on the wall. Someone owns the board. Someone collected the entries. Someone will pay the purse they advertised. This website is not that someone. Searching the phrase at about 590 a month, difficulty 22, with advertisers near $1.64 a click, shows the words are commercially busy. Busy is not the same as a bracket living here.

What lives here is a 1v1 8-ball rack. Two stakes, one pot, a 5% fee, a 95% credit. The settled list shows matches the server actually finished. It does not show a season. Treating a handful of pots as a tour leaderboard would invent standings. The page refuses. If you came for a field of players, you are early, and the honest sentence is that no weekly bracket is published yet.`,
      },
      {
        id: "what-we-will-not-print",
        title: "Purses, cities, and dates stay put",
        body: `A tournament page that invents a city, a date, or a dollar figure is worse than a short page. The US Open guide says the purse and the dates are the organizer's current figures and that this site did not copy a number. The Mosconi guide repeats only what one APA note says about the 2025 Cup in London, including that note's rating illustration, and it does not add a 2026 winner. Those limits are the method. This hub page will not break them to look complete.

WPA 9-ball is a fair discipline reference when an event is 9-ball, which is why the US Open page points at the WPA book rather than at a guessed organizer URL. This match is not that event. It is 8-ball. You call a pocket only for the 8. The break 8 wins unless the cue ball scratches. Do not enter a 9-ball final in your head and then mis-call an 8-ball rack.`,
      },
      {
        id: "league",
        title: "League nights are not a side door",
        body: `APA pool is the large league search, and it has its own page because the Equalizer is a real system: skill levels from the local office, races that give or get games, and a team manual that prohibits gambling at APA functions. None of that is a tournament bracket this site hosts. None of it is stored on your account here. You do not have an SL number in the cashier.

FargoRate is a different number, from wins and losses, and it is also not applied. A fair money match is equal stakes. If a room wants a handicapped race to 5 or to 11, that room is not this table. The Cup note uses those race ideas for its own illustration. Quoting them here would turn a league document into a product feature. It is not a feature. The feature is one rack for equal cash.`,
      },
      {
        id: "how-to-play-anyway",
        title: "What you can play while no bracket exists",
        body: `You can still play one opponent for a stake. A friend matches the same dollars. You cannot both sit on one account. Settlement is the replay under pool-phys-v2, on a 2.54 m by 1.27 m surface, with no random miss. Three timeouts forfeit. Cue upgrades are not sold. A make-on-the-break rate is not published, so a tournament side bet on the break 8 has no odds from this site to use.

That is a full offer. It is smaller than a poster that says national championship. The smaller offer is the true one. When a bracket is real, the page can name the format, the fee, and the field without fiction. Until that day, the internal links go to the US Open, the Cup note, and the APA page so the famous events stay accurate, and the play button goes to a single rack.`,
      },
    ],
    moreTitle: "Keeping a tour page from becoming fiction",
    more: [
      `Advertiser cost is not a purse. The $1.64 figure is what the search estimate suggests a click might cost, on the numbers used for this page. It is not a buy-in and not a return. People see a commercial keyword and assume a casino is hiding a tournament behind it. The hiding would be the dishonest part. The sentence on the table is simpler: no weekly bracket, no invented leaderboard, a 5% fee on a two-player pot if you want to play tonight.`,
      `Formats you may have played elsewhere include race-to-a-number, double elimination, and a hill. Those words are real in rooms that publish them. This page will not assign them to a ghost event. It will not say this site is on the hill in a final that does not exist. If you and a friend want a longer session, play another equal-stake rack after the first one settles. That is a session. It is not a bracket with a name or a trophy.`,
      `Cheating risk shows up when a chat account offers a private tournament and a wallet address. The official table is the cashier. Discord and Telegram are not rooms this site operates. A seed phrase is never the entry fee. Close that message. Then, if you still want a match, both players post inside the product, the rules name a winner, and 95% of the pot is the credit. That sequence does not need a flyer, a private admin, or a second purse.`,
    ],
  },
  {
    ...knowledge,
    slug: "us-open-pool",
    keyword: "us open pool",
    secondary: ["us open 9 ball", "us open billiards"],
    title: "US Open Pool: Open 9-Ball, Purse Not Copied",
    description:
      "US open pool is an open 9-ball tournament people search by that name. Purse and dates are the organizer's current figures. This page did not copy a number.",
    h1: "US open pool, named without borrowing the purse",
    answer:
      "us open pool is the search people use for an open 9-ball tournament, and this page does not copy that event's purse or its dates. The figure used here is about 480 searches a month at keyword difficulty 12. The purse and the dates are the organizer's current figures. This page did not copy a number, did not name a city, and did not invent a web address for the organizer.",
    facts: [
      "US open pool is carried near 480 monthly searches, keyword difficulty 12.",
      "It is an open 9-ball tournament under that search, not an 8-ball bracket on this site.",
      "The purse and the dates stay with the organizer. No figure was copied onto this page.",
      "WPA 9-ball is the discipline reference. No organizer URL is invented beside it.",
      "This match is 1v1 8-ball with a 5% pot fee, which is a different product.",
    ],
    tableLead:
      "US open pool names a public 9-ball event. A free client, a prize app, and this 8-ball pot are not that event, even when the search lands on them.",
    tableTitle: "An open event versus a two-player pot",
    moneyTitle: "Our pot is not their purse",
    moneyLabel: "Open example",
    stake: 2500,
    checkTitle: "Before you mix the Open with this table",
    checkHead: "Keep the event where it lives",
    checks: [
      "Read the purse on the organizer's current page, not here.",
      "Do not expect a city or a date from this guide.",
      "Use the WPA 9-ball book as the discipline reference, not as a purse.",
      "Do not follow a link this page never published for the organizer.",
      "Play this site as 8-ball, call pocket only on the 8.",
      "Treat a chat that sells Open tickets for crypto as a closed door.",
    ],
    whereTitle: "Other events with the same restraint",
    siblings: [
      ["pool-tournaments", "why no bracket is published here"],
      ["9-ball-rules", "9-ball as a discipline"],
      ["mosconi-cup", "another event kept inside its source"],
    ],
    related: [...money, "pool-tournaments", "9-ball-rules"],
    faqs: [
      { q: "When is the US Open of pool?", a: "The dates are the organizer's current figures. This page did not copy a number, so it will not answer with a calendar day. Check the organizer. This guide also does not name a city." },
      { q: "What is the purse?", a: "The purse is whatever the organizer currently publishes. The event page's purse is not reproduced here. Copying a dollar figure from memory, or from an old article, would be how a wrong number gets a second life." },
      { q: "Is it 8-ball or 9-ball?", a: "People searching us open pool are looking for an open 9-ball tournament. WPA 9-ball is the discipline reference for that game. This website's money match is 8-ball, one opponent, call a pocket only for the 8." },
      { q: "Where is the official site?", a: "This page does not invent a URL for the organizer. If you do not already have the organizer's address from them, this guide will not guess one. The WPA rules index is linked because it is the discipline book, not because it is the event flyer." },
      { q: "Can I bet the Open here?", a: "No. There is no sportsbook price on a televised final, and there is no side pot on a player you are not facing. The stake, if you play, is your own 8-ball rack against one opponent, fee 5% of the pot." },
      { q: "Does a FargoRate pick the Open winner?", a: "This page does not have a winner to pick, and it does not apply FargoRate to its own table. Ratings are a different subject. They are not a substitute for the organizer's draw sheet, which is also not copied here." },
    ],
    sections: [
      {
        id: "the-search",
        title: "What the search is pointing at",
        body: `Us open pool is a proper-name search wearing ordinary words. People want the open 9-ball tournament that has carried that name in public conversation, not a random 8-ball app. About 480 monthly searches at keyword difficulty 12 is the figure used here. Difficulty 12 means a specific page can be useful if it tells the truth. The truth this page has is mostly a boundary: the event is 9-ball, it is open in the sense players use that word, and the commercial details are not ours to reprint from memory.

Secondary phrases such as us open 9 ball and us open billiards land in the same neighbourhood. Billiards, in casual speech, is often just pool. This guide uses it as a search, not as a claim that the event is a carom-billiard tournament. The discipline reference is WPA 9-ball. The rules PDF and the rules index are linked so a reader can see what 9-ball's book looks like. They are not a results service.`,
      },
      {
        id: "purse",
        title: "Purse and dates stay on the organizer's page",
        body: `The purse and the dates are the organizer's current figures. This page did not copy a number. That sentence is the whole financial section, and it is short on purpose. An old purse copied into a new year becomes a lie with a citation-shaped shadow. A city copied from a memory of a previous stop has the same problem. Neither a city nor a date nor a prize appears below this paragraph, because none was taken from a page this guide is willing to treat as the organizer's current board.

The event page's purse is not reproduced. If you need the figure for a trip or a stake you are considering elsewhere, use the organizer's own material from today. This guide will not supply a URL it had to invent to look helpful. Helpful, here, is the refusal. A keyword difficulty of 12 is not a reason to decorate the page with a dollar sign.`,
      },
      {
        id: "nine-ball",
        title: "9-ball is the discipline. This table is 8-ball",
        body: `WPA 9-ball is the right book to name when someone asks what game the Open is. This page does not restate a private summary of every 9-ball foul. The book is the reference, and the link is the way to read it. What this page will say, because it is about our product as well as the search, is that the money match on this site is not that discipline. It is 1v1 8-ball. You call a pocket only for the 8. The 8 on the break wins unless the cue ball scratches. The WPA 8-ball book effective 21 October 2026 is call-shot and does not award a break 8. Two books, two games, and an event that is a third thing: a 9-ball field we do not run.

No weekly bracket of ours should be imagined as a satellite to the Open. No leaderboard on this site is an Open qualifier. Those sentences are here so a template does not grow them later.`,
      },
      {
        id: "if-you-play-here",
        title: "If you still want a stake tonight",
        body: `Play one person. Post the same stake they post, from $1, $2, $5, $10, $25, and $50. The fee is 5% of the pot and the winner is credited 95%. There is no house opponent paying you from a house bankroll, which is the distinction the casino page draws. There is no FargoRate and no APA skill level on the account. Three timeouts forfeit. The surface is 2.54 m by 1.27 m. Physics id pool-phys-v2 adds no random miss. A make-on-the-break rate is not published, so do not build an Open-style prop on a number we do not have.

Cue upgrades are not sold. A free-game rank does not seed you into a national event. If someone in a direct message offers a package deal on the Open and asks for a seed phrase, stop. Money matches that this site actually offers belong on the cashier. The Open's own tickets, if they exist this year, belong to the organizer's current process, which this page did not copy.`,
      },
    ],
    moreTitle: "How to read an event page that withholds the purse",
    more: [
      `Withholding a number is a kind of accuracy. Readers sometimes feel a page is thin because the purse box is empty. The empty box is the claim: we did not copy it. Fill it from the organizer, the same day you need it, because purses move and dates move. A guide that froze last year's poster would outrank a careful page and still be wrong. Keyword difficulty 12 is an invitation to be the careful page, not the loud one.`,
      `9-ball and 8-ball share a table shape and then split. The Open search is 9-ball. Our stake is 8-ball. If you practice here and then play a 9-ball event, re-read the WPA 9-ball book before you assume a ball-count or a push-out you remember from a comment. This guide will not invent those clauses. It will point at the book. The book can change its wording. The link is how you notice the change. Bring the book, not a paraphrase.`,
      `A fair personal match remains equal stakes. The Open, whatever its handicap policy is this season, is not a template we stored. We did not store one. You will not find a secret race length behind the $25 button. You will find another player who posted $25, a 5% fee, and a replay. That is smaller than a national open. It is also the thing this website can describe without borrowing someone else's poster, their city, or a single date.`,
    ],
  },
  {
    ...knowledge,
    sources: mosconiSources,
    slug: "mosconi-cup",
    keyword: "mosconi cup",
    secondary: ["mosconi cup pool", "mosconi cup 2025"],
    title: "Mosconi Cup: Only What the 2025 Note Says",
    description:
      "Mosconi cup, limited to an APA note on the 2025 London event: five-player teams and that note's rating example. No 2026 winner, dates, or prize is added.",
    h1: "Mosconi cup facts that stay inside one note",
    answer:
      "mosconi cup, on this page, means only what an APA note says about the 2025 event. That note places the Cup in London, with five-player teams, and with singles, doubles, and team. The figure used for the search is about 1,300 monthly searches, keyword difficulty 38, advertiser cost about $0.66. This page does not add a 2026 winner, dates, or prize money.",
    facts: [
      "The APA note places the 2025 Mosconi Cup in London.",
      "The note describes five-player teams, and singles, doubles, and team play.",
      "The note describes races as race-to-five inside race-to-11 matches.",
      "The note's average-rating illustration is 12.6 FargoRate points, a bit under 52% per game, 55.3% for a theoretical race to five, and about 68.5/31.5 for a race to 11.",
      "Those percentages belong to the note. This page does not add a 2026 winner, a date, or a prize.",
    ],
    tableLead:
      "Mosconi cup traffic wants a team event. A coin client, a prize app, and this equal-stake 8-ball rack are not that event.",
    tableTitle: "A team cup versus a two-player pot",
    moneyTitle: "No cup prize is converted into a pot",
    moneyLabel: "Cup example",
    stake: 100,
    checkTitle: "Before you repeat a Cup statistic",
    checkHead: "Attribute, then stop",
    checks: [
      "Say London, five-player teams, and singles, doubles, and team only as the note says them.",
      "Call the race shape race-to-five inside race-to-11, as the note describes it.",
      "Attribute 12.6 points and the percentages to that note, not to a formula you built.",
      "Do not announce a 2026 winner.",
      "Do not add prize money or a date the note did not give this page.",
      "Remember this site's match is equal-stake 8-ball, not a Cup session.",
    ],
    whereTitle: "The note sits next to the rating and the league",
    siblings: [
      ["fargo-rate", "FargoRate's own gaps"],
      ["apa-pool-league", "the league that published the note"],
      ["us-open-pool", "another event with an uncopied purse"],
    ],
    related: [...money, "fargo-rate", "apa-pool-league"],
    faqs: [
      { q: "Where was the 2025 Mosconi Cup?", a: "The APA note this page uses says the 2025 Cup was in London. This guide does not add other host cities, and it does not invent a 2026 location." },
      { q: "How are the teams built?", a: "The same note describes five-player teams. It also describes singles, doubles, and team. This page does not add roster rules beyond that sentence." },
      { q: "What races does the note describe?", a: "The note describes races as race-to-five inside race-to-11 matches. That is the note's wording for the format it is discussing. It is not a race length stored on this website." },
      { q: "What is the 12.6 point example?", a: "It is the note's own average-rating illustration: 12.6 FargoRate points, described there as a bit under 52% per game, 55.3% for a theoretical race to five, and about 68.5/31.5 for a race to 11. Those figures are the note's. This page did not derive them." },
      { q: "Who won in 2026, and what was the prize?", a: "This page does not know, and it will not invent a 2026 winner, dates, or prize money. If you need the current Cup, use a source from this season. The note linked here is about 2025." },
      { q: "Does this site play Mosconi format?", a: "No. The match is 1v1 8-ball, equal stakes, fee 5% of the pot. No FargoRate is applied. Five-player teams and race-to-11 matches are the note's subject, not a mode in the lobby." },
    ],
    sections: [
      {
        id: "format",
        title: "Only the format the note actually gives",
        body: `The mosconi cup page on this site is a reading of one APA note, not a Wikipedia of the event. The note says the 2025 Cup was in London. It says the teams were five players. It says the sessions included singles, doubles, and team. It describes the races as race-to-five inside race-to-11 matches. Those clauses are the format section. A roster, a session order, a television schedule, and a ball sponsor are not in that list, so they are not here.

About 1,300 monthly searches at keyword difficulty 38, with an advertiser cost around $0.66, explains why a thin page is tempting. Difficulty 38 is a fight with stronger domains. Winning that fight with invented session scores would be a loss of a different kind. The note is linked. Read it beside this summary. If this summary and the note ever diverge, the note is the source and this paragraph should be corrected, not embroidered.`,
      },
      {
        id: "illustration",
        title: "The rating illustration is the note's, not ours",
        body: `The note includes an average-rating illustration of 12.6 FargoRate points. It describes that gap as a bit under 52% per game. It describes a theoretical race to five at 55.3%. It describes a race to 11 at about 68.5/31.5. This page repeats those figures only as the note's figures. It does not smooth them, and it does not claim FargoRate's homepage printed 55.3% for a 12.6 point gap. The homepage has its own ratios: about 2:1 at 100 points, 4:1 at 200, 8:1 at 300. Twelve points is not one of those headlines, so this guide does not stretch the headline down to 12.6.

Attribute the Cup percentages to the APA note every time you repeat them. A caption that says FargoRate proved 68.5% would be a mis-citation. The note did the illustration. FargoRate is linked so a reader can see what the rating project itself says about larger gaps.`,
      },
      {
        id: "absent",
        title: "What a 2026 recap would have to come from",
        body: `A 2026 winner is not on this page. Dates for a later Cup are not on this page. Prize money is not on this page. The absence is not a hint that the event ended, and it is not a hint that it paid a particular sum. It is a limit on the source. The source in hand is a note about 2025. Writing a champion's name from a social post this guide did not adopt would be an invention with a flag next to it.

The same limit covers the purse. The US Open page uses the same method for a different event: the organizer's current figures stay there, and this site does not copy a number. The Cup gets no special exemption because the search is larger. Keyword difficulty 38 can be answered with a boundary. A boundary is allowed to be the main point of a page.`,
      },
      {
        id: "our-match",
        title: "An equal-stake rack is not a session of the Cup",
        body: `This website's match is 1v1 8-ball. Both players post the same stake. The fee is 5% of the pot. Nobody receives a race to five because a rating gap is 12.6 points, and nobody plays a race to 11. No FargoRate is stored. No APA skill level is stored. The note's percentages are about a theoretical matchup in that article. They are not a payout table for the $1, $2, $5, $10, $25, or $50 button.

You call a pocket only on the 8. The 8 on the break wins unless the cue ball scratches. Three timeouts forfeit. The surface is 2.54 m by 1.27 m under pool-phys-v2, with no random miss. A five-player team cannot share a seat. If you want the Cup, watch the event the organizers are actually running this year, from their own materials. If you want a stake, post it against one opponent and let the replay settle.`,
      },
    ],
    moreTitle: "Repeating the note without extending it",
    more: [
      `London, five players, singles, doubles, and team, race-to-five inside race-to-11: that is a paragraph you can say aloud and still be inside the note. The moment you add a session score, you have left. The moment you add a captain's decision or a substituted player, you have left. This page would rather be short than early. The search volume, about 1,300, will attract pages that are early. Let them carry the corrections. Ours carries the link, the limit, and nothing past them.`,
      `The 12.6 point illustration is easy to misuse because the percentages look precise. 55.3% and 68.5/31.5 feel like a calculator you could extend. Do not extend them. The note chose an average gap and showed what that article's arithmetic did with a race to five and a race to 11. A different gap is a different article. FargoRate's own 100-point, 200-point, and 300-point ratios are the only other gaps this site will quote, and they are quoted on the FargoRate page as homepage facts, not as Cup results.`,
      `Players who stake here sometimes want the match to feel like a session of the Cup. It will not. There is no doubles partner, no team point, and no hill called from a stage. There is a friend, or a stranger in the lobby, matching your stake. Settlement is the shot replay. A fair money match is equal stakes, not a secret handicap built from the note's 12.6 points. Leave the note in the article. Leave the pot in the cashier.`,
    ],
  },
  {
    ...knowledge,
    sources: apaSources,
    slug: "apa-pool-league",
    keyword: "apa pool",
    secondary: ["apa 8 ball", "apa skill level", "apa equalizer"],
    title: "APA Pool: Skill Levels, Races, and the Ban",
    description:
      "APA pool sets skill levels at the local league office. In 8-ball you give or get games. The manual bans gambling at APA functions. No skill level is stored.",
    h1: "APA pool, as the league describes the handicap",
    answer:
      "apa pool is a league system that sets skill levels and race lengths, and it is not the 1v1 cash table on this site. The figure used for the phrase is about 12,100 searches a month at keyword difficulty 51. Skill levels are set by the local league office from scoresheets, records, tournament results, and handicap committees. This page does not copy the whole race chart. It also does not store an APA skill level on your account.",
    facts: [
      "APA pool is carried near 12,100 monthly searches, keyword difficulty 51. This page does not pretend to be the league.",
      "The local league office sets skill levels from scoresheets, records, tournament results, and handicap committees.",
      "In 8-ball you give or get games. The scoresheet chart says how long each skill level's race is.",
      "A published example: SL6 against SL4 races 5 to 3. SL5 against a non-rated player, who plays as SL3, races 4 to 2.",
      "The team manual prohibits gambling at APA functions. In 9-ball, balls are points and the 9 is worth two.",
    ],
    tableLead:
      "APA pool is a league with a handicap. A free client, a prize app, and this equal-stake table are not that league, even if the search arrives here.",
    tableTitle: "A league night versus a cash rack",
    moneyTitle: "Equal games are not an APA race",
    moneyLabel: "League example",
    stake: 500,
    checkTitle: "Before you import a skill level",
    checkHead: "League rules stay at the league",
    checks: [
      "Let the local office set the skill level. This site will not.",
      "Use only the two race examples this page actually quotes.",
      "Do not paste the rest of the scoresheet chart from memory.",
      "Remember a non-rated player in the published example plays as SL3.",
      "Do not gamble at an APA function. The team manual prohibits it.",
      "Stake this website as equal cash, with no SL stored.",
    ],
    whereTitle: "The league beside the rating and the Cup",
    siblings: [
      ["fargo-rate", "a rating that is not a skill level"],
      ["mosconi-cup", "the 2025 Cup note"],
      ["pool-tournaments", "events versus a weekly league"],
    ],
    related: [...money, "fargo-rate", "mosconi-cup"],
    faqs: [
      { q: "Who assigns an APA skill level?", a: "The local league office, using scoresheets, records, tournament results, and handicap committees. A website that is not that office cannot assign one. This site does not try." },
      { q: "How does the 8-ball handicap work?", a: "You give or get games. A chart on the scoresheet says how many games each skill level races to. This page does not copy the whole chart. The published example it will use is SL6 versus SL4 racing 5 to 3." },
      { q: "What does a new player race to?", a: "In the published example, a non-rated player plays as SL3. SL5 against that non-rated player races 4 to 2. Do not promote that example into a full chart of every other pairing." },
      { q: "How does APA 9-ball score?", a: "Balls are points, and the 9 is worth two. That is the scoring idea this page will state. It is not a claim that this website runs APA 9-ball. Our match is 8-ball only." },
      { q: "Can you gamble at an APA event?", a: "The official team manual prohibits gambling at APA functions. That includes the league's own list of wagering practices. It is a rule of APA events. It is not, by itself, a legal opinion about every private table in the country." },
      { q: "Will this site shorten my race if I am a lower SL?", a: "No. No APA skill level is stored. Both players post the same stake. The fee is 5% of one pot. There is no race to 5 and no race to 2 hiding behind the button." },
    ],
    sections: [
      {
        id: "who-sets",
        title: "The office sets the number, not the player",
        body: `Apa pool, at about 12,100 searches a month and keyword difficulty 51, is the league's own name used as a query. Difficulty 51 means the league, its app, and its host rooms already answer it. This page explains the handicap in public language and then says what this cashier does not do. It does not pretend to outrank the league on the head term.

Skill levels are set by the local league office. The inputs the Equalizer page describes are scoresheets, records, tournament results, and handicap committees. A player does not pick a flattering number on the way in the door. A non-rated player, in the published example this guide is allowed to use, plays as SL3. That example is not a promise about every new player in every format. It is the example the Equalizer page gives, and this summary stops at it.`,
      },
      {
        id: "eight-ball",
        title: "8-ball gives or gets games",
        body: `In APA 8-ball you give or get games. The chart printed on the scoresheet says how many games each skill level races to. Copying that whole chart onto a third-party page would freeze a document the league can revise, and this guide was told not to copy the whole chart. Two published examples are enough to show the shape. SL6 against SL4 races 5 to 3. SL5 against a non-rated player, who plays as SL3, races 4 to 2. The higher skill level races longer. The lower skill level races shorter. That is the handicap: games, not a secret weight on the cue ball.

If your pairing is not one of those two, look at the scoresheet in the league, or at the Equalizer page, rather than asking this guide to extrapolate. Extrapolation is how a wrong race length gets played for a night.`,
      },
      {
        id: "nine-and-ban",
        title: "9-ball points, and the gambling prohibition",
        body: `In APA 9-ball, balls are points and the 9 is worth two. That is a different handicap from giving games in 8-ball. This site runs neither format. Stating the 9-ball point so a reader can tell the games apart is as far as the summary goes. No point value for the other balls is invented beside it.

The official team manual prohibits gambling at APA functions. The prohibition is the league's rule for the league's events. Players who want the full list of what the manual counts as gambling should read the manual, which is linked, rather than a paraphrase that might drop a clause. This page's own cash matches are not APA functions. They are also not a suggestion that you wager inside one. If you are at an APA function, follow the manual. If you are on this website, you are in a different room, and you still have to be allowed to stake where you live.`,
      },
      {
        id: "not-stored",
        title: "Nothing in the cashier is an SL",
        body: `No APA skill level is stored on this account. A fair money match here is equal stakes, not a secret handicap. You do not give games and you do not get games. You post $1, $2, $5, $10, $25, or $50, the same as the other seat. The fee is 5% of the pot. The winner receives 95%. FargoRate is a separate system and is not applied either. The Mosconi note's race-to-five and race-to-11 language stays in that note.

The rules you do play are 8-ball, call pocket only on the 8, break 8 wins unless the cue ball scratches, three timeouts forfeit, surface 2.54 m by 1.27 m, physics pool-phys-v2, no random miss. Cue upgrades are not sold. A make-on-the-break rate is not published. Those are the house facts of this table. They are not a replacement Equalizer, and they should not be carried back into a league night as if the league had adopted them.`,
      },
    ],
    moreTitle: "Using two examples without redrawing the chart",
    more: [
      `SL6 versus SL4 at 5 to 3 is one cell. SL5 versus a non-rated SL3 at 4 to 2 is another cell. A reader who builds the rest of the grid from those two cells is guessing. The scoresheet is the grid. The Equalizer page is the explanation of who fills it in. This guide's job is to show that the handicap is a race length, that the office owns the skill level, and that a cash website with one rack is a different instrument. Stop at the two examples when you quote us.`,
      `The gambling ban is narrow and serious. Narrow, because it governs APA functions, not every private table on earth. Serious, because the manual is the league's own document and the link is right here. Do not soften it into a suggestion. Do not widen it into a claim that this paragraph has settled the law where you live. Law is not what a team manual is for. The manual is for the function. Read it before you put a side pot on a league match.`,
      `Difficulty 51 on a 12,100-search phrase is a clue to stay useful and modest. Useful is the office, the two examples, the 9-ball point, and the ban. Modest is the refusal to host a fake league, to store an SL, or to sell a cue that claims to raise one. Your match here, if you play one, is equal cash against one person. The replay names the winner. The league, if you also play there, keeps its own book and its own chart.`,
    ],
  },
  {
    ...skill,
    slug: "8-ball-pool-1v1",
    keyword: "8 ball pool 2 player",
    secondary: ["8 ball pool multiplayer", "8 ball pool 1v1", "two player pool"],
    title: "8 Ball Pool 2 Player: One Opponent, One Stake",
    description:
      "8 ball pool 2 player here means one opponent and a matched stake. Two people cannot share an account. The replay settles it. The winner gets 95% of the pot.",
    h1: "8 ball pool 2 player, as one stake against one person",
    answer:
      "8 ball pool 2 player, on this site, means one opponent and a stake that opponent matches. The figures used here put the phrase near 320 searches a month at keyword difficulty 79, multiplayer near 320 at difficulty 80, and 1v1 near 30 at difficulty 0. You can play one person for a stake. You cannot both sit on the same account. Settlement is the replay.",
    facts: [
      "8 ball pool 2 player is carried near 320 monthly searches, keyword difficulty 79.",
      "8 ball pool multiplayer is near 320 at difficulty 80. 8 ball pool 1v1 is near 30 at difficulty 0.",
      "A friend matches the stake. The account is not shared.",
      "Settlement is the shot replay, not a screenshot in a chat.",
      "The winner receives 95% of the pot. The fee is the other 5%.",
    ],
    tableLead:
      "8 ball pool 2 player can mean a couch, a free lobby, or a cash seat. Only the cash seat has a pot this page will price.",
    tableTitle: "Two players, three very different cashiers",
    moneyTitle: "What the matched stake returns",
    moneyLabel: "Two-player example",
    stake: 1000,
    checkTitle: "Before the second player sits",
    checkHead: "One account each",
    checks: [
      "Use two accounts. Sharing one is not a match.",
      "Match the stake exactly. The list is $1, $2, $5, $10, $25, and $50.",
      "Expect settlement from the replay, not from a DM.",
      "Call a pocket only when the ball is the 8.",
      "Treat three timeouts as a forfeit of that seat.",
      "Keep the seed phrase out of the invite.",
    ],
    whereTitle: "Two-player pages around the pot",
    siblings: [
      ["8-ball-pool-hub", "the online hub"],
      ["8-ball-pool-casino", "a house bank versus a pot"],
      ["crypto-8-ball-pool", "funding the stake"],
    ],
    related: [...money, "8-ball-pool-hub", "crypto-8-ball-pool"],
    faqs: [
      { q: "Can two people play one account?", a: "No. You cannot both sit on the same account. Each player has a seat and a balance. Passing the phone so the same login plays both sides is not a 1v1 match and it is not how a pot is supposed to be posted." },
      { q: "How does a friend join?", a: "A friend matches the stake. You both choose the same amount from the published list and play the rack. There is no extra entry fee on top of the 5% that comes off the pot at settlement." },
      { q: "What settles the argument?", a: "The replay. The server recomputes the shots under pool-phys-v2. A screenshot, a chat vote, or a louder friend does not replace it. The rack seed shuffled the colours. It did not pick the winner." },
      { q: "Is multiplayer the same as a tournament?", a: "Multiplayer here means more than a solo drill: one opponent. It does not mean a bracket. No weekly tournament is published. 8 ball pool 1v1 is the small search for the same idea." },
      { q: "Do you call every ball?", a: "You call a pocket only for the 8. Other balls may fall in any pocket. The 8 on the break wins unless the cue ball scratches. That is not the WPA call-shot book effective 21 October 2026." },
      { q: "Can crypto be the stake itself?", a: "Bitcoin, USDC, or ETH on Base can fund the US-dollar balance. The stake and the payout are in that balance. There is no separate two-player token, and nobody needs your seed phrase to start the rack." },
    ],
    sections: [
      {
        id: "one-opponent",
        title: "One opponent is the whole field",
        body: `8 ball pool 2 player is a crowded phrase, near 320 searches at keyword difficulty 79, because free apps already own the words. Multiplayer sits in the same neighbourhood, near 320 at difficulty 80. The small phrase 8 ball pool 1v1, near 30 at difficulty 0, is the one this product actually is. You play one person. That person is not a house dealer and not a roster of five. When the rack ends, one of you is credited.

Difficulty 79 is not a promise this guide will outrank the app stores. The guide exists so the cash version of two players has a page that states the fee, the account rule, and the replay. A couch game with one phone is a real way to spend an evening. It is not a pot. A pot needs two balances and two names on the replay.`,
      },
      {
        id: "accounts",
        title: "Two seats, two logins, one stake each",
        body: `You cannot both sit on the same account. The reason is ordinary: the stake has to come from two places, and the winner has to be a different seat from the loser. If one login plays both sides, there is nothing to settle and nobody for the replay to pay. A friend who wants the match creates a seat and matches the stake. Matching means the same dollars, chosen from $1, $2, $5, $10, $25, and $50.

There is no handicap inside that match. No FargoRate shortens one side. No APA skill level gives games. A fair money match is equal stakes. If you wanted to spot your friend a race to 3 against your race to 5, you are describing a league scoresheet, not this button. Play even, or play the league, and do not mix the vocabulary in one pot.`,
      },
      {
        id: "replay",
        title: "Settlement is the replay",
        body: `The argument, if there is one, ends when the server recomputes the shots. That recomputation is the settlement. It uses physics id pool-phys-v2. It does not add a random miss, so a thin cut that missed was a thin cut. The rack seed was hashed before the balls were shown and it only shuffles colours. The 8 stays in the centre of the rack. A browser cannot file a win the replay rejects.

The fee is 5% of the pot, taken when the match settles. The winner's credit is 95%. A cancel before the break returns both stakes and charges nothing. Three timeouts forfeit the seat that burned them. You call a pocket only for the 8. The 8 on the break wins unless the cue ball scratches. Those rules are the match. A chat message is not a second settlement desk.`,
      },
      {
        id: "where-not",
        title: "Where a two-player game should not move",
        body: `Money matches belong on the cashier. They do not belong in a direct message, a Discord room, or a Telegram chat. This site does not run an official table in those apps. Finding a stranger there and paying them off-site is how people get cheated. A seed phrase is never part of the invite. If the message asks for one, it is not your friend being careful. It is the end of the conversation.

The playing surface is 2.54 m by 1.27 m. Cue upgrades are not sold, so a cosmetic cue from a free two-player app does not change this physics. A make-on-the-break rate is not published, and a ghost-ball make percentage is not published. Play the person in the other seat. Let the replay name the winner. Then stop, or post another equal stake if you both still want one.`,
      },
    ],
    moreTitle: "Sharing a table without sharing a login",
    more: [
      `A two-player game on a couch can still teach the leave. Take turns, call the 8 if you are copying this site's rule, and ignore the fee because there is no pot. When the same two people want the result to move money, they move to two accounts. The feel of the shot can stay. The cashier cannot stay imaginary. 8 ball pool 2 player, once cash is involved, is a published stake and a published 5%, not a handshake the replay never saw.`,
      `Keyword difficulty 79 and 80 are the free-app wall. This page does not climb it by repeating multiplayer in every sentence. It climbs nothing. It states that one opponent, a matched stake, and a replay are available, and that a shared login is not. The tiny 1v1 phrase, difficulty 0, is where that statement fits most cleanly. Use the hub if you want the map of crypto funding. Use this page if you only needed the headcount: two seats, one rack.`,
      `Three timeouts forfeit, which matters more against a friend than it sounds. Friends talk. The clock still runs. Agree before the break that a timeout is a rules event, not an insult. Agree that the 8 in the wrong pocket loses. Agree that equal stakes are the handicap. Then play. If the session should end, it ends. The responsible-gambling limit is a number you pick, not a number the opponent picks for you in chat after the break has already started.`,
    ],
  },
  {
    ...skill,
    slug: "8-ball-pool-casino",
    keyword: "8 ball pool casino",
    secondary: ["8 ball casino game", "pool casino game"],
    title: "8 Ball Pool Casino: House Bank Versus a Pot",
    description:
      "8 ball pool casino usually means a house game paid from the house bankroll. This table pays from the other player's stake minus 5%. There is no house opponent.",
    h1: "8 ball pool casino, and who actually pays the winner",
    answer:
      "8 ball pool casino is the phrase people use when they expect a house game, and a house game pays from the house bankroll. The figure used here is about 20 searches a month at keyword difficulty 0. This table pays from the other player's stake minus 5%. There is no house opponent shooting back at you, and there is no house edge hiding inside the balls.",
    facts: [
      "8 ball pool casino is carried near 20 monthly searches, keyword difficulty 0.",
      "A house game pays the winner from the house bankroll.",
      "This table pays the winner from the other player's stake, minus a 5% fee.",
      "The fee is not a second edge stacked on a random miss. Shots are not randomly missed.",
      "You still play 8-ball, call pocket only on the 8, against one person.",
    ],
    tableLead:
      "8 ball pool casino sounds like a house game. The three columns below show a coin table, a prize app, and a player pot that never was the house.",
    tableTitle: "Who funds the payout",
    moneyTitle: "A pot is not a house bankroll",
    moneyLabel: "Casino example",
    stake: 200,
    checkTitle: "Before you call this a house game",
    checkHead: "Name the bankroll",
    checks: [
      "Ask who pays you. Here it is the other player's stake.",
      "Write the fee as 5% of the pot, not as a hidden wheel.",
      "Do not look for a house shooter.",
      "Remember there is no random miss in pool-phys-v2.",
      "Keep APA gambling rules at APA functions, not as a slogan for this pot.",
      "Refuse a casino chat that wants a seed phrase.",
    ],
    whereTitle: "The pot beside the bet and the hub",
    siblings: [
      ["8-ball-pool-1v1", "the two-player stake"],
      ["pool-betting", "a bet that is not a ticket"],
      ["8-ball-pool-hub", "the product map"],
    ],
    related: [...money, "pool-betting", "8-ball-pool-1v1"],
    faqs: [
      { q: "Is this a casino game against the house?", a: "No. A house game pays from the house bankroll. This table pays from the other player's stake minus 5%. If the other player never posts, there is no match. The house is not waiting to fade your action." },
      { q: "Then why do people say 8 ball pool casino?", a: "The phrase is small, about 20 searches at keyword difficulty 0, and it borrows casino because money moves. Money moving is not the same as a house edge on a wheel. The edge here, if you call the fee an edge, is 5% of a pot between two players." },
      { q: "Does the physics favour the site?", a: "Pool-phys-v2 recomputes the shots you played. It does not insert a random miss, and it does not look up which seat paid the rake before it aims. The rack seed shuffles colours. The 8 stays centred. The winner is the rules result." },
      { q: "What are the stakes?", a: "Equal stakes of $1, $2, $5, $10, $25, or $50. No FargoRate and no APA skill level change them. A fair money match is equal cash, not a secret handicap dressed up as a casino comp." },
      { q: "Is the 5% like a roulette edge?", a: "It is a fee on a player pot. You are trying to beat a person, and they are trying to beat you. Against an equal player the fee means you must win more than half the racks to show a profit. It is not a number painted on a wheel." },
      { q: "Can I play the house for a bonus?", a: "There is no house opponent and no promo code on this page. Bonus credit is not how this match is staked. Buy-ins are withdrawable cash. If a page offers a code for a different 8-ball casino, this guide does not know that code and will not invent one." },
    ],
    sections: [
      {
        id: "bankroll",
        title: "Two ways a winner can get paid",
        body: `8 ball pool casino, said carefully, names a hope: that a cue game will pay the way a house game pays. In a house game the casino books the bet and pays from its bankroll if you win. The price of that arrangement is the house edge, built into the rules of the wheel or the cards. In this match the other player books the other half. You win their stake, minus 5%, or they win yours on the same terms. The site's revenue is the fee. It is not a second game running under the cloth.

About 20 monthly searches at keyword difficulty 0 is a small phrase. Small is useful. A page can say the distinction without fighting a head term. Players who wanted a house shooter will not find one. Players who wanted a person will find the other seat.`,
      },
      {
        id: "fee",
        title: "The fee is the only house number",
        body: `Five percent of the pot is taken at settlement. The winner is credited 95%. Deposits are not taxed again by that percentage, and a rack cancelled before the break returns both stakes. There is no juice in the sportsbook sense, because there is no price on a match you are not playing. Pool betting, as a separate page, is the same idea stated for people who arrived with the word bet.

Do not stack an imaginary miss on top of the fee. Physics id pool-phys-v2 does not randomly fail a shot that was played truly. A bad line misses because it was a bad line. The replay will show it. If the site wanted a hidden edge, a random miss would be the dishonest way to build one. That mechanism is not in the engine. The published mechanism is the 5% line, readable before you post.`,
      },
      {
        id: "still-pool",
        title: "The cloth is still 8-ball",
        body: `Calling the product a casino does not turn the 8 into a roulette pocket. You call a pocket only for the 8. Any other of your balls may fall anywhere. The 8 on the break wins unless the cue ball scratches, and that scratch loses. Three timeouts forfeit the seat. The WPA book effective 21 October 2026 is call-shot and does not award the break 8. Read the split so a league habit does not donate a rack you did not mean to donate.

The playing surface is 2.54 m by 1.27 m. Pattern play, a leave, and a safety when the 8 is near their pocket are still the strategy. No win rate is promised. A make-on-the-break rate is not published. Ghost-ball aim is a teaching picture without a measured make percentage. The casino word does not add a chart the strategy pages refused to invent.`,
      },
      {
        id: "not-apa",
        title: "A function, a house, and a pot",
        body: `The APA team manual prohibits gambling at APA functions. That is the league's rule for the league's events. It does not convert this website into an APA function, and it does not convert this website into a house-banked casino. Three different rooms, three different payers. At a function, follow the manual. At a house game, you are paid by the house if the rules say so. Here you are paid by the other stake.

No skill level is stored, so the casino does not comp you a shorter race. No FargoRate is stored, so it does not comp you a rating gap. Cue upgrades are not sold. Ranks from a free game do not set the stake. Equal cash is the match. If the word casino made you expect a loyalty ladder, the ladder is not on this table. The ladder, if you want one, is the free client's, and its rewards are not known to this page.`,
      },
    ],
    moreTitle: "Using the casino word without borrowing a wheel",
    more: [
      `Say the payer before you say the game. If the payer is the house, you are in a house game and you should read that game's edge. If the payer is the other player minus 5%, you are here. Mixing the sentences is how a 5% fee gets described as if the balls were a slot. They are not. The balls follow pool-phys-v2. The person across from you is trying to pocket the 8 in the pocket you both understand has to be called.`,
      `Keyword difficulty 0 on a 20-search phrase means almost nobody is competing for the wording, which is a reason to be exact rather than loud. Exact is: no house opponent, no random miss, no promo code, stakes from $1 to $50, winner credited 95%. Loud would be a fake RTP pasted from a slot guide. This match does not have an RTP of that kind. It has two win rates, yours and theirs, and a fee that skims the pot either way.`,
      `A friend who wants a casino night can still play you. They post the same stake. They do not become the house by sitting down, and you do not become the house by winning. The next rack is even again. Three timeouts still forfeit. The seed phrase still stays out of the chat. When the session is enough, it is enough. The pot does not chase you with a bonus that has to be wagered through a wheel or a second game.`,
    ],
  },
  {
    ...skill,
    slug: "best-pool-games",
    keyword: "best pool games",
    secondary: ["pool games", "free pool games", "pool games for money"],
    title: "Best Pool Games: Free, Cash App, or This Pot",
    description:
      "Best pool games, compared as three kinds: a free client, a skill-cash app, and this 5% table. There is no numbered top 10. A rival fee is not guessed.",
    h1: "Best pool games, compared as three kinds only",
    answer:
      "best pool games, in the only comparison this page will make, means a free client, a skill-cash app, and this 5% table. The figure used here is about 210 searches a month, keyword difficulty 20, advertiser cost about $0.49. There is no numbered top 10 of apps. Another company's fee is not guessed. The fee this site will print is its own: 5% of the pot, winner credited 95%.",
    facts: [
      "Best pool games is carried near 210 monthly searches, keyword difficulty 20, CPC about $0.49.",
      "The comparison is three kinds, not a ranked list of ten downloads.",
      "A free client pays in coins and cosmetics. The coin price of a cue is not published here.",
      "A skill-cash app's fee is unknown on this page, including 8 ball strike and Pool Payday.",
      "This table is 1v1 8-ball, equal stakes, paid from the other player's stake minus 5%.",
    ],
    tableLead:
      "Best pool games is a list-shaped search. The honest table is three kinds of product, with blank cells where another company's rake is not known.",
    tableTitle: "Three kinds, and no fourth invented",
    moneyTitle: "Only one column has a fee in dollars",
    moneyLabel: "Games example",
    stake: 5000,
    checkTitle: "Before you crown a best game",
    checkHead: "Sort by payer, not by trailer",
    checks: [
      "Ask whether the prize is coins, a cashier you have not audited, or this pot.",
      "Do not accept a top-10 that this page refused to write.",
      "Leave rival fees blank, including 8 ball strike.",
      "Remember ranks and legendary cues are free-game progression.",
      "Stake this table only at equal cash.",
      "Ignore a best-games list that asks for a seed phrase.",
    ],
    whereTitle: "The three kinds, opened one page at a time",
    siblings: [
      ["8-ball-strike-review", "8 ball strike, without a verdict"],
      ["8-ball-pool-rank", "ranks and passes"],
      ["8-ball-pool-casino", "house bank versus player pot"],
    ],
    related: [...money, "8-ball-strike-review", "8-ball-pool-rank"],
    faqs: [
      { q: "What is the best pool game?", a: "This page will not number one. A free client is best when you want coins and no cash. A skill-cash app is a different cashier this page has not audited. This 5% table is the one whose fee and rules are written here." },
      { q: "Why is there no top 10?", a: "A numbered top 10 would require scores this site did not measure and fees it does not know. Inventing either would turn a comparison into an advertisement with fake precision. Three kinds are enough to choose." },
      { q: "What does the free client pay?", a: "Coins and cosmetics, in the Miniclip-style games people mean. A cue upgrade there is cosmetic coins, and the coin price is not published here. It does not become a US-dollar balance on this site." },
      { q: "What about Pool Payday or 8 ball strike?", a: "The same honesty as the Pool Payday review: this page does not know their fee, does not call them legit or a scam, and has no promo code. They sit in the skill-cash column as names, not as audited rakes." },
      { q: "What does this table pay?", a: "The other player's stake, minus 5%. There is no house opponent. Stakes are $1, $2, $5, $10, $25, and $50. Settlement is the replay. You call a pocket only for the 8." },
      { q: "Does a high CPC mean one game is better?", a: "No. About $0.49 is an advertiser-cost estimate on the figures used for this page. It is not a quality score and not a return. Choose by who pays you and whether the rules are the rules you meant to play." },
    ],
    sections: [
      {
        id: "three",
        title: "Three kinds, written so a list cannot grow",
        body: `Best pool games is a request for a ranking. About 210 searches a month, keyword difficulty 20, CPC about $0.49. The request is declined in the form people expect and answered in a form that can stay true. Kind one is a free client: people, coins, cues, a long progression. Kind two is a skill-cash app: people, a prize the app describes, a fee this page will not invent. Kind three is this table: one opponent, equal cash, 5% of the pot, 95% to the rules winner.

A numbered top 10 would need a score. No score was measured. Screenshots of graphics are not a score. Download counts this page did not pull are not a score. The refusal is the content. If a writer later inserts an 11th app with a star rating, they have left the method and the page.`,
      },
      {
        id: "free",
        title: "The free client is a real game and a different prize",
        body: `The free client is where most people learned the words 8 ball pool. It has ranks, legendary cues, and a pass. Those are progression. This page does not know the reward attached to each level name, and the rank guide says so at more length. A cue upgrade there spends cosmetic coins, not cash, and the coin price is not copied here. Beating a stranger for coins can be fun. It does not settle a US-dollar pot, and it does not prove the cash table.

You can want both. Wanting both is not a contradiction if you keep the cashiers apart. Coins stay in the free client. Dollars stay here. A screenshot of a legendary cue does not change pool-phys-v2, which adds no random miss and does not read cosmetics. Ghost-ball aim remains a teaching picture with no measured make percentage on either product.`,
      },
      {
        id: "skill-cash",
        title: "Skill-cash apps stay in the unknown-fee column",
        body: `Pool Payday has a review on this site that refuses to invent a rake. 8 ball strike gets the same honesty on its own page: the fee is not known, the product is not called legit or a scam, and no promo code is offered. Semrush figures for that name are quoted there, not stretched into a rating of the app. This comparison only needs the column. The column says: another cashier, unaudited here.

That blank is uncomfortable if you came for a winner. Discomfort is cheaper than a fake percentage. If you play those apps, read their current fee on their own screen the day you deposit. Do not let a guide from a different company become the contract. And do not pay a stranger who claims to be the app's cashier in a direct message. The pattern of off-site payment is the same cheat, whatever the logo.`,
      },
      {
        id: "this-table",
        title: "The third kind is the one with a number",
        body: `This kind is 1v1 8-ball. The payer is the other player's stake minus 5%, not a house bankroll. Stakes are equal. No FargoRate, no APA skill level, no rank from a free game. Call the pocket only on the 8. The break 8 wins unless the cue ball scratches. Three timeouts forfeit. The surface is 2.54 m by 1.27 m. You cannot share an account. Settlement is the replay. A make-on-the-break rate is not published. Cue upgrades are not sold.

Best, if the word still bothers you, means the kind whose rules you meant. If you meant coins, the free client is the kind. If you meant a prize app, go read that app. If you meant a person, a pot, and a fee you can say out loud, the third kind is the match. The $0.49 click estimate does not break the tie. Your purpose does.`,
      },
    ],
    moreTitle: "Choosing without a countdown from ten",
    more: [
      `A top-10 article ages badly even when the first draft was honest, because apps change fees and art. This page ages by staying at three kinds. The free client's progression can add a season pass with a new name. The skill-cash column can add a company. The pot can stay 5%. When a fact is not in one of those sentences, it is not required. Best pool games, handled this way, is a sorting question. Sort by prize, then by whether the fee is printed, then stop.`,
      `Difficulty 20 on 210 searches is a modest commercial term, and the $0.49 CPC says advertisers are present without being frantic. Presence is not proof. An ad for a cue, a coin pack, or a deposit bonus is someone else's offer. This site does not sell cues and does not publish a code. If the ad asks you to leave the cashier and pay a wallet you do not control, you have left all three kinds and entered the cheat. Come back to a product that posts both stakes itself.`,
      `Play the kind that matches the money you are willing to use. Coins are not cash. An unknown fee is not 5% just because 5% is a number you like. Equal stakes against one person are not a house game and not a league race. Hold those three denials at once and the choice gets smaller, which is the point. Then use the rules you actually have: called 8, break 8 unless a scratch, replay, stop when the session should stop.`,
    ],
  },
  {
    ...skill,
    slug: "8-ball-strike-review",
    keyword: "8 ball strike",
    secondary: ["8 ball strike game", "8 ball strike review"],
    title: "8 Ball Strike: No Fee Claim and No Verdict",
    description:
      "8 ball strike is a searched name, and this page does not know that product's fee. It is not labeled legit or a scam. No promo code is offered. Our fee is 5%.",
    h1: "8 ball strike, reviewed only as far as the facts go",
    answer:
      "8 ball strike is a name people search, and this review does not know that product's fee. Semrush, on the primary figures used here, puts the phrase near 1,600 searches a month, keyword difficulty 44, advertiser cost about $1.90. The page does not call the product legit and does not call it a scam. There is no promo code. The only fee printed is this site's own: 5% of the pot.",
    facts: [
      "Semrush primary figures used here: about 1,600 monthly searches, keyword difficulty 44, CPC about $1.90.",
      "This page does not know 8 ball strike's fee and will not invent one.",
      "The product is not labeled legit and not labeled a scam.",
      "No promo code is offered for that product or for this one.",
      "Pool Payday is treated with the same limit on the review that already exists.",
    ],
    tableLead:
      "8 ball strike sits in the skill-cash column. The table leaves that column's fee blank and prints 5% only for this pot.",
    tableTitle: "A named app beside a known fee",
    moneyTitle: "Their rake is blank. Ours is not",
    moneyLabel: "Strike example",
    stake: 2500,
    checkTitle: "Before you treat a review as a contract",
    checkHead: "What this review refuses",
    checks: [
      "Do not quote a fee for 8 ball strike from this page.",
      "Do not repeat a legit or scam label. Neither is earned here.",
      "Do not hunt for a promo code. None is published.",
      "Read Pool Payday's review for the same kind of blank.",
      "If you play here instead, the fee is 5% of the pot.",
      "Pay any real app only inside that app's own cashier.",
    ],
    whereTitle: "The blank column, opened further",
    siblings: [
      ["best-pool-games", "three kinds of pool game"],
      ["8-ball-pool-casino", "who pays the winner"],
      ["8-ball-pool-rank", "free progression, not a fee"],
    ],
    related: [...money, "best-pool-games", "8-ball-pool-casino"],
    faqs: [
      { q: "Is 8 ball strike legit?", a: "This page does not know, and it will not use that word as a verdict. Legit and scam are both labels it refuses. What it knows is the search size. What it does not know is the fee." },
      { q: "What is the rake?", a: "Not published here. Inventing 5%, or 10%, or any other cut for that product would be a false review. If you use the app, the fee on your screen that day is the fee. This guide is not the screen." },
      { q: "Is there a promo code?", a: "No code is offered on this page for 8 ball strike, and none is offered for this site's table. A code in a comment thread is not adopted by being popular." },
      { q: "How is this different from the Pool Payday review?", a: "It is the same honesty. That review will not invent a rake. This one will not either. Both pages can describe our 5% pot fee because it is ours. Neither page borrows the other's unknown." },
      { q: "What can I play here instead?", a: "1v1 8-ball, equal stakes from $1 to $50, winner credited 95%, settlement by replay. You call a pocket only for the 8. There is no house opponent. No FargoRate is applied." },
      { q: "Why mention Semrush numbers at all?", a: "Because the primary figures, about 1,600 searches, difficulty 44, CPC about $1.90, explain why a review page exists. They are not a quality score. Difficulty 44 means other pages compete. Competing is not a reason to invent a rake." },
    ],
    sections: [
      {
        id: "unknown-fee",
        title: "The fee is the hole in the review",
        body: `8 ball strike is searched hard enough to tempt a confident review. Semrush's primary figures, as used on this page, are about 1,600 monthly searches, keyword difficulty 44, and a CPC around $1.90. Confidence would be a percentage. The percentage is the thing this page does not have. A skill-cash app can change its cut, its regions, and its cashier between the day a guide is drafted and the day you deposit. Copying a number from a forum would freeze someone's screenshot into a citation.

So the review says: fee unknown. That is a complete sentence. It is the same sentence the Pool Payday review earns by refusing a rake it cannot see. Two products, one method. If a later draft fills the blank without a source from the company, the draft has become fiction. Leave the blank where a reader can see it.`,
      },
      {
        id: "no-verdict",
        title: "No legit label, and no scam label",
        body: `Calling a product legit because the search is large is advertising. Calling it a scam because a stranger had a bad week is a different kind of advertising. This page does neither. It has not audited their cashier, their dispute process, or their rules. It will not borrow a Reddit thread as a verdict. Players who want a verdict need a source that actually tested withdrawals. This guide is not that test.

What it can warn, without naming the app a cheat, is the general pattern. Finding a person in chat who claims to represent a cash game, then paying them off-site, is how people get cheated. That warning is about the payment path. It is not a finding that 8 ball strike's own cashier behaves one way or the other. Use the company's own deposit screen, or do not use the product. Do not use a middleman who arrived in a direct message.`,
      },
      {
        id: "no-code",
        title: "A missing code is not an oversight",
        body: `No promo code appears here because publishing one would be a partnership this page does not have. A code also goes stale, and a stale code is a small lie. The same absence applies to this website: there is no coupon that reduces the 5% fee. The fee is the fee. Stakes are $1, $2, $5, $10, $25, and $50. The winner receives 95% of the pot. A cancel before the break returns both stakes.

If an affiliate page offers a code beside a star rating, that page has a commercial relationship it should disclose. This one discloses the opposite: no relationship, no code, no stars. The $1.90 CPC figure is an advertising-cost estimate from the Semrush figures above. It is not a bounty this site is paying you, and it is not a bounty the other product authorized us to quote as a bonus.`,
      },
      {
        id: "ours",
        title: "The match this review can describe in full",
        body: `Our table is 1v1 8-ball. The payer is the other player, minus 5%, not a house bankroll. You cannot share an account. A friend matches the stake. Settlement is the replay under pool-phys-v2, with no random miss. You call a pocket only on the 8. The 8 on the break wins unless the cue ball scratches. Three timeouts forfeit. The surface is 2.54 m by 1.27 m. No FargoRate and no APA skill level are stored. Cue upgrades are not sold. Ranks do not set the stake. A make-on-the-break rate is not published.

That list is longer than the strike section because the list is ours. A review that spends its length on an unknown app and a sentence on the known one has the proportions backwards. Use the strike section to avoid a fake rake. Use this section if you came to play. The rules page is the longer rule card. This page is the boundary around someone else's product.`,
      },
    ],
    moreTitle: "A review that stays inside what it checked",
    more: [
      `Difficulty 44 is a crowd. Crowded reviews win by sounding certain. Certainty about a fee you did not read is how a wrong 8% or a wrong 12% spreads. This page would rather lose that crowd than join it. The Semrush primary numbers justify writing the page. They do not justify a verdict. When you see 1,600 and $1.90, read them as attention, then look for the blank where the rake should be. The blank is the finding, and it should stay blank.`,
      `Pool Payday remains the model. That guide's job was to say what it could prove about a named app and to stop. This guide copies the job, not the sentences, and not a number. If Pool Payday's fee is still unpublished there, it is still unpublished here. Do not average the two unknowns into a category rake for skill-cash pool. The category, on the best-games page, is a column with an empty fee cell. Empty is allowed. Filling it is not.`,
      `If you deposit with them anyway, deposit where they tell you inside their product, on the day you do it, and keep their receipt. If you play here, post through the cashier, expect 95% when the rules name you, and do not ask a chat admin to hold the stake. Seed phrases stay untyped. Promo codes stay uninvented. The rest of the cluster can teach the leave. This page only had to keep a review from becoming a poster with a fake rake.`,
    ],
  },
  {
    ...skill,
    slug: "8-ball-pool-discord",
    keyword: "8 ball pool discord",
    secondary: ["8 ball pool telegram", "8 ball pool chat"],
    title: "8 Ball Pool Discord Is Not a Cashier in Chat",
    description:
      "8 ball pool discord is not an official table here, and Telegram is not either. Paying a stranger in chat is how people get cheated. Stake on the cashier.",
    h1: "8 ball pool discord, and why the stake stays out of it",
    answer:
      "8 ball pool discord is not a table this site runs, and a Telegram room is not one either. There is no official 8 ball pool Discord for this cashier and no official Telegram table beside it. Finding strangers in a chat and paying them off-site is how people get cheated. A seed phrase is never the buy-in. Money matches belong on the cashier, not in a direct message.",
    facts: [
      "This site does not operate an official 8 ball pool Discord.",
      "It does not operate an official Telegram table either.",
      "Off-site payment to a stranger in chat is a common way to get cheated.",
      "A seed phrase is not a stake, a deposit, or a verification step.",
      "The real match is two accounts, equal cash, settled by the replay.",
    ],
    tableLead:
      "8 ball pool discord looks like a lobby. A free client's chat, a prize app's chat, and this cashier are three different places to put money, and only one of them is ours.",
    tableTitle: "Chat rooms versus a posted stake",
    moneyTitle: "The pot never lives in a DM",
    moneyLabel: "Chat example",
    stake: 100,
    checkTitle: "Before you answer a chat invite",
    checkHead: "Close these, then open the cashier",
    checks: [
      "If they want payment before the site's cashier, stop.",
      "If they want a seed phrase, stop and do not type it.",
      "Remember Discord is not an official table here.",
      "Remember Telegram is not an official table here.",
      "Use two accounts if you and a friend actually play.",
      "Let the replay settle. A chat vote does not.",
    ],
    whereTitle: "The match the chat was imitating",
    siblings: [
      ["8-ball-pool-1v1", "the actual two-player match"],
      ["8-ball-pool-hub", "where the table lives"],
      ["pool-betting", "a stake that stays on the site"],
    ],
    related: [...money, "8-ball-pool-1v1", "pool-betting"],
    faqs: [
      { q: "Is there an official 8 ball pool Discord?", a: "Not from this site. There is no official Discord table and no official Telegram table. A server with a familiar logo is not the cashier. The cashier is on the website, inside an account that posts a stake." },
      { q: "Can I pay a moderator and get a match?", a: "That is the cheat. Finding a stranger in chat and sending money off-site is how people lose the stake before a ball is racked. No moderator of a room we do not run can credit a pot." },
      { q: "What if they ask for my seed phrase to verify?", a: "Stop. A seed phrase is the key to a wallet. It is never a pool term, never a deposit, and never a step in this match. Anyone who asks for it is taking the wallet, not seating a game." },
      { q: "How do I play a friend for money, then?", a: "Both of you use your own accounts. A friend matches the stake on the cashier. You play 1v1 8-ball. Settlement is the replay. You cannot share one login and call it two players." },
      { q: "Does the chat rule change the fee?", a: "The fee is still 5% of a pot that was posted on the site. A chat has no fee schedule this page will honor, because the chat is not the product. Winner credit on a real match is 95%." },
      { q: "Are free Discord communities banned as conversation?", a: "People can talk about pool wherever they like. This page is about money. Strategy talk is not a deposit. The moment the room wants a wallet address for a stake, the conversation has left the game and entered the loss." },
    ],
    sections: [
      {
        id: "no-room",
        title: "There is no official room to join",
        body: `8 ball pool discord is a search for a lobby that feels social. This site did not open that lobby. It did not open a Telegram twin. If a server says it is the official table for this cashier, the sentence is false. Official, for a stake, means the account system and the replay. A badge in a chat client is artwork. Artwork can be copied. The cashier cannot be copied by a person who messages you first.

The search exists because free games already have communities, and money games attract people who would rather hold the pot themselves. Those are different motives wearing one keyword. Read the page as a refusal. Then, if you still want a match, go to the product and post a stake against one opponent who posts one too, on the cashier, not in the room.`,
      },
      {
        id: "cheat",
        title: "Off-site payment is the method, not a rumour",
        body: `The cheat is simple and it does not need a new name. Someone in a chat offers a match, a tournament, or a better price than the 5% fee. They ask you to send crypto to a personal address, or to a moderator, before any ball is racked. You send it. The match never appears in a replay you can recompute. That is how people get cheated. The logo on their profile does not change the direction of the money.

A real pot on this site is two stakes already inside the ledger. You do not prepay a human. You do not get a better fee for leaving the site. The fee is 5% at settlement, or nothing if the table is cancelled before the break. Any offer that beats that fee by moving the funds into a chat is not a discount. It is an exit from the only settlement this page recognizes.`,
      },
      {
        id: "seed",
        title: "A seed phrase ends the conversation",
        body: `No employee, moderator, or opponent needs your seed phrase. Not to verify age, not to unlock a table, not to refund a stuck match. The phrase is the wallet. Typing it into Discord or Telegram hands the wallet over. Close the message. Do not negotiate a smaller reveal, and do not send a screenshot of the words with one of them blurred. The safe amount to share is none.

This is not a colourful extra warning. It is the same rule as the stake rule. Money matches belong on the cashier. Wallet keys belong offline, away from a pool conversation. If you already typed the phrase, treat the wallet as lost and move anything still movable by a path you control, then stop using that phrase. This guide will not invent a recovery service inside a chat, and it will not name a fake helpline.`,
      },
      {
        id: "real-match",
        title: "What a real two-player stake looks like",
        body: `Two accounts. Equal stakes from $1, $2, $5, $10, $25, or $50. One opponent. Call a pocket only for the 8. The 8 on the break wins unless the cue ball scratches. Three timeouts forfeit. The surface is 2.54 m by 1.27 m. Physics id pool-phys-v2, no random miss. No FargoRate, no APA skill level, no rank that sets the stake. Cue upgrades are not sold. Settlement is the replay. The winner is credited 95%.

A friend can be the opponent. A stranger in the product lobby can be the opponent. A stranger who will only play if you pay them in a DM cannot. You cannot both sit on one account to make the chat simpler. The account split is the product. When the rack ends, stop or play another. Do not move the celebration back into a room that is now asking for a rematch off-site.`,
      },
    ],
    moreTitle: "Talk about the game. Pay inside the game",
    more: [
      `Communities are allowed to exist. People share leaves, argue about English, and post tables they own. None of that requires a deposit. 8 ball pool discord, as a social hobby, is outside this page's authority. The page starts when the hobby asks for a wallet. At that moment the advice is short: do not pay. Come to the cashier, where the other stake is visible before the break and the replay is visible after it. Visibility is the feature chat cannot copy.`,
      `Telegram follows the same line as Discord. A channel with a tip bot, a middleman, and a promise of better odds is still off-site. This site does not run that channel. It does not recognize the middleman's ledger. A make-on-the-break rate is not published here, so a chat prop on the break 8 has no number from us to use. If they quote one, they invented it. Invented odds plus an off-site wallet is two reasons to leave, and either one was enough.`,
      `If a friend already uses a server to coordinate times, keep the server for the clock and the cashier for the money. Send a time. Do not send a seed. Do not send a screenshot of a balance as proof you will pay later. Post the stake, let them post theirs, play, and let 5% be the only cut. Three timeouts still forfeit even if the voice chat is funny. The rules do not pause for the room you are not officially in.`,
    ],
  },
  {
    ...skill,
    slug: "8-ball-pool-rank",
    keyword: "8 ball pool rank",
    secondary: ["8 ball pool levels", "8 ball pool legendary cue"],
    title: "8 Ball Pool Rank Does Not Set the Cash Stake",
    description:
      "8 ball pool rank on a free client is levels, cues, and a pass. Reward lists are not known here. Ranks do not set the stake. The cash match is equal money.",
    h1: "8 ball pool rank, as progression that stays in the free game",
    answer:
      "8 ball pool rank, in the free clients people mean, is a progression of levels, cues, and a pass. The figure used here is about 110 searches a month at keyword difficulty 23. This page does not know the rewards attached to those level names. Ranks do not set the stake on this site. Equal cash is the match, and a legendary cue does not change it.",
    facts: [
      "8 ball pool rank is carried near 110 monthly searches, keyword difficulty 23.",
      "Miniclip-style ranks, legendary cues, and a pass are free-game progression.",
      "The reward for each level name is not known to this page, so it is not listed.",
      "A cue upgrade in that client is cosmetic coins, and the coin price is not published here.",
      "On this table, rank does not pick the stake. Both players post the same cash.",
    ],
    tableLead:
      "8 ball pool rank matters inside a free client. It does not price a coin game, a skill-cash app, and this pot as if they shared one ladder.",
    tableTitle: "Progression versus a stake",
    moneyTitle: "Equal cash, with the ladder left outside",
    moneyLabel: "Rank example",
    stake: 500,
    checkTitle: "Before you carry a rank into a pot",
    checkHead: "Separate the ladder from the stake",
    checks: [
      "Do not expect this page to list level rewards. It does not know them.",
      "Treat legendary cues as cosmetics, not as a cash edge.",
      "Remember a pass in a free game is not a buy-in here.",
      "Post the same stake as the other player.",
      "Ignore a rank that claims to lower the 5% fee.",
      "Do not buy a rank from a chat seller.",
    ],
    whereTitle: "Ranks beside cues and the three kinds of game",
    siblings: [
      ["best-pool-games", "free play versus a pot"],
      ["best-pool-cue", "cues this site does not sell"],
      ["8-ball-strike-review", "another named app, fee unknown"],
    ],
    related: [...money, "best-pool-games", "best-pool-cue"],
    faqs: [
      { q: "What are the 8 ball pool ranks?", a: "Free clients use a ladder of level names, often with cues and a pass attached. This page does not know those names' rewards, so it will not print a table of prizes it might have misremembered. The ladder is that client's." },
      { q: "Does rank change the stake here?", a: "No. Ranks do not set the stake. Equal cash is the match. A high level in a free game and a new account post the same $1, $2, $5, $10, $25, or $50 if they choose the same button." },
      { q: "What is a legendary cue worth?", a: "Inside the free client it is a cosmetic, bought with coins. The coin price is not published here. On this site it is worth nothing in the pot, because cue upgrades are not sold and physics does not read the artwork." },
      { q: "Is the season pass a gambling buy-in?", a: "A pass in a free game is that game's progression product. This page does not know its price. It is not a stake on this table and it does not discount the 5% fee. Do not confuse a pass with a pot." },
      { q: "Can I bet my rank against someone?", a: "Not here. There is no market in levels. There is a match for money at equal stakes, settled by the replay. Selling a rank in Discord is the off-site payment problem, not a feature." },
      { q: "Does FargoRate equal a free-game rank?", a: "No. FargoRate is a rating from games won and lost, described on its own page, and it is not applied here either. A Miniclip-style level is a third number. None of the three changes the button labels." },
    ],
    sections: [
      {
        id: "progression",
        title: "A ladder the free game owns",
        body: `8 ball pool rank is how a free client keeps you in the client. You win coins, you climb, a cue changes colour, a pass offers a season of extra cosmetics. About 110 searches a month at keyword difficulty 23 is enough of a question to deserve a straight answer, and not enough of a question to justify a fake reward table. The straight answer is that those rewards are the free game's, and this page does not know the level names' payouts.

Miniclip-style is a description of the genre, not a claim that every client uses one identical ladder. If your client calls the top step something else, the something else is still not stored here. Printing a guessed list of level names would be a glossary of the same kind this site refused for hustler slang. Unknown stays unlabeled.`,
      },
      {
        id: "cosmetics",
        title: "Legendary cues spend coins",
        body: `A legendary cue, in that progression, is a picture you paid for with cosmetic coins. The coin price is not published on this page. It is not cash, and it does not withdraw as cash from this site, because this site did not sell it. Cue upgrades are not a product beside our stake. Shop talk about 18 to 21 ounces and a 12 to 13 mm tip is a different conversation, labeled as shop talk on the cue page, and it is not a WPA specification either.

Physics id pool-phys-v2 does not receive the cosmetic. There is no random miss that a legendary cue is allowed to cancel. Ghost-ball aim is still a teaching picture without a measured make percentage. If the free client draws an aim line as a reward for a rank, that line is their teaching layer. It does not travel.`,
      },
      {
        id: "equal",
        title: "Equal cash is the only ladder on the cashier",
        body: `Ranks do not set the stake. The stake is a choice you and the other player make from the same list. Equal cash is the match. A fair money match is usually equal stakes, not a secret handicap, and a rank would be exactly that secret if we let it shrink one side. We do not. No FargoRate is applied. No APA skill level is stored. A pass does not buy a shorter race.

The fee stays 5% of the pot. The winner is credited 95%. You call a pocket only for the 8. The 8 on the break wins unless the cue ball scratches. Three timeouts forfeit. The surface is 2.54 m by 1.27 m. You cannot share an account so that one rank plays both seats. Settlement is the replay. A high level who misses the 8 loses the rack the same way a new account does.`,
      },
      {
        id: "not-for-sale",
        title: "Do not buy a rank from a person",
        body: `Chat sellers offer levels, cues, and passes for crypto sent to a personal address. That offer has two problems. The goods are a free game's database, which this site does not control and will not promise to deliver. The payment is off-site, which is how people get cheated whether the goods exist or not. There is no official Discord or Telegram table here to make the seller legitimate. A seed phrase is never the trade.

If you want the free game's progression, use that game's own store and accept that this page does not know the prices. If you want a money match, use the cashier and accept that your rank will not be on the scoreboard, because there is no rank scoreboard. The best-games page keeps the free client and the pot in separate columns so this confusion has somewhere systematic to go.`,
      },
    ],
    moreTitle: "Leaving the ladder in the client that built it",
    more: [
      `Difficulty 23 on about 110 searches is a page that can tell the truth without a table of made-up rewards. The truth is short. Ranks, legendary cues, and a pass are progression. The rewards of the named levels are unknown here. They do not set a US-dollar stake. Repeating a wiki of level numbers would look helpful for a week and then be wrong. Unknown is more stable than a copied season. When the free client changes the pass, this paragraph does not have to change with it.`,
      `Players sometimes want the cash table to feel like the climb they already enjoy. The climb is a good evening. It is a bad pricing model. If a rank posted $10 and a lower rank were forced to post $50, the match would be a handicap wearing a badge. Our match is the opposite. Pick the same button. Play the called 8. Take 95% or lose the stake. The badge can stay on the other app, next to the coins that bought it.`,
      `A friend who outranks you in a free client is not owed games, and you are not owed a head start. APA gives or gets games on a scoresheet this site does not keep. FargoRate speaks in points this site does not read. The rank speaks in levels this site does not store. Three systems, zero effect on the button. Play even. If the gap in skill is the whole story, the fee will not rescue the shorter player, and a cosmetic cue will not rescue them either.`,
    ],
  },
];
