import type { Guide } from "./types";

// Publication and topic registration belong to the integrating agent.
type HardwareDraft = Omit<Guide, "cluster" | "updated" | "sections"> & {
  sections: [string, string][];
};
const article = (draft: HardwareDraft): Guide => ({
  ...draft,
  cluster: "FPS & aim",
  updated: "2026-10-31",
  sections: draft.sections.map(([title, body], i) => ({ id: `hardware-${i + 1}`, title, body })),
});

const pointerSource = {
  label: "MDN: Pointer Lock API and unadjusted movement",
  url: "https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API",
};
const pollingSource = {
  label: "Razer Support: high polling rates and system lag",
  url: "https://mysupport.razer.com/app/answers/detail/a_id/14640",
};
const reflexSource = {
  label: "NVIDIA Developer: Reflex rendering pipeline",
  url: "https://developer.nvidia.com/performance-rendering-tools/reflex",
};

export const WAVE2_HARDWARE_GUIDES: Guide[] = [
  article({
    slug: "polling-rate",
    keyword: "polling rate",
    secondary: ["1000hz vs 4000hz"],
    title: "Polling Rate for FPS: Compare 1000Hz and 4000Hz",
    description:
      "Understand mouse polling rate, compare 1000Hz with 4000Hz and 8000Hz, and test frame stability before choosing a setting for your own FPS setup.",
    h1: "Polling rate: choose report frequency your FPS setup handles well",
    answer:
      "Mouse polling rate is how often the device reports to the computer, expressed in hertz. A 1000Hz setting has a nominal one-millisecond report interval; 4000Hz has 0.25 milliseconds. Those intervals are not total input lag. Start from a stable supported baseline and raise polling only if your game, computer and connection remain consistent under actual mouse movement.",
    facts: [
      "1000Hz, 4000Hz and 8000Hz correspond to nominal intervals of 1, 0.25 and 0.125 milliseconds.",
      "A shorter report interval does not remove rendering, display or network delays.",
      "Razer and Corsair document additional processing demands at higher reporting rates.",
      "Movement-heavy comparisons reveal problems that an idle desktop or stationary benchmark may miss.",
    ],
    sections: [
      [
        "Reporting frequency is one clock in a larger system",
        `A mouse can sample motion internally, prepare a report, send it over its connection and have that report handled by the application. Polling rate describes reporting frequency, not every step of that chain. A game then uses input while simulating and rendering a scene. The screen presents the result later. Keep these stages separate before deciding what a higher number could improve.

The interval calculation is straightforward: divide 1000 milliseconds by the frequency in hertz. At 1000Hz the nominal interval is 1ms. At 4000Hz it is 0.25ms. The interval reduction is 0.75ms, but that is not a measured reduction in click-to-photon latency. Report timing relative to other work, device behavior and software scheduling all matter.

An event may happen just before a report or just after it. This is why describing every input as waiting the entire interval exaggerates the interpretation. A simplified evenly distributed arrival model gives an average waiting contribution of about half the interval. That model is useful for understanding scale, not for certifying a particular mouse's latency or adding up an exact system result.

Likewise, a display refresh does not require the mouse frequency to be an exact multiple of its refresh rate. They are separate processes. More frequent reports may offer fresher input to a game, but whether that improves your experience depends on how the complete setup handles them. There is no universal rule that a 240Hz monitor requires 4000Hz polling.`,
      ],
      [
        "Compare the intervals without inventing a benchmark",
        `| Setting | Nominal interval, calculated | Change versus 1000Hz | Question before keeping it |
| --- | --- | --- | --- |
| 500Hz | 2ms | Interval is 1ms longer | Does this resolve a compatibility problem? |
| 1000Hz | 1ms | Baseline | Is motion stable during demanding gameplay? |
| 2000Hz | 0.5ms | Interval is 0.5ms shorter | Does a modest increase remain stable? |
| 4000Hz | 0.25ms | Interval is 0.75ms shorter | Does your workload absorb the extra reporting? |
| 8000Hz | 0.125ms | Interval is 0.875ms shorter | Is the smaller additional reduction worthwhile? |

The move from 4000Hz to 8000Hz halves the interval again, yet the absolute reduction is only 0.125ms. Ratios alone can make that change sound larger than its place in the input chain. These figures are mathematical intervals, not measured mouse response, measured FPS gains or predictions of match performance.

When discussing 1000Hz vs 4000Hz, define the result you care about. You might prioritize steadier frametimes, less visible roughness in rapid sweeps, longer untethered sessions or simpler compatibility. A feature can be technically different without creating a meaningful advantage for every user. Establish the problem before buying a receiver or replacing a mouse.

Do not confuse DPI with frequency. DPI changes reported movement density; polling changes when reports are delivered. Keep DPI and in-game sensitivity fixed during a frequency comparison. Otherwise faster-looking camera movement could come from a changed turn scale rather than a timing difference. Confirm physical turning distance once before beginning the blocks.`,
      ],
      [
        "Why a higher rate can make a game feel worse",
        `Razer's support guidance explicitly warns that high polling rates require more processing and can reduce frame rates in CPU-bound games. Corsair also identifies a CPU-usage cost. Those are compatibility cautions, not evidence that your machine will lose a particular number of frames. The relevant test is your workload with your hardware and software versions.

A system with spare resources in one scene can become constrained in another. A quiet training room is therefore an incomplete stress test for a busy match. Move the mouse continuously while observing demanding scenes, since a test with the device stationary may not resemble the processing pattern of active aiming. Keep the camera route repeatable rather than randomly spinning until a problem appears.

Average FPS can hide interruptions. Two configurations might show similar averages while one produces recurring hitches during fast movement. If the game provides a frametime graph or another appropriate diagnostic, use it alongside the average. Record the behavior without assigning a fabricated percentile value. A visible spike is a clue; repeat the same sequence to establish whether it follows the setting.

Closing unnecessary background work can make a comparison cleaner, but do not disable required security or anti-cheat software to force a higher number to work. Use supported updates and official troubleshooting. If a lower polling stage is stable and the higher stage is not, keeping the lower stage is a valid result rather than a failure to use your hardware properly.`,
      ],
      [
        "Check the full connection before blaming the processor",
        `Some mice require a compatible receiver, cable mode or firmware version to expose their highest stages. A product listing's maximum does not prove every connection mode supports it. Bluetooth, a standard wireless receiver and a dedicated high-rate receiver can have different capabilities. Read the model-specific requirements instead of inferring them from the shape of the USB plug.

For wireless devices, follow the manufacturer's receiver placement guidance. A receiver hidden behind a metal computer case, an obstructed path or nearby interference can make movement unreliable independently of CPU load. Razer's HyperPolling page supplies specific placement and troubleshooting advice for its devices; apply those instructions only to supported hardware rather than treating every brand as identical.

For wired devices, examine the cable and port path. A damaged cable or an unreliable hub creates a different problem from a rate setting. Begin with a supported direct connection when the manufacturer recommends it. Change one element at a time: moving the receiver, changing the port and changing frequency simultaneously may solve the symptom while leaving its cause unknown.

Record connection mode in your notes. A comparison between wired 1000Hz and wireless 4000Hz changes more than frequency. If the device cannot supply both stages in the same mode, label the experiment accordingly. It remains useful for choosing your preferred setup, but it cannot isolate polling rate as the reason for a difference.`,
      ],
      [
        "A repeatable comparison checklist",
        `- Record mouse model, firmware, receiver, connection mode, DPI and game sensitivity.
- Select a known stable supported baseline, usually 1000Hz when available.
- Warm up the game and run the same short camera route before collecting observations.
- Compare baseline and higher rate with identical scenes and deliberate continuous movement.
- Alternate baseline, higher rate, higher rate, baseline blocks.
- Note average performance, recurring hitches, aim errors and wireless interruptions separately.
- Repeat after a restart and on another day before choosing a permanent profile.

Use two kinds of movement in each block. First, make smooth slow sweeps while following a stable edge or landmark. Then perform faster direction changes between fixed landmarks. The first helps expose uneven motion; the second resembles a burst of active input. Keep the duration and route consistent. You are comparing conditions, not trying to win an aim leaderboard.

Include the same demanding scene each time. If the game offers a reproducible local sequence, use it. If it does not, acknowledge that live matches introduce different opponents, effects and timing. A performance difference between two unrelated matches is weaker evidence. It may justify another test, but it should not become a confident claim that one frequency costs a precise percentage of FPS.

Before looking at the results, decide what would count as a problem. Repeated stuttering during sweeps is a more useful criterion than an unexplained feeling after one minute. If both conditions behave well and the score difference varies in direction, keep the simpler or more comfortable setup. You do not need to manufacture a winner.`,
      ],
      [
        "Interpreting polling testers and irregular readings",
        `A polling-rate tester estimates delivery timing under its own collection method. A browser tester also passes through the browser's event handling. Event batching, timing resolution, device motion and the method of calculation can affect the displayed estimate. Treat one unusually high or low sample as a diagnostic prompt rather than proof that the mouse lies about its specification.

Follow the vendor's recommended measurement procedure when one exists. Razer links testing software from its HyperPolling guidance. Obtain software from the official source and check what it measures. A report-frequency tool does not automatically measure physical click latency, sensor tracking quality or screen response. Those are different questions requiring different instruments and definitions.

Move enough to give the tester useful data and avoid comparing an idle period with an active sweep. Keep the test window and collection duration the same. Repeat the run and retain the distribution or range if available, rather than quoting only the peak. If you cannot explain how a website derives its figure, do not treat the last decimal place as authoritative.

A stable desktop test followed by stutter in one game suggests investigating the application workload. Irregular behavior across applications and connection modes suggests looking at the broader device path. Neither pattern proves a component is defective. Document a small reproducible case before contacting support, including the settings that make the symptom appear and disappear.`,
      ],
      [
        "Choose a daily profile instead of chasing the maximum",
        `A practical daily profile should survive ordinary conditions: background voice chat, a realistic game session and a restart. An exotic configuration that works only after a special sequence may be unsuitable even if a short benchmark looks good. Keep a saved fallback profile so you can return to a stable setting when a game or driver changes.

Battery requirements belong in the decision for a wireless mouse, but do not invent runtime figures. Consult the exact manufacturer's specification and test your ordinary charging routine. A high-rate mode may change practical usage, yet the size of that effect depends on the device and configuration. Do not transfer a number from another model into your purchase calculation.

Hardware frequency also does not replace good frame delivery. The [CS2 settings guide](/guides/best-cs2-settings) addresses the wider rendering setup, while [CS2 subtick](/guides/cs2-subtick) distinguishes server timing from local input. The [eDPI guide](/guides/edpi-calculator) owns sensitivity products. Those three topics should remain separate in your notes so a later adjustment does not undo a useful comparison.

Browse the [FPS and aim topic](/guides/topics/fps-and-aim) for the next question. If your original issue was inconsistent physical turning, verify the mouse profile before testing higher frequency again. If it was delayed online hit confirmation, examine network and server behavior separately. Polling is a narrow lever, not a universal repair for every kind of lag.`,
      ],
      [
        "Browser destinations and the limits of a hardware result",
        `Use an authorized device and network for browser testing. [Browser FPS games](/guides/browser-fps-games) covers access choices; the table below records reviewed terms without assigning a measured latency ranking. [PvPStrike](/fps-1v1) is an independent CS-style browser game, not Valve CS2. Its local first-to-seven practice bot provides an unpaid place to inspect control, but not a standardized hardware benchmark.

| Symptom | More useful comparison | Weak conclusion to avoid |
| --- | --- | --- |
| Hitches only during active sweeps | Same scene at lower and higher polling | The monitor must be too slow |
| Irregular motion in every application | Connection, surface and vendor diagnostic | One game is definitely broken |
| Trouble only on wireless | Receiver placement and supported modes | All wireless mice are unsuitable |
| Similar averages, different pauses | Repeatable route and frametime behavior | Average FPS proves equal smoothness |

This decision table selects the next experiment rather than diagnosing hardware from one symptom. Write down what would disprove your first explanation. For example, if lowering frequency leaves the same hitch at the same point on the route, investigate the scene workload rather than crediting the mouse setting. If the issue follows the receiver position across frequencies, connection troubleshooting becomes more relevant.

Retest the final profile in ordinary use after the controlled blocks. Restore the background applications you actually need, without introducing several new configuration changes. A reliable daily setup should tolerate that realistic environment. Keep the fallback stage documented so an update does not turn a solved problem into another round of guesswork.`,
      ],
      [
        "Report timing does not establish a cash advantage",
        `If you later consider PvPStrike cash play, it is 18+ where permitted and uses best-of-five or best-of-nine series. The fee is 5% of the combined pot; the published minimum is $1, but the lobby determines available entries. No polling stage promises earnings.

Hypothetical USD example: $1 each creates $2, with $1.90 winner credit and $0.90 net after the winner's entry. Hypothetical USD example: $5 each creates $10, with $9.50 winner credit and $4.50 net. Losing costs the entry, and a wallet credit is distinct from a withdrawal.

Use the [FPS money hub](/guides/fps-for-money-hub), [CS2 cash-duel distinction](/guides/cs2-1v1-for-money), [crypto FPS guide](/guides/crypto-fps-game) and [fairness page](/fairness) for entry and validation context. Keep those decisions separate from whether a mouse setting runs smoothly.`,
      ],
    ],
    faqs: [
      {
        q: "What is the best polling rate for FPS?",
        a: "Use the highest supported rate that remains stable and useful in your actual workload, rather than the maximum by default. A stable 1000Hz baseline is a practical starting point. Compare demanding scenes with active mouse movement, then choose using repeatable behavior, compatibility and your ordinary usage needs.",
      },
      {
        q: "Is 4000Hz four times faster than 1000Hz?",
        a: "It reports at four times the nominal frequency, with an interval of 0.25ms instead of 1ms. That does not make the entire system four times faster. Input processing, frame production and display response still contribute, and the shorter interval is not itself a measured end-to-end latency reduction.",
      },
      {
        q: "Should I enable 8000Hz?",
        a: "Only after confirming hardware support and comparing stability against a lower stage. Its nominal interval is 0.125ms, only 0.125ms shorter than 4000Hz. Decide whether the complete configuration behaves well rather than assuming the largest advertised number supplies an observable benefit in every game or computer.",
      },
      {
        q: "Can higher polling cost FPS?",
        a: "Yes. Manufacturer guidance identifies extra processing demands and possible problems in CPU-bound or incompatible games. The size of any cost must be measured on your own workload. Do not assume a universal percentage loss or conclude that an idle benchmark proves active gameplay will remain smooth.",
      },
      {
        q: "Does my monitor need a matching mouse frequency?",
        a: "No exact matching rule applies. Mouse reporting and display refresh are separate stages. A high-refresh screen can be part of a responsive system, but its specification does not automatically require a particular polling stage. Compare the entire setup and keep display settings fixed while changing mouse frequency.",
      },
      {
        q: "Why does a browser polling test fluctuate?",
        a: "The estimate depends on motion, event delivery and the test's timing method. Repeat an identical procedure and use the vendor's supported diagnostic when available. A browser reading cannot by itself separate USB behavior, browser scheduling and application processing, and it does not measure click-to-photon latency.",
      },
    ],
    sources: [
      pollingSource,
      {
        label: "Corsair: higher polling rates and CPU usage",
        url: "https://help.corsair.com/hc/en-us/articles/4405984374157-Higher-polling-rates-for-keyboards-and-mice",
      },
      {
        label: "Razer: HyperPolling setup and diagnostics",
        url: "https://www.razer.com/ca-en/technology/razer-hyperpolling",
      },
    ],
    related: ["best-cs2-settings", "cs2-subtick", "edpi-calculator", "browser-fps-games"],
  }),
  article({
    slug: "mouse-dpi",
    keyword: "mouse dpi",
    secondary: ["best dpi for fps"],
    title: "Mouse DPI for FPS: Choose and Verify Your Setting",
    description:
      "Compare 400, 800 and 1600 mouse DPI, verify your active profile and test control without confusing sensor counts with in-game sensitivity or skill.",
    h1: "Mouse DPI: choose a repeatable sensor setting for FPS",
    answer:
      "Mouse DPI describes the sensor counts reported for physical movement, commonly expressed as dots per inch. Start with a supported, comfortable setting such as 800, then tune the game's sensitivity separately. Compare 400, 800 and 1600 with matched physical turning distance; simply raising DPI also raises sensitivity unless you compensate. No DPI value guarantees better aim.",
    facts: [
      "DPI, polling rate and display refresh describe different parts of the input chain.",
      "A profile switch can change DPI without changing the number shown inside your game.",
      "Doubling DPI and halving a linear in-game sensitivity preserves the nominal turn scale within that game.",
      "A controlled comparison needs the same surface, task, physical turn distance and input mode.",
    ],
    sections: [
      [
        "What the number changes, and what it leaves alone",
        `Think of DPI as the resolution of a movement report. At an idealized 800 counts per inch, moving one inch produces approximately 800 counts along the movement direction. The game translates those counts into camera rotation using its own rules. The resulting feeling depends on that translation as well as the sensor setting. DPI is therefore an input to sensitivity, rather than a complete description of it.

The word dots comes from display and printing terminology; counts per inch is a more literal description for a mouse. Neither term means the sensor selects individual enemy pixels. A mouse sends movement information, and the application decides how to use it. Moving from one display resolution to another can alter the appearance of a turn without changing its physical distance in a raw-input game.

Logitech's sensitivity guidance distinguishes device configuration from operating-system pointer controls. Use the manufacturer utility or the mouse manual to establish what the active hardware setting actually is. A Windows pointer-speed slider alone is not a reliable readout of a gaming mouse's sensor DPI. It changes another stage of the input path, which may or may not affect a particular application.

The practical goal is consistency across the situations you actually use: aiming, opening menus and moving between applications. A setting that makes desktop use frustrating may encourage frequent profile switching. That is manageable when deliberate, but an accidental switch during a session creates a configuration problem that can look like inconsistent hand control.

Also distinguish a configuration change from sensor variation. If two supported mice are set to the same nominal DPI, do not assume their actual physical turn distances match perfectly. Verify the distance before carrying your existing sensitivity across. That check is especially useful after replacing a mouse: a small sensitivity adjustment can preserve the familiar task without implying that either sensor is defective or that one advertised number is dishonest.`,
      ],
      [
        "400 versus 800 versus 1600: compare equivalent turns",
        `| Sensor setting | Example sensitivity in one linear game | Nominal product | Main comparison question |
| --- | --- | --- | --- |
| 400 DPI | 2.0 | 800 | Does coarser input feel controllable at your chosen turn distance? |
| 800 DPI | 1.0 | 800 | Is this a practical baseline for aiming and desktop use? |
| 1600 DPI | 0.5 | 800 | Can you retain the same turn while using finer reported movement? |

These are arithmetic examples, not recommended settings for every title. They assume the same game, a linear sensitivity control and unchanged input processing. Read the [eDPI explanation](/guides/edpi-calculator) for the scope of that product. This page concentrates on choosing and verifying the sensor setting rather than replacing the calculator.

If you compare 400 at sensitivity 1.0 against 1600 at sensitivity 1.0, the second setup nominally turns four times as far for the same movement. Any immediate overshooting says little about the benefit of greater input resolution. You changed the size of the aiming task. Match the turn first, then compare how comfortably you can perform small corrections and broad movements.

Higher count density is not a promise that every sensor behaves identically at every setting. Firmware, smoothing choices and implementation vary by device. Do not infer a mouse's actual processing behavior from its maximum DPI advertisement. Read the specific manual and use settings it supports directly. Avoid universal claims that 400 is always precise or 1600 is always faster.

The best DPI for FPS is the value that fits a stable overall configuration and survives your comparison. Starting at 800 narrows the initial experiment; it is an editorial starting point, not a measured optimum or a survey of professional players. You can sensibly keep another value if it already works and passes the same checks.`,
      ],
      [
        "Check the active profile before measuring anything",
        `Open the mouse manufacturer's supported configuration software and select the exact connected device. Look for sensitivity stages, profile selection and onboard memory. Record the active stage as well as the stored stages. Some mice can keep a hardware profile after the utility closes, while others use application-linked profiles; consult that model's documentation instead of assuming one behavior.

Next, inspect the physical DPI button assignment. A button below the wheel or on the underside may cycle stages, but appearance is not proof of its function. If accidental presses are common, configure a single stage or a safer assignment where the device allows it. Save the old profile first so the change is reversible. Do not download an unrelated driver simply because it promises to reveal hidden DPI.

Launch the game and check whether its profile becomes active. Return to the utility if necessary to confirm the selection. Repeat after reconnecting the mouse and after restarting the computer. A setup that silently reverts cannot support a useful week-long comparison. Record firmware and utility versions when troubleshooting a change, especially if the behavior started after an update.

Without supported software, use the manual's documented preset sequence or onboard indication. If neither gives a number, describe the stage as unknown rather than guessing from cursor travel. An online ruler-style estimate can be distorted by scaling, acceleration, browser processing and measurement technique. It is a rough consistency check, not a substitute for a documented device setting.`,
      ],
      [
        "Measure physical movement without building a false calculator",
        `Use an unpaid practice environment with a recognizable fixed landmark. Place the mouse on a clean section of pad and mark its starting position with removable tape beside the movement area. Rotate through a known angle, such as one full camera turn, and measure the distance between the start and end positions. Do several slow repetitions in each direction and write down the range.

Keep the mouse orientation consistent. Rotating the mouse body while sliding introduces another source of error. Leave enough desk room to complete the movement without lifting. If a full turn does not fit, use a smaller clearly identifiable angle and label it honestly. Do not scale a vague partial turn into a precise centimeter figure. Repeatability matters more than extra decimal places.

When changing from 800 to 1600, halve a linear game sensitivity and repeat the measurement. If the distance changes substantially, investigate rounding, a different profile or an input-processing option before evaluating aim. Menu sliders sometimes have limited precision. A nominally equivalent number is useful only when the actual movement is sufficiently close for your task.

For browser practice, distinguish cursor motion from locked-camera motion. MDN documents pointer lock as a relative-movement interface and describes unadjusted movement as a separate option with support considerations. That does not prove any particular game requests it. Test the application you use. A browser's page cursor and its locked FPS camera need not respond through the same path.`,
      ],
      [
        "A practical A/B checklist for the next session",
        `- Save the original mouse profile and write down DPI, polling and in-game sensitivity.
- Choose two supported DPI stages, keeping the same game and surface.
- Compensate sensitivity and verify physical turning distance before scoring.
- Use one large-turn task and one small-correction task with unchanged target settings.
- Alternate A, B, B, A blocks so the second setting does not always benefit from warmup.
- Record misses, overshoots, discomfort and interruptions as well as the score.
- Repeat on another day before making the replacement permanent.

For the large-turn task, choose two stable landmarks far enough apart to require a deliberate reposition. Move between them at a controlled pace. Observe whether you run out of comfortable pad space or repeatedly need a lift. For the correction task, begin just outside a small target and settle onto its center before clicking. This separates broad positioning from the final adjustment.

Use the same number of attempts in every block. If one setting feels strange, allow a short unscored familiarization period for both settings rather than granting extra practice only to the favorite. Do not use your single highest score as the decision rule. Compare typical blocks and recurring error patterns. A tiny score difference beside visibly variable attempts is inconclusive.

Stop if you develop discomfort or start gripping harder to force stability. The purpose is to choose a sustainable configuration. A setting that encourages constant tension is a poor practical result even if one short run looks impressive. Change posture or desk arrangement separately; otherwise the comparison no longer isolates DPI.`,
      ],
      [
        "Read overshooting and jitter as clues, not diagnoses",
        `Overshooting can result from excessive overall sensitivity, a rushed movement or a late visual correction. It does not uniquely identify a bad DPI setting. If you overshoot with matched turning distances at both values, slow the final approach and inspect your starting placement. A behavior that persists across both conditions is evidence to examine the task rather than continually changing the sensor.

Visible jitter also has several possible contributors. Check for debris near the sensor, an inconsistent surface, loose cable drag, a slipping grip or a different input mode. Clean according to the manufacturer's instructions and avoid reflective substitutes unless the mouse explicitly supports them. Test ordinary straight movement before blaming advanced firmware processing that you have not measured.

If motion becomes rough only during demanding scenes, consider frame delivery. DPI does not tell you whether the application renders movement smoothly. High mouse reporting rates can be another variable, but leave that setting fixed during this experiment. Mixing DPI and polling changes makes it impossible to say which change mattered. Record the exact condition that reproduces the symptom.

For game-specific follow-through, the [CS2 aim training guide](/guides/cs2-aim-training) covers practice structure and [CS2 settings](/guides/best-cs2-settings) owns the broader configuration discussion. Use the [FPS and aim topic](/guides/topics/fps-and-aim) to choose the next isolated question. None of those pages makes a copied professional setup into evidence about your own hardware.`,
      ],
      [
        "Use browser practice as a controlled destination",
        `A hardware setting can be checked in [PvPStrike](/fps-1v1), but it is a separate CS-style browser game, not Valve CS2. Its local practice match is first to seven against a bot, a best-of-thirteen format. Keep the environment unpaid while comparing inputs. The [browser FPS guide](/guides/browser-fps-games) owns the broader access comparison; this reference table does not rank the games by sensor performance.

| Observation | Check first | Keep unchanged during the check |
| --- | --- | --- |
| Turning distance changes after launch | Application-linked mouse profile | Game sensitivity and surface |
| Desktop feels fast, camera feels normal | Cursor scaling versus relative input | Hardware DPI |
| Fine aim shakes at both DPI stages | Grip, surface and movement pace | Matched turn distance |
| Motion hitches during busy scenes | Frame delivery and reporting load | DPI and target task |

Use the symptom to choose a narrow follow-up. If the camera's physical turn remains constant but the menu cursor changes, that is evidence of different input paths rather than a broken sensitivity number. Keep notes for both behaviors. Conversely, if reconnecting the mouse changes both paths, inspect profile persistence before practicing around an unknown setting.

Do not use a paid match to decide whether a profile has loaded. An unpaid repeatable task provides a clearer comparison without adding loss risk. Browser access also requires permission on restricted devices and networks; a working page is not evidence of authorization.`,
      ],
      [
        "Keep hardware decisions separate from entry decisions",
        `A successful DPI comparison does not establish readiness for cash matches. PvPStrike cash series use best of five or nine and a 5% fee on the combined pot. Consult the lobby for actual available entries despite the published $1 minimum. Cash access is 18+ where permitted, with no promised earnings.

Hypothetical USD example: $1 from each player creates a $2 pot; the winner receives $1.90 credit and has $0.90 net after their own entry. Hypothetical USD example: $5 each creates a $10 pot; the winner receives $9.50 credit and has $4.50 net. A loss costs the entry; credit is not a completed withdrawal.

Read the [FPS money hub](/guides/fps-for-money-hub), the [CS2 versus browser cash-duel distinction](/guides/cs2-1v1-for-money), [crypto FPS payment context](/guides/crypto-fps-game) and [fairness explanation](/fairness) separately from the hardware experiment. A sensor setting cannot remove opponent strength, fees or loss risk.`,
      ],
    ],
    faqs: [
      {
        q: "What DPI do professional FPS players use?",
        a: "There is no single professional DPI. Individual settings change and require dated, attributable evidence. This guide does not claim a current professional distribution. A copied DPI also omits in-game sensitivity, input processing and desk setup, so it is a starting reference at most, not a prescription for your aim.",
      },
      {
        q: "Should I choose 400, 800 or 1600 DPI?",
        a: "Compare supported stages at matched physical turning distance. Start with 800 if you need a simple baseline, then test another stage without changing the task. Favor the setup that remains comfortable and consistent across repeated blocks. The number alone cannot identify a universally best FPS configuration.",
      },
      {
        q: "How can I check my mouse DPI?",
        a: "Use the manufacturer's supported utility, active onboard profile or documented preset indicator. Confirm the setting again after the game launches because an application-linked profile may take over. Cursor travel estimates can be affected by other scaling and should be treated as approximations rather than definitive hardware readings.",
      },
      {
        q: "Does higher DPI make my aim faster?",
        a: "At unchanged sensitivity it usually increases the camera turn for the same physical movement. That is a sensitivity change, not proof of lower end-to-end latency. If you compensate a linear sensitivity control, you can compare count density while retaining approximately the same physical turn scale.",
      },
      {
        q: "Must I disable every extra DPI stage?",
        a: "No. Multiple stages are useful when you deliberately switch tasks and can verify the active profile. Simplify to one stage if accidental switching causes inconsistent sessions. Save the original configuration first, and check what the mouse retains when the configuration utility closes or the device reconnects.",
      },
      {
        q: "Can the same DPI replace cross-game sensitivity conversion?",
        a: "No. Different games translate counts into camera rotation differently. Keep DPI fixed, measure physical turns in each destination and account for view and zoom differences. Equal numbers or equal sensitivity products across different games do not establish identical aim behavior or identical visual target movement.",
      },
    ],
    sources: [
      {
        label: "Logitech: changing sensitivity and device settings",
        url: "https://www.logitech.com/en-us/discover/a/change-mouse-sensitivity",
      },
      {
        label: "Razer: Orochi V2 manual, DPI stages and configuration",
        url: "https://dl.razerzone.com/master-guides/RazerSynapse3/OROCHIV2-00000148-en.pdf",
      },
      pointerSource,
    ],
    related: ["edpi-calculator", "cs2-aim-training", "best-cs2-settings", "browser-fps-games"],
  }),
  article({
    slug: "input-lag",
    keyword: "input lag",
    secondary: ["nvidia reflex", "cs2 fps"],
    title: "Input Lag in FPS: Diagnose Delay and Test Reflex",
    description:
      "Trace FPS input lag through mouse, rendering and display stages. Compare NVIDIA Reflex carefully and separate local delay from network hit confirmation.",
    h1: "Input lag: identify which delay you are actually trying to fix",
    answer:
      "Input lag is the delay between your action and the response you can observe. For FPS aiming, distinguish local click-to-photon or movement-to-photon delay from network hit confirmation. Check frame delivery, display configuration and the input path before buying hardware. NVIDIA Reflex can optimize the rendering pipeline in supported games, but it does not eliminate every source of delay.",
    facts: [
      "FPS is a frame-production rate, not a complete measurement of input latency.",
      "A delayed camera response and a delayed online damage result can have different causes.",
      "Reflex requires supported game and hardware functionality; a browser page does not inherit it automatically.",
      "A repeatable test needs a defined start event, visible endpoint and unchanged workload.",
    ],
    sections: [
      [
        "Define the endpoint before changing settings",
        `The phrase input lag often bundles together several experiences. A camera might follow mouse movement late. A muzzle flash might appear late after a click. An opponent might take damage late even though the muzzle flash appeared promptly. These observations describe different endpoints. Writing down which one happens is the most valuable first troubleshooting step.

For local movement-to-photon delay, the endpoint is a visible camera change on your screen. For click-to-photon delay, choose a visible response associated with a click. For online confirmation, the endpoint may depend on messages traveling to the server and back. Do not compare these numbers as though they measure the same path. Even two local tests can differ if they use different visible responses.

An input moves through hardware, software, simulation, rendering and display stages. Some work overlaps, and the phase relationship between stages matters. A simple diagram of stages is useful, but adding every advertised maximum together does not create a measured latency result. A mouse report interval and a monitor refresh interval describe opportunities for work, not guaranteed full waits on every input.

Start your notes with a sentence such as: the camera hesitates during rapid mouse sweeps in a busy local scene. That description suggests a different experiment from: shots animate immediately but damage arrives late only online. Avoid beginning with a diagnosis like the GPU is laggy. A symptom can be tested; an unsupported component accusation can distract from the evidence.`,
      ],
      [
        "Separate local rendering from network confirmation",
        `| Observation | First comparison | What the comparison can clarify |
| --- | --- | --- |
| Camera feels late even in local practice | Same route with lower rendering load | Whether local workload contributes |
| Click response is prompt, damage arrives late online | Local versus online behavior plus network telemetry | Whether confirmation depends on the network path |
| Motion pauses in bursts | Frametime behavior during the same route | Whether uneven delivery accompanies the feeling |
| Cursor differs from locked camera | Desktop input versus game input mode | Whether separate processing paths matter |
| Only one display feels delayed | Same workload on each supported display path | Whether display configuration deserves attention |

This is a triage table, not a set of diagnoses. A local practice test may differ from a match in scene complexity, player count and server logic. Preserve as much of the workload as possible. If the symptom disappears locally, that narrows the question but does not automatically prove the internet connection is at fault.

Inspect the game's available network telemetry for packet loss, delivery problems and latency under load. A low displayed ping does not guarantee that every message arrives smoothly. Likewise, a high average FPS does not guarantee that all frames arrive evenly. Keep network and rendering observations in separate columns so one flattering number does not obscure a recurring interruption.

The [CS2 subtick guide](/guides/cs2-subtick) covers server-timing concepts. It does not turn a local hardware setting into a server guarantee. For [browser FPS games](/guides/browser-fps-games), browser focus, rendering load and application behavior can add different variables. Use the actual destination rather than assuming an installed-game result transfers unchanged.`,
      ],
      [
        "What NVIDIA Reflex addresses",
        `NVIDIA's developer documentation describes Reflex Low Latency as synchronizing CPU and GPU work for just-in-time rendering. The useful distinction is that it addresses the rendering pipeline. It does not shorten your cable, repair packet loss or make the display's pixels instantaneous. NVIDIA's supported-products page lists Counter-Strike 2 among supported games; use the game's available option on compatible hardware.

Do not treat all features carrying the Reflex name as interchangeable. A newer developer feature described on a technology page is not proof that every supported game has integrated it. Check the specific game's options and support information. A generic web shooter also does not gain game-integrated Reflex merely because the browser runs on an NVIDIA GPU.

For a comparison, keep resolution, frame limit, synchronization choices and scene route unchanged. Test the supported in-game Reflex control as one variable. If the menu exposes more than one enabled mode, treat each as a distinct configuration and note the exact label. Avoid stacking unrelated driver advice from old videos while trying to assess one setting.

If enabling an option changes performance or stability, record that outcome rather than insisting the marketing description must predict your machine. Drivers, workload and hardware can affect practical behavior. Use supported current releases and official guidance when a problem appears. No universal millisecond saving is claimed here, and no setting is presented as a guarantee of winning a duel.`,
      ],
      [
        "Why more FPS does not tell the whole story",
        `Frame rate tells you how many frames are produced over time. It does not by itself say how old the input inside each displayed frame is. Queued work, inconsistent frame pacing and display presentation can change responsiveness even when an average looks attractive. This is why a settings guide should define its goal before maximizing a benchmark number.

For a simple timing reference, a perfectly even 100 frames per second corresponds to a ten-millisecond frame interval. Two hundred corresponds to five milliseconds. These are calculated intervals, not a complete click-to-photon result. Real workloads vary. A counter that rounds or averages may hide the occasional long frame that disrupts a correction.

Compare a quiet scene and a demanding repeatable scene. If the camera feels fine only when little is happening, rendering or CPU workload deserves attention. Reduce one appropriate visual setting and repeat. If the symptom persists unchanged, do not continue lowering every option indefinitely. Record that the initial workload hypothesis did not explain the behavior well.

The [CS2 settings page](/guides/best-cs2-settings) owns the broader graphics configuration. This guide's task is diagnosis, so it does not prescribe a universal resolution or launch-option list. Keep the final performance target compatible with the display and the game you actually play. A setting chosen for one workload may be unsuitable for another.`,
      ],
      [
        "Inspect the display and input path methodically",
        `Check that the operating system is using the intended refresh rate on the intended display. A high-refresh panel can still be configured at a lower mode. Use a supported cable and connection path, and consult the display manual for mode limitations. On a laptop with several output paths, document which port and screen you used rather than treating the panel specification as the complete setup.

Synchronization, frame limiting and display processing can interact with presentation. Change them through supported controls and test one coherent configuration at a time. Do not promise that a single on/off rule always minimizes delay on every system. If tear control matters to you, include that preference in the decision rather than silently changing the goal halfway through the comparison.

At the mouse, confirm a stable profile and connection. A high reporting stage that causes hitches can feel like input lag, even though its nominal report interval is shorter. Razer documents that processing tradeoff. Check receiver placement or cable behavior independently from game settings. Do not change DPI to compensate for delayed-looking motion; a sensitivity change does not identify the timing problem.

For a browser, distinguish ordinary cursor movement from pointer-locked camera movement. MDN describes these as different input uses and documents an unadjusted-movement option. That is not confirmation of a particular game's implementation. Test focus, supported browser behavior and the game's own controls. Do not install scripts that intercept input to force a claimed raw-input upgrade.`,
      ],
      [
        "Compare measurement methods before trusting a number",
        `| Method | Useful output | Important limitation |
| --- | --- | --- |
| Game FPS and frametime display | Frame production and interruptions | Does not directly measure physical click-to-photon delay |
| Supported latency telemetry | The stages the tool explicitly reports | Reported PC latency may exclude mouse or display stages |
| Compatible hardware latency analyzer | Defined click-to-visible-response measurement | Requires supported equipment and correct detection setup |
| High-speed external camera | Relative timing between visible physical action and response | Camera cadence, shutter and event choice limit precision |
| Subjective paired comparison | Whether a configuration feels consistently preferable | Cannot establish an exact millisecond saving |

NVIDIA's Reflex Analyzer guide explains a compatible hardware measurement workflow. Follow the equipment and detection requirements rather than assuming any monitor can perform the same measurement. A detection box must watch the response you intend to measure. If it watches unrelated motion, the resulting number may answer the wrong question.

For external video, place the physical action and screen response in view and explain how you identify the first event. A camera captures at discrete moments, so the event can occur between captured frames. Rolling shutter and exposure can complicate interpretation further. Use repeated trials and avoid reporting precision finer than the method supports.

This article reports no hands-on measurements. If you use a measurement tool, retain its name, version, settings, event definition and trial count. A screenshot of one low number is weaker evidence than a repeatable distribution gathered under a known workload. Do not compare your result with another person's chart unless the endpoints and methods match.`,
      ],
      [
        "A focused troubleshooting checklist",
        `- Describe the delayed response: camera, click animation or online confirmation.
- Save the current settings and record the hardware, display path and software versions.
- Reproduce the symptom with a short consistent route or action sequence.
- Check refresh configuration and observe frame delivery before changing hardware.
- Compare one supported rendering or input option at a time, including Reflex where available.
- Repeat both baseline and changed conditions in alternating order.
- Keep an improvement only when it persists across another session and ordinary workload.

Choose an observation window long enough to contain the recurring symptom, but do not keep testing until fatigue makes every configuration feel poor. Pause between blocks and use the same movement pace. If the problem is intermittent, write down when it happens and preserve the conditions rather than declaring success after one clean minute.

When a change helps, reverse it once if practical and check whether the symptom returns. This simple reversal strengthens the connection between the setting and the outcome. It also catches accidental improvements caused by a restarted game or a background task finishing. Keep the original profile available so you can distinguish a stable fix from a temporary coincidence.

If no single change explains the behavior, summarize what remains. A useful support report says which endpoint is late, which workloads reproduce it and which comparisons did not help. That is more actionable than an undifferentiated complaint about lag. Stop changing settings randomly once the evidence calls for application or hardware support.`,
      ],
      [
        "Transfer the result into practice, not a hardware promise",
        `After finding a stable configuration, return to an ordinary unpaid practice task. A lower measured delay does not automatically improve target selection, movement timing or recoil control. Look for the original symptom first. If it is gone, retain the setup long enough to rebuild a reliable reference rather than immediately beginning another optimization experiment.

Use [CS2 aim training](/guides/cs2-aim-training) to separate a mechanical drill from a performance diagnostic, and the [FPS and aim topic](/guides/topics/fps-and-aim) for related concepts. A drill score can vary with familiarity, concentration and target layout. It should not be used as the sole latency instrument. Keep technical observations and skill observations distinct.

For [PvPStrike](/fps-1v1), local practice is first to seven against a bot, while cash series are best of five or nine. It is a separate CS-style browser game. Server validation of inputs, hits and results does not promise cheating immunity or erase network delay. The [fairness page](/fairness) describes the product boundary rather than a hardware certification.`,
      ],
      [
        "If the next step involves an entry fee",
        `Cash play is 18+ where permitted. PvPStrike charges 5% of the combined pot; the published minimum is $1, with actual entries determined by the lobby. Hypothetical USD example: $1 each produces $1.90 winner credit and $0.90 net after the winner's entry. Hypothetical USD example: $5 each produces $9.50 credit and $4.50 net. Losing costs the entry; withdrawal is separate from credit.

The [FPS money hub](/guides/fps-for-money-hub), [CS2 cash-duel explanation](/guides/cs2-1v1-for-money) and [crypto FPS guide](/guides/crypto-fps-game) cover those decisions. Reduced input lag is not an earnings forecast and should not be used to justify a larger stake.`,
      ],
    ],
    faqs: [
      {
        q: "What causes input lag in FPS games?",
        a: "Possible contributors include the input device, report handling, simulation timing, rendering queues, uneven frame delivery and display presentation. Online result confirmation can add a network path. Define the response that feels late before choosing a test; the same word lag can otherwise send you toward the wrong component.",
      },
      {
        q: "Should I turn NVIDIA Reflex on in CS2?",
        a: "On supported hardware, compare the available in-game setting with your baseline under the same workload. Reflex targets rendering-pipeline latency, but the practical outcome depends on the complete configuration. Keep frame limits, resolution and synchronization unchanged during that comparison, and do not assume a fixed millisecond saving.",
      },
      {
        q: "How can I test input lag at home?",
        a: "Begin with repeatable paired comparisons and frame-delivery observations. Exact click-to-photon measurement requires a suitable instrument or carefully limited external video method. State the event endpoints, equipment and precision. An FPS counter or an online reaction score is not a direct measurement of total physical input latency.",
      },
      {
        q: "Does higher CS2 FPS always mean lower input lag?",
        a: "Higher stable frame production can improve update opportunities, but average FPS alone does not describe input age, queueing or display response. Inspect the complete presentation path and recurring long frames. Two systems with the same average can behave differently, so do not substitute the counter for an actual defined latency measurement.",
      },
      {
        q: "Can Reflex fix high ping?",
        a: "No. Optimizing local rendering does not shorten the internet route or repair packet loss. If camera and click responses are prompt but damage confirmation is late online, examine network telemetry and server-dependent behavior separately. A local improvement and an online delivery problem can exist at the same time.",
      },
      {
        q: "Is a browser reaction-time test a latency analyzer?",
        a: "No. Its result includes human response and the test's presentation and event-handling behavior. It may be useful for repeated observations under identical conditions, but it cannot isolate mouse, GPU and monitor delays. Avoid subtracting that score from a supposed human average to invent a hardware latency figure.",
      },
    ],
    sources: [
      reflexSource,
      pollingSource,
      pointerSource,
      {
        label: "NVIDIA: supported Reflex products and games",
        url: "https://www.nvidia.com/en-gb/geforce/technologies/reflex/supported-products/",
      },
      {
        label: "NVIDIA: Reflex Analyzer measurement workflow",
        url: "https://www.nvidia.com/en-us/geforce/news/reflex-latency-analyzer-360hz-g-sync-monitors/",
      },
    ],
    related: ["best-cs2-settings", "cs2-subtick", "cs2-aim-training", "browser-fps-games"],
  }),
  article({
    slug: "240hz-vs-144hz",
    keyword: "240hz vs 144hz",
    secondary: ["best monitor for cs2"],
    title: "240Hz vs 144Hz for FPS: Is the Upgrade Worth It?",
    description:
      "Compare 240Hz and 144Hz refresh intervals, frame delivery and monitor tradeoffs. Decide whether an upgrade fits your CS2 workload without invented benchmarks.",
    h1: "240Hz vs 144Hz: compare the whole display decision",
    answer:
      "A 240Hz display has a nominal 4.17ms refresh interval, compared with 6.94ms at 144Hz. That creates more frequent display updates, but it is not a guaranteed 2.78ms reduction in total input lag. An upgrade makes most sense when your game delivers suitable stable frames and the monitor also meets your clarity, resolution, connection and comfort needs.",
    facts: [
      "Refresh interval is calculated as 1000 divided by refresh rate; it is not a measured response-time specification.",
      "144Hz to 240Hz shortens the nominal interval by about 2.78ms; 240Hz to 360Hz shortens it by about 1.39ms.",
      "A monitor's maximum refresh depends on the selected mode and supported connection path.",
      "A frame-rate average cannot establish motion clarity, pixel response or total display latency.",
    ],
    sections: [
      [
        "What changes when refresh rate rises",
        `Refresh rate is the number of display updates per second supported in the selected mode. A higher rate gives the presentation system more frequent opportunities to show updated content. It can make motion appear more continuous, but the result also depends on the frames supplied and how the panel presents them. The printed hertz number is a useful starting specification, not a complete image-quality review.

Divide one second by 144 and you get approximately 6.94 milliseconds. Divide by 240 and you get approximately 4.17 milliseconds. These are nominal refresh intervals. A particular input might occur at different points within the rendering and scanout cycles, so subtracting the intervals does not establish the exact benefit you will experience from moving the mouse.

The distinction matters when a shopping page promises a universal competitive advantage. Refresh rate does not identify an opponent sooner if the relevant frame has not been produced, and it does not fix poor crosshair placement. It changes part of the visual delivery path. Evaluate that change alongside stable game performance rather than turning it into a prediction of wins or rank.

For a familiar reference, compare the same moving camera route on one display at two supported rates. That isolates refresh more effectively than comparing unrelated monitors with different size, resolution and processing. It still does not make the lower-rate mode identical to a dedicated lower-rate product. Label the comparison as a mode test, not a review of every monitor in either category.`,
      ],
      [
        "144Hz, 240Hz and 360Hz in calculated intervals",
        `| Refresh rate | Nominal interval | Change from previous row | Useful interpretation |
| --- | --- | --- | --- |
| 60Hz | 16.67ms | Reference | Relatively long interval between updates |
| 144Hz | 6.94ms | About 9.72ms shorter | Large interval reduction from 60Hz |
| 240Hz | 4.17ms | About 2.78ms shorter | More frequent updates than 144Hz |
| 360Hz | 2.78ms | About 1.39ms shorter | Smaller absolute step beyond 240Hz |

All values are arithmetic, rounded to two decimal places. They are not measured monitor response times, motion-picture response times or click-to-photon results. A ratio such as 240 divided by 144 tells you the frequency change; it does not tell you that your aim becomes the same proportion better. Human performance cannot be derived from that ratio.

The absolute interval reduction gets smaller as the starting refresh rises. That does not make the later step worthless, but it changes the purchase question. If you already have a satisfactory 240Hz setup, a 360Hz upgrade needs a more specific justification than the original move from 60Hz. Comfort, clarity, features and available spending matter alongside frequency.

Avoid an artificial threshold where 239 frames per second supposedly makes 240Hz useless. Frame delivery and refresh interact continuously, with synchronization and presentation behavior affecting the result. At the same time, a system that struggles to produce consistent frames may have a more urgent bottleneck. Look at representative play instead of relying on the highest FPS observed while facing a blank wall.`,
      ],
      [
        "Measure your workload before choosing a monitor category",
        `Record performance at the resolution and graphics settings you intend to keep. Use a representative local sequence where possible, then observe ordinary matches as a separate check. Include demanding scenes and active movement. Your average, recurring pauses and broad range all help describe the workload. Do not invent a percentile figure if your tool does not measure it.

The goal is to understand whether the system supplies frequent, steady updates during the moments that matter. A display upgrade cannot make a long rendering stall disappear. If the camera visibly hitches, inspect the game and computer workload before assuming a faster panel is the missing piece. A monitor and a performance fix may both be useful, but they solve different problems.

Changing resolution changes the workload too. Comparing a 1080p 144Hz panel against a higher-resolution 240Hz panel is not only a refresh comparison. Decide whether you value the sharper image enough to accept different performance demands. If you plan to lower the game's rendering resolution, inspect how that image looks on the candidate panel instead of assuming scaling will be equally clear.

The [CS2 settings guide](/guides/best-cs2-settings) covers broader configuration choices, and [CS2 launch options](/guides/cs2-launch-options) separates supported options from magic performance claims. Use those pages to establish a stable workload first. This article does not supply measured CS2 FPS for a computer it has not tested.`,
      ],
      [
        "The best monitor for CS2 is a requirements decision",
        `| Requirement | Why it belongs beside refresh rate | What to verify |
| --- | --- | --- |
| Resolution and size | Change visual scale, desktop space and workload | Native mode and your intended viewing distance |
| Motion behavior | Pixel transitions and processing affect moving clarity | Model-specific documentation and comparable measurements |
| Connection support | The full mode must pass through your actual port path | Monitor manual, GPU output and cable requirements |
| Adjustable stand | A usable position supports a repeatable setup | Height, tilt, desk space and compatible mounting |
| Synchronization features | Affect how frames meet display updates | Supported modes and game configuration |
| Everyday use | Text, color and work needs may outweigh a small interval step | Your own non-game applications and comfort |

This table is a selection framework, not a seller ranking. A label such as one-millisecond response time does not reveal the entire behavior across pixel transitions or processing modes. Read the conditions attached to the specification. Do not compare different measurement definitions as though they were a standardized total-latency figure.

Panel technology alone also does not establish a universal winner. Specific implementations and modes matter. A display can trade image characteristics against refresh, processing or other features. If a manufacturer offers an aggressive response setting, inspect the actual intended mode instead of automatically selecting the largest performance label. Artifacts and comfort belong in the evaluation.

For work and play on the same screen, decide which compromises you can sustain every day. A screen selected only for a short FPS session may be awkward for long text work or your desk arrangement. Write the minimum requirements before comparing models. That prevents a high refresh advertisement from overriding a feature you actually need.`,
      ],
      [
        "Confirm that the advertised mode is really active",
        `Microsoft's support guidance places refresh selection in Windows Advanced display settings. Select the correct screen when several displays are connected, then verify both resolution and rate. The available modes depend on the hardware path. A monitor capable of 240Hz is not necessarily running at 240Hz immediately after connection or after a configuration change.

Consult the monitor manual for the supported port, resolution and cable combination. ZOWIE's high-refresh setup guidance likewise emphasizes the connection and configuration path. Do not assume every HDMI or DisplayPort socket on every device has identical capabilities. A dock or adapter can introduce another limitation, particularly in a laptop setup.

Check the game's chosen display mode and any refresh selection it exposes. Keep the operating-system and application configuration documented. If switching fullscreen behavior changes the available mode, record that as part of the setup. Avoid unsupported resolution utilities or bypasses simply to force a number that the documented connection does not offer.

If the desired rate disappears after reconnecting, test the supported direct path and confirm the selected screen again. A persistent configuration is more useful than a screenshot showing the option once. Keep a note of the working cable and port so another device change does not silently undo it. This is especially helpful when a desk uses a shared dock for work and gaming.

When evaluating a replacement, list the complete intended mode: resolution, refresh, connection and any required display feature. Compare that list with the documented supported combinations. This prevents a purchase based on separate maximum specifications that cannot necessarily be used together in your intended setup.`,
      ],
      [
        "A practical before-and-after checklist",
        `- Write down the present display's size, resolution, active refresh and connection path.
- Record representative frame delivery at the settings you intend to use.
- Define the problem: motion clarity, delayed response, image size or another specific issue.
- Check candidate modes and required ports against the actual computer and cable path.
- Compare supported refresh modes on the same display when possible, using the same route.
- Inspect normal work applications, viewing comfort and desk fit before finalizing the choice.
- Recheck the active mode after setup and after the next restart.

During a mode comparison, keep target placement and camera speed similar. Read a moving scene rather than staring at a static menu, since refresh benefits concern changing content. Include both slow tracking and faster direction changes. If the comparison uses different panels, note the extra differences instead of crediting every preference to hertz.

Allow time to settle into each condition, but use equal periods. Alternating the order helps reduce the effect of always testing the supposedly better mode second. A blind comparison can be useful if another person can change the supported mode without changing other settings, but do not pretend it removes every clue. Resolution, brightness or on-screen indicators may reveal the condition.

Use unpaid practice, not match stakes, to evaluate the setup. Record what improved in practical terms: following movement, reading an edge during a turn or retaining a stable image. If the result is uncertain, uncertainty is a valid purchasing outcome. There is no need to invent a performance gain to justify keeping the monitor you already own.`,
      ],
      [
        "When to keep 144Hz, move to 240Hz or consider 360Hz",
        `Keeping 144Hz is reasonable when the current screen meets your needs and another limitation dominates. Examples include inconsistent rendering, inadequate desk positioning or a need for a different resolution. Those are decision examples, not statements that 144Hz and 240Hz look identical. A purchase should address the actual constraint instead of only increasing a specification.

Moving to 240Hz becomes more persuasive when you value frequent visual updates, have a workload that can support them and find a panel that meets the rest of your requirements. You do not need a fabricated professional endorsement. Compare the total change from your present setup, including size, mode support and everyday use, then decide whether the benefit is worth your own spending.

Considering 360Hz makes sense as a narrower optimization when the complete setup is already stable and the remaining display step matters to you. The nominal interval difference from 240Hz is about 1.39ms. That is not zero, but it is also not a universal measured reduction in response. Treat it as one contribution in a system rather than a shortcut to better decisions.

No current product prices or model rankings are supplied here. They change and would need a separate dated comparison with explicit requirements. A useful shortlist can be built from manufacturer specifications, but a specification sheet alone cannot establish all real motion behavior. Avoid pretending a purchased panel has been hands-on tested by this publisher.`,
      ],
      [
        "Carry the setup into the game you actually practice",
        `A monitor mode can be checked in native CS2 practice or an authorized browser environment, but the games remain different. [CS2 aim training](/guides/cs2-aim-training) addresses native practice structure. [Browser FPS games](/guides/browser-fps-games) covers access choices. The [FPS and aim topic](/guides/topics/fps-and-aim) helps connect those decisions without treating a panel specification as a game recommendation.

[PvPStrike](/fps-1v1) is an independent CS-style browser game, not Valve CS2. Its local practice is first to seven against a bot. Use it only as a practical control check, not a standardized display benchmark or proof that a new monitor will earn money. Server validation of inputs, hits and results does not guarantee immunity from cheating; see [fairness](/fairness).

Cash play is 18+ where permitted, with best-of-five or best-of-nine series and a 5% combined-pot fee. Check the lobby for entries despite the published $1 minimum. Hypothetical USD example: $1 each yields $1.90 winner credit and $0.90 net. Hypothetical USD example: $5 each yields $9.50 credit and $4.50 net. Net subtracts the winner's own entry; a loss costs the entry, and withdrawal is separate.

Review the [FPS money hub](/guides/fps-for-money-hub), [CS2 cash-duel distinction](/guides/cs2-1v1-for-money) and [crypto FPS context](/guides/crypto-fps-game) before any entry decision. A display purchase does not establish a profitable edge.`,
      ],
    ],
    faqs: [
      {
        q: "Is 240Hz worth it over 144Hz?",
        a: "It can be worthwhile when you value the more frequent updates and your workload and candidate panel support the rest of your needs. Compare the actual setup, not only the label. The nominal interval shrinks from about 6.94ms to 4.17ms, but that is not a guaranteed total-latency saving or win-rate increase.",
      },
      {
        q: "What is the best monitor for CS2?",
        a: "There is no single model for every budget, desk and workload. Define refresh, resolution, motion behavior, supported connections, positioning and everyday-use requirements. Then verify model-specific specifications and comparable evidence. This guide supplies a selection method rather than inventing current prices, hands-on findings or a universal winner.",
      },
      {
        q: "How much better is 360Hz than 240Hz?",
        a: "The calculated refresh interval falls from about 4.17ms to 2.78ms, a difference of about 1.39ms. Actual experience depends on frame delivery and panel behavior. That smaller absolute step can matter to some users, but it does not establish an exact improvement in aim, reaction time or match results.",
      },
      {
        q: "Do I need a constant 240 FPS for a 240Hz monitor?",
        a: "There is no sharp rule that makes the display useless below one exact FPS number. Presentation and synchronization matter, and frame delivery varies. However, frequent stable frames help make a high-refresh setup useful. Inspect representative gameplay rather than using a blank-scene peak as your purchasing evidence.",
      },
      {
        q: "Why is my 240Hz screen showing a lower refresh?",
        a: "Check the selected screen and mode in operating-system settings, then verify the documented cable, port and adapter path. Confirm the game's configuration too. The panel's maximum specification does not mean every resolution or connection exposes that rate, and a dock may impose a separate limitation.",
      },
      {
        q: "Does a one-millisecond response claim mean one-millisecond input lag?",
        a: "No. A response specification can describe a particular pixel-transition measurement under stated conditions. Total input-to-visible-response includes other stages and may use a different definition. Read the manufacturer's conditions and do not compare unlike numbers as though they measured the complete system in the same way.",
      },
    ],
    sources: [
      {
        label: "Microsoft: selecting and understanding refresh rate",
        url: "https://support.microsoft.com/en-us/windows/hardware/display-graphics/change-the-refresh-rate-on-your-monitor-in-windows",
      },
      {
        label: "ZOWIE: configuring supported high-refresh modes",
        url: "https://zowie.benq.com/en-au/support/faq/product/application/zowiemonitor-faq-kn-00014.html",
      },
      {
        label: "NVIDIA: defined hardware latency measurements",
        url: "https://www.nvidia.com/en-us/geforce/news/reflex-latency-analyzer-360hz-g-sync-monitors/",
      },
    ],
    related: ["best-cs2-settings", "cs2-launch-options", "cs2-aim-training", "browser-fps-games"],
  }),
  article({
    slug: "mouse-accuracy-test",
    keyword: "mouse accuracy test",
    secondary: ["click speed test", "reaction time test", "aim booster"],
    title: "Mouse Accuracy Test: A Repeatable 15-Target Drill",
    description:
      "Use a 15-target mouse accuracy drill to compare control, misses and elapsed time. Follow a repeatable protocol without mistaking the result for reaction time.",
    h1: "Mouse accuracy test: measure a controlled 15-target sequence",
    widget: "mouse-accuracy",
    answer:
      "Use the local mouse accuracy test to hit a fixed sequence of 15 targets while recording misses and elapsed time. Each target is 44 pixels across on a 288-pixel-high board. Accuracy is hits divided by hits plus misses; elapsed time includes moving and clicking. This is a repeatable pointer-control drill, not a pure reaction-time test, professional ranking or prediction of duel wins.",
    facts: [
      "The fixed 15-target sequence rewards familiarity, so compare equally practiced sessions.",
      "Background left-clicks count as misses; accuracy uses hits divided by all counted attempts.",
      "The performance.now clock records elapsed task time, which includes movement and clicking.",
      "Mouse, touch and keyboard runs test different input tasks and must be compared separately.",
      "Keep viewport, page zoom, mouse and DPI unchanged for a useful retest.",
    ],
    sections: [
      [
        "What the local test actually measures",
        `This page's widget presents a fixed sequence of fifteen targets. Complete the sequence by selecting each target in turn. The target diameter is forty-four pixels and the board height is two hundred eighty-eight pixels. Those dimensions describe the interface; they are not standardized physical distances. Display density, page zoom and viewport size affect how the task appears and how far your pointer travels.

The result has two main parts. Accuracy describes the share of counted attempts that hit a target. Elapsed time describes how long the moving-and-clicking sequence took according to the performance.now clock. Neither number can be interpreted alone. A very cautious run can be accurate but slow, while a hurried run can finish sooner with avoidable misses.

The sequence is fixed rather than a freshly randomized benchmark on every attempt. That makes it useful for repeating a known task, but it also means learning the order can improve the result. Treat early runs as familiarization. Do not compare your first attempt against somebody else's well-practiced attempt and call the difference a measurement of natural talent.

Results are local task feedback. There is no uploaded-results system or account ranking in this protocol. The interface does not assign a professional percentile, certify hardware quality or determine competitive readiness. Its useful role is smaller: it gives you a consistent way to observe pointer control under conditions you can write down and repeat.`,
      ],
      [
        "Accuracy, speed and reaction are different questions",
        `| Test type | Main task | Useful observation | What it cannot establish alone |
| --- | --- | --- | --- |
| This mouse accuracy sequence | Move to and select 15 fixed targets | Misses, controlled completion and elapsed time | Pure visual reaction speed or duel skill |
| Click speed test | Repeat clicks under a defined rule | Click frequency in that specific task | Precision while moving between targets |
| Reaction time test | Respond to an unpredictable signal | Combined response under that test's conditions | Isolated biological reaction or FPS rank |
| Three-dimensional aim drill | Rotate a camera toward spatial targets | Task-specific camera control | Full tactical-game decision quality |

A click speed test can be useful if the question is repeated button activation. It does not tell you whether the pointer reaches a small target accurately. Likewise, a reaction time test is built around detecting a signal, but its result still includes the display, input and application path. Do not substitute one score for another merely because all three tasks involve a mouse.

The local sequence includes target acquisition, movement planning, pointer travel and clicking. Because the order is fixed, anticipation can reduce some decision demands. Calling the total elapsed value reaction time would therefore mislabel the task. Dividing the total by fifteen gives an average task duration per target, not fifteen independent visual-reaction measurements.

If you are looking for an aim booster, define the behavior you want to improve. This drill may help you notice rushed clicks or repeated overshooting in a two-dimensional pointer task. It does not promise a neurological improvement, a rank increase or a direct transfer percentage. Progress in a familiar interface should be verified in the destination game.`,
      ],
      [
        "Set up a baseline you can reproduce",
        `Before the scored blocks, choose a stable viewport and page zoom. Avoid resizing the browser between attempts. Keep the window on the same display and use the same viewing position. If the board width changes with the available space, target travel can change too. A result from a narrow window and one from a wide window are different conditions.

Record mouse model, active DPI stage and the relevant pointer settings. This widget is a page pointer task, so do not assume it follows the same processing path as a pointer-locked FPS camera. MDN documents the difference between cursor coordinates and relative locked movement. A native game's raw-input configuration does not automatically describe how a page cursor behaves.

Use the same surface and a comfortable repeatable hand position. Clear cable snags and remove objects that interrupt movement. Do not force the mouse into a rigid pose just to create an artificial laboratory setup. The baseline should resemble ordinary use closely enough that an improvement has practical meaning. Stop if the task encourages discomfort or unnecessary tension.

Make one or two unscored familiarization runs, using the same allowance on future test days. Then begin the scored blocks. If you change hardware or pointer settings, allow the same short adjustment period before recording the new condition. Equal preparation helps avoid giving the favored setup more practice while treating the baseline as an awkward first attempt.`,
      ],
      [
        "A concrete fifteen-target protocol",
        `- Fix the browser viewport, page zoom, display, mouse, DPI and input method.
- Complete the same brief familiarization allowance before every scored session.
- Run three scored 15-target sequences with a short rest between them.
- Record completion time, misses, accuracy and one observation about the error pattern.
- Keep ordinary deliberate clicks; do not use macros or automated clicking.
- Repeat the three-run block on another day under the same conditions.
- Compare typical runs and recurring mistakes before changing the protocol.

Begin with an accuracy-first instruction: move onto the target, settle enough to select it deliberately, then continue. This is a self-imposed pacing rule, not a special widget mode. Your aim is to learn the sequence and reveal whether clicks happen before the pointer arrives. Do not rush to make the first recorded time look impressive.

On a later equally prepared block, use a comfortable faster pace while preserving deliberate selection. Compare time and misses together. If the faster block cuts time but adds many errors, it describes a speed-accuracy tradeoff. It does not automatically represent improvement. If time falls without a recurring rise in misses across several sessions, that is a more encouraging task-specific result.

Do not keep repeating indefinitely until one unusually good run appears. Set the number of scored runs in advance and retain all of them. A median of three can summarize the middle result without allowing the single best attempt to dominate. Keep the individual results too, since a wide spread can be more informative than a neat summary number.`,
      ],
      [
        "Read the arithmetic without creating a skill rating",
        `Accuracy is hits divided by hits plus misses. For a completed fifteen-hit sequence with no misses, that is 15 divided by 15, or 100%. With three background misses it is 15 divided by 18, approximately 83.3%. These are worked arithmetic examples, not benchmark standards. They explain the denominator so you can interpret a result honestly.

Elapsed time includes the work between targets and the clicks themselves. It is not corrected for display latency, event scheduling or the distance your pointer travels. The performance.now clock supplies a task-timing reference, but a precise clock does not transform the whole activity into a precise biological measurement. Keep the label as elapsed sequence time.

Suppose one run takes twenty seconds with no misses and another takes seventeen seconds with four misses. Those hypothetical results describe different tradeoffs. You cannot decide which is better without defining the practice goal. For a cautious-control block, the first may fit the instruction better. For exploratory speed work, the second may identify where accuracy breaks down.

Avoid combining time and accuracy into an invented universal score. A custom formula would embed choices about how much a miss should cost relative to a second. Unless those choices are validated for a specific purpose, the formula adds apparent authority without new evidence. Keep the two outcomes visible and explain the behavior behind them.`,
      ],
      [
        "Diagnose a pattern, then change one thing",
        `| Repeated observation | Next drill instruction | Variable to preserve |
| --- | --- | --- |
| Click lands just before the pointer reaches the target | Delay the click until arrival is visible | Same DPI and sequence |
| Pointer repeatedly passes the target and returns | Slow the final approach rather than the whole travel | Same viewport and target size |
| Large moves are comfortable, final corrections are shaky | Relax grip and practice a deliberate final correction | Same broad movement pace |
| Misses grow late in successive runs | Rest, then repeat the planned block another day | Same number of scored runs |
| Time improves mainly as the order becomes familiar | Compare equally familiar sessions | Same sequence and warmup allowance |

These instructions are observations to test, not diagnoses of a medical or hardware condition. If the pointer behaves erratically outside the drill too, inspect the ordinary device path and supported settings. If only late runs deteriorate, more repetitions may make the evidence worse. Stop the block and preserve the result rather than forcing a personal record.

For premature clicks, separate movement from activation for one practice run: arrive, confirm, click. Then return to your normal pace. For overshoot, preserve most of the movement speed and make the final approach more deliberate. Changing everything to extremely slow motion can hide the specific error you wanted to understand.

Keep changes small enough to interpret. Adjusting DPI, pointer speed, posture and pace together creates a new task but cannot tell you which change helped. Write down the hypothesis first. A useful note says: waiting until arrival reduced early clicks in two comparable blocks. It does not say: this drill proved my mouse was too fast.`,
      ],
      [
        "Keep accessibility modes separate and meaningful",
        `The widget supports touch and keyboard accessibility, but those interactions do not measure the same movement task as a mouse pointer. Keyboard focus and activation can involve a different sequence of actions. Touch has a different pointing method, physical contact area and occlusion. Compare each input method with itself rather than mixing them into one leaderboard.

If you use keyboard access, record that mode explicitly and evaluate consistency within it. If you use touch, keep the device orientation and viewport fixed. Do not label a touch result as mouse accuracy or use it to judge a mouse's sensor. Accessibility makes the activity available; it does not require pretending all input methods generate interchangeable measurements.

Likewise, changing page zoom to make targets more comfortable changes the visual task. That can be an appropriate accommodation. Establish the new baseline at that zoom and compare future sessions against it. A useful personal protocol can be adapted to the user without claiming comparability with every other person's screen and input method.

The same principle applies when moving between a laptop trackpad and a mouse. Both can operate a pointer, but their motor demands differ. Record the actual device rather than treating the operating system's generic pointer label as a complete description. The purpose is honest feedback that supports practice, not a flattering number created by mixing easier and harder conditions.`,
      ],
      [
        "Check transfer in an FPS rather than assuming it",
        `A two-dimensional cursor task differs from rotating a camera in three-dimensional space. It removes recoil, movement accuracy, target exposure and opponent decisions. If the drill helps you notice early clicks, test that habit in an unpaid FPS exercise with a clear first-shot goal. Look for the same error pattern instead of expecting the same score.

Use [CS2 aim training](/guides/cs2-aim-training) for a native-game practice framework, [eDPI](/guides/edpi-calculator) to understand sensitivity products and [K/D and hit rate](/guides/k-d-ratio) to interpret match denominators. The [FPS and aim topic](/guides/topics/fps-and-aim) connects those separate questions. None converts this widget result into a professional percentile.

[Browser FPS games](/guides/browser-fps-games) covers access choices. [PvPStrike](/fps-1v1) is a separate CS-style browser game with local first-to-seven bot practice, not Valve CS2. Use an authorized device and network. Server validation of inputs, hits and results does not imply that every opponent is cheat-free; the [fairness explanation](/fairness) describes that boundary.

PvPStrike cash play is 18+ where permitted, with best-of-five or best-of-nine series and a 5% combined-pot fee. Check actual lobby entries despite the published $1 minimum. Hypothetical USD example: $1 each yields $1.90 winner credit and $0.90 net. Hypothetical USD example: $5 each yields $9.50 credit and $4.50 net. Net subtracts the winner's entry; losses cost the entry, and withdrawal is separate.

Read the [FPS money hub](/guides/fps-for-money-hub), [CS2 cash-duel distinction](/guides/cs2-1v1-for-money) and [crypto FPS guide](/guides/crypto-fps-game) separately. This test does not predict wins or establish an earnings opportunity.`,
      ],
    ],
    faqs: [
      {
        q: "How do I use this mouse accuracy test?",
        a: "Keep viewport, zoom, mouse and DPI fixed, familiarize yourself with the sequence, then complete a planned block of three 15-target runs. Record both misses and elapsed time. Retest under the same conditions and compare typical runs. Do not keep only the fastest attempt or mix mouse, touch and keyboard results.",
      },
      {
        q: "What is a good reaction time for FPS?",
        a: "This drill does not measure pure reaction time, so it cannot supply a good-reaction threshold. Reaction tests also depend on signal design, device and display behavior, and the population being compared. Use a clearly defined test and comparable evidence rather than assigning an unsupported professional standard to this sequence.",
      },
      {
        q: "Can the result predict whether I will win duels?",
        a: "No. The task omits opponent decisions, camera rotation, movement accuracy, recoil and match conditions. Improvement can reveal better control in this particular sequence, especially as you learn it. Check any useful habit in unpaid game-specific practice rather than converting a local time into a win probability or earnings forecast.",
      },
      {
        q: "Is a click speed test better for aiming?",
        a: "It answers a different question. Repeated click frequency does not establish accurate target acquisition, and very fast clicking can coexist with poor pointer placement. Choose the test that matches the error you are investigating. This sequence is intended to show control, misses and movement-plus-click completion time.",
      },
      {
        q: "Does the test upload a score or rank my account?",
        a: "No uploaded-results or account-ranking system is part of this local drill. Keep your own simple notes if you want to compare sessions. The result is not a verified public record, a professional percentile or proof that one mouse is superior across other users, screens and games.",
      },
      {
        q: "Can I compare touch or keyboard attempts with mouse attempts?",
        a: "Keep those modes separate. They use different pointing or activation tasks even though the widget supports each for accessibility. Establish a baseline within your chosen mode, device and viewport. An accommodated personal protocol can be useful without claiming that every input method produces interchangeable mouse-accuracy measurements.",
      },
    ],
    sources: [
      pointerSource,
      {
        label: "MDN: performance.now timing reference",
        url: "https://developer.mozilla.org/en-US/docs/Web/API/Performance/now",
      },
      {
        label: "3D Aim Trainer: publisher description of separate FPS drills",
        url: "https://www.3daimtrainer.com/faq/",
      },
    ],
    related: ["cs2-aim-training", "edpi-calculator", "k-d-ratio", "browser-fps-games"],
  }),
  article({
    slug: "crosshair-overlay",
    keyword: "crosshair overlay",
    secondary: ["crosshair generator"],
    title: "Crosshair Overlay: Permissions, Setup and Alternatives",
    description:
      "Understand crosshair overlays, native reticles and generators. Check publisher and event permission, then test visibility without assuming any app is ban-safe.",
    h1: "Crosshair overlay: verify permission before adding a reticle",
    answer:
      "A crosshair overlay draws an aiming marker over a game independently of its native reticle. Whether it is allowed depends on the game, implementation and competition rules; no universal ban-safe claim applies. Prefer native crosshair settings when they meet the need, and use a crosshair generator only to create supported settings rather than treating it as permission for an external overlay.",
    facts: [
      "A native crosshair, a settings generator and a live overlay perform different jobs.",
      "An overlay can remain centered while the game's aim, spread or scope behavior changes.",
      "A monitor's built-in marker still needs permission under the applicable rules.",
      "A store listing, download count or absence of a past ban does not establish publisher approval.",
    ],
    sections: [
      [
        "Distinguish the four things people call a crosshair",
        `A native crosshair is drawn by the game under its own settings. It can follow the game's intended visibility rules and may offer static or dynamic behavior. A crosshair generator is a configuration tool: it previews a design and produces settings or a supported import code. The generator need not run while you play. Those two workflows can solve visibility problems without adding a separate live marker.

A software overlay draws a marker above the game through another program. Its implementation might use an ordinary desktop window or a deeper interaction with graphics output. You should not infer the method from the appearance of the marker. Two applications showing identical dots can interact with the game differently and have different compatibility or permission implications.

A monitor reticle is produced by the display's own feature set. It may not involve game software, but that does not make it automatically acceptable in every event. Rules can govern the assistance itself as well as the implementation. Ask the relevant organizer when the rules are unclear. A feature included in hardware is not a substitute for a competition policy.

Finally, a physical mark on a screen is another form of an independent center reference. Its simplicity does not make it a universal workaround for restrictions. The sensible first question is what assistance the game or event permits, followed by which supported method supplies it. Avoid beginning with how to make an unwanted marker harder to detect.`,
      ],
      [
        "Compare native settings, generators and overlays",
        `| Approach | What it changes | Useful role | Permission question |
| --- | --- | --- | --- |
| Native reticle settings | The game's own crosshair configuration | Supported visibility and style adjustments | Which native features does the event allow? |
| Settings generator | A preview and supported configuration output | Exploring dimensions before applying them in game | Is the output supported, without extra live assistance? |
| Software overlay | An independent marker during play | A permitted reference where native options are insufficient | Does this exact implementation comply with game and event rules? |
| Monitor reticle | A display-generated marker | A hardware reference if explicitly permitted | Does the event allow display aiming assistance? |

This comparison does not rank external applications or certify an unnamed tool. It separates the workflow so you can choose the least complicated supported solution. If the game already provides a readable reticle, an extra layer may create more configuration and permission questions without solving a real problem. Start by identifying the visibility issue.

A generator is most useful when it exports settings that you can inspect and apply through the destination game's supported controls. Do not run arbitrary configuration files or scripts just because a preview looks familiar. Review what the output changes. A tool that also alters unrelated settings is doing more than designing a crosshair, and those changes deserve separate scrutiny.

The [CS2 crosshair codes guide](/guides/cs2-crosshair-codes) owns native code handling and examples. This page does not duplicate a code catalog. Its narrower job is explaining independent overlays, permission checks and a visibility test. Keep those intents separate so a useful native-settings link does not become an implied endorsement of external software.`,
      ],
      [
        "Allowed or banned is a policy question with context",
        `Riot's third-party application policy focuses on game integrity and unfair assistance. It identifies problematic behaviors such as revealing hidden information, automation and making decisions for the player, and says it cannot supply a complete safe-app list. That is a policy framework, not blanket approval for every program that markets itself as a crosshair overlay.

For a specific game, read its current publisher guidance and the rules for the queue or event you intend to enter. Then identify the exact application and version. An organizer's local rule can be stricter than a general publisher policy. Approval for one event does not automatically cover a different title, platform or competition.

If the answer remains unclear, use native settings while seeking written clarification from the publisher or organizer. Describe what the tool does, whether it runs during play and how it interacts with the game. A vague request about overlays is harder to answer than a concrete description. Do not treat a community comment as equivalent to official permission.

Avoid claims such as undetectable, guaranteed safe or no one has been banned. Those statements do not establish compliance. Likewise, an application failing to launch does not prove the publisher has declared it a cheat. Compatibility and enforcement are different questions. The practical goal is a permitted setup, not an experiment in whether a detection system notices a particular method.`,
      ],
      [
        "Understand what a fixed marker cannot tell you",
        `A screen-center dot is a geometric reference. It does not necessarily show the current firing direction under every weapon state, recoil behavior, camera animation or scope rule. It also does not display the spread distribution of a shot. A marker that stays still can therefore look authoritative while leaving out the very uncertainty the game intends you to manage.

Changing aspect ratio, resolution or a game viewport can also alter the relationship between the display center and the rendered scene. If the game occupies only part of a screen or uses an unusual presentation mode, the center of the physical panel may not be the relevant center of the image. Verify alignment in a permitted practice environment rather than assuming the default position is correct.

Dynamic native reticles may communicate movement or firing information. An independent static overlay does not automatically reproduce those signals. If you add one marker over another, the result can become harder to read and obscure small targets. More visual information is not always more useful information. Decide what you need to see before adding another layer.

Do not use an overlay to bypass a game state that intentionally removes an aiming reference. If that behavior is restricted or unclear, keep the native presentation. A training aid used in an explicitly permitted practice context should be evaluated under that context's rules; it does not automatically carry into competitive matches.`,
      ],
      [
        "Design for visibility rather than decoration",
        `A useful reticle remains visible against the backgrounds you actually encounter without covering the target feature you need to read. Contrast, line thickness, gap and center shape interact. A tiny dot can disappear on one surface, while a large outlined design can block a small target. There is no universal design that is best at every display scale.

Start with one problem statement: the marker disappears on bright walls, its center covers the target, or the moving elements distract from placement. Change the parameter most directly connected to that problem. Increasing every dimension at once may improve visibility but conceal the target. Reducing everything at once can create a pleasing screenshot that is difficult to use during motion.

Use representative bright, dark and visually busy backgrounds. Compare the design while moving as well as while standing still. A reticle that looks clear in a static settings preview may be hard to locate after a quick turn. Keep display brightness and resolution fixed during the comparison so you can interpret the design change.

Accessibility needs are legitimate selection criteria. If a color or outline makes the reference easier to perceive, establish that as part of your personal configuration. Do not claim that everyone sees the same contrast. A useful recommendation explains the test and leaves room for different visual needs, instead of assigning skill status to a fashionable color or shape.`,
      ],
      [
        "A permission and setup checklist",
        `- Identify the game, platform, queue or event and exact assistance you want.
- Try the supported native crosshair controls before adding a live application.
- Read current publisher guidance and the relevant competition rules.
- Seek specific clarification if the exact external method remains uncertain.
- Obtain any permitted software only from its official publisher and inspect its requested access.
- Save the existing settings and test alignment and visibility in unpaid authorized practice.
- Recheck permission and compatibility after meaningful game or tool changes.

Do not disable anti-cheat, security controls or protected game modes to make an overlay work. A compatibility problem should be handled through supported configuration or the application's official support. If the required workaround contradicts the rules you just checked, choose another method. The purpose of the checklist is a maintainable setup, not a bypass.

For a generator, inspect the exported configuration before applying it. Confirm that the tool targets the correct game and does not require a live overlay for the previewed design. Save the prior code or settings so you can return to them. Test the imported result inside the game; a browser preview cannot prove the destination renders every dimension identically.

If the application asks for broad permissions unrelated to displaying a marker, stop and investigate the publisher's explanation. This is a concrete software-selection question, not a claim that every overlay is malicious. Minimize unnecessary complexity. A supported native setting often makes both troubleshooting and future updates easier to manage.`,
      ],
      [
        "An original reticle comparison protocol",
        `| Test condition | What to observe | Keep fixed |
| --- | --- | --- |
| Bright background, stationary | Whether the center remains visible | Display mode, brightness and viewing position |
| Dark background, stationary | Whether lines merge with scene detail | Same reticle except the one parameter being tested |
| Busy background during a turn | Whether you reacquire the marker without searching | Same route and camera speed |
| Small target at a fixed distance | Whether the marker hides the needed target feature | Target size and distance |
| Repeated first-shot drill | Early clicks, placement errors and visual distraction | Sensitivity, weapon and drill rules |

Use only permitted reticle methods in this protocol. Compare design A and design B in alternating blocks rather than testing the favorite only after you are warmed up. Keep the number of attempts equal. Record specific observations, such as losing the marker on a bright surface, rather than a broad judgment that one design feels more professional.

For the first-shot drill, choose a fixed starting angle and a target that requires a controlled correction. Look for whether the reticle helps you locate the intended point or obscures it. Do not use a high score as proof that an external overlay is permitted. Usability evidence and permission evidence remain separate even when the result is positive.

If the difference is unclear, keep the simpler supported design. A reticle can become familiar without being objectively superior. Give a reasonable design enough consistent practice to evaluate it, then revisit only when a specific problem recurs. Constant redesign makes it harder to distinguish visual adaptation from a true improvement in placement.`,
      ],
      [
        "Keep the reticle in its proper role",
        `Crosshair placement and target selection still require practice. A well-chosen reference can make placement easier to see, but it cannot decide which angle to clear or when to stop moving. [CS2 aim training](/guides/cs2-aim-training) covers a practice framework, and [counter-strafing](/guides/counter-strafing) addresses stopping and firing as a separate question. Neither requires pretending a graphic is an aim assistant.

Use the [FPS and aim topic](/guides/topics/fps-and-aim) to connect those skills, and [browser FPS games](/guides/browser-fps-games) for access context. [PvPStrike](/fps-1v1) is a separate CS-style browser game, not Valve CS2. Its local practice is first to seven against a bot. Do not assume another title's crosshair permissions or native settings apply to this independent game.

PvPStrike validates inputs, hits and results on the server without promising cheating immunity; see [fairness](/fairness). Cash play is 18+ where permitted, using best-of-five or best-of-nine series and a 5% combined-pot fee. The published minimum is $1, but check actual lobby entries.

Hypothetical USD example: $1 each creates a $2 pot, paying $1.90 winner credit and $0.90 net after the winner's entry. Hypothetical USD example: $5 each creates $10, paying $9.50 credit and $4.50 net. Losses cost the entry; wallet credit and withdrawal are distinct. A reticle does not promise earnings.

The [FPS money hub](/guides/fps-for-money-hub), [CS2 cash-duel distinction](/guides/cs2-1v1-for-money) and [crypto FPS guide](/guides/crypto-fps-game) cover entry questions. Keep them separate from whether a crosshair design is readable and permitted.`,
      ],
    ],
    faqs: [
      {
        q: "Are crosshair overlays allowed?",
        a: "There is no universal answer across games, applications and events. Check current publisher policy and the rules of the actual competition, then identify the exact method. Native controls are the simplest supported starting point. A store listing or a claim from the overlay developer does not establish game or organizer approval.",
      },
      {
        q: "Can a crosshair overlay get me banned?",
        a: "An unauthorized tool can create account risk, but this guide does not declare every overlay prohibited or promise that a specific one is safe. Permission depends on implementation and policy. If the answer is unclear, use native settings and seek official clarification instead of testing whether enforcement notices the tool.",
      },
      {
        q: "Is a crosshair generator the same as an overlay?",
        a: "No. A generator can preview a design and export supported settings without drawing anything during play. An overlay supplies a live independent marker. Inspect what the tool actually does, apply only supported output and verify it in the destination game. A familiar preview does not prove a separate live feature is permitted.",
      },
      {
        q: "Does my monitor's built-in crosshair avoid the permission question?",
        a: "No. A competition can regulate aiming assistance regardless of whether hardware or software draws it. Check the relevant rules and ask the organizer when necessary. A built-in feature is not a universal exemption, and using a different method to reproduce restricted assistance does not resolve the underlying rule.",
      },
      {
        q: "Will a fixed dot show exactly where every shot lands?",
        a: "No. Spread, recoil, movement, scope behavior and camera presentation can affect the relationship between a center reference and a shot. A static marker does not reveal every state. Use the game's intended information and test permitted settings in practice rather than treating the dot as a guaranteed impact point.",
      },
      {
        q: "What should I compare before changing my reticle?",
        a: "Test bright, dark and busy backgrounds, movement visibility and whether the center obscures a small target. Change one design parameter at a time and keep sensitivity and display conditions fixed. Prefer a clearly readable supported design over frequent cosmetic changes, and evaluate game-specific placement separately from the graphic.",
      },
    ],
    sources: [
      {
        label: "Riot Games: third-party application policy",
        url: "https://support.riotgames.com/en-us/riot/events/third-party-applications",
      },
    ],
    related: ["cs2-crosshair-codes", "cs2-aim-training", "counter-strafing", "browser-fps-games"],
  }),
  article({
    slug: "valorant-aim-trainer",
    keyword: "valorant aim trainer",
    secondary: ["3d aim trainer", "aim trainer online", "aim trainer free"],
    title: "Valorant Aim Trainer: Build a Focused Practice Routine",
    description:
      "Choose Valorant aim drills by the mistake you need to fix. Compare free browser and installed trainers, calibrate settings and check transfer in the game.",
    h1: "Valorant aim trainer: select a drill for a specific mistake",
    answer:
      "A Valorant aim trainer is useful when it isolates a control problem you can later check inside Valorant. Use deliberate small-target clicking for final corrections, controlled transitions for target switching and native practice for movement, firing and abilities. Free online options exist, including 3D Aim Trainer, but no trainer score guarantees rank gains or replaces game-specific decisions.",
    facts: [
      "A trainer can repeat a narrow aiming task while omitting essential match decisions.",
      "3D Aim Trainer's publisher describes free browser Quick Play; check the actual entry flow for current options.",
      "Aimlabs publishes Valorant-focused training material, but publisher marketing is not independent proof of guaranteed improvement.",
      "Match physical turning distance and understand field-of-view conventions before comparing settings across applications.",
      "Validate transfer with an unpaid native-game drill rather than treating an external score as a rank prediction.",
    ],
    sections: [
      [
        "Start with the miss you can describe",
        `Before choosing an application, describe a recurring mistake in one sentence. Examples include clicking before the final correction finishes, losing the target during a short transition, or arriving at the right point while still moving. Each suggests a different drill. A general complaint such as bad aim is too broad to decide what should be repeated.

Review a small number of ordinary encounters if a supported replay or recording is available. Separate target selection from pointer control. If you aimed at the wrong angle, an isolated dot-clicking task may not address the decision. If your first placement was sensible but the final correction repeatedly passed the target, a controlled small-target task is more relevant.

Keep the observation concrete and modest. You do not need a fabricated coach rank or a professional screenshot to notice that clicks happen early. Write the expected improvement before practicing: fewer premature clicks at the same comfortable pace, for example. That expectation gives the next session a purpose and makes it easier to reject a task that produces a higher score without fixing the error.

The best trainer for this purpose is the one that lets you repeat the relevant movement with stable settings and interpretable feedback. A large task library is useful only if you can select an appropriate task. Browsing new scenarios every day can feel productive while preventing a consistent comparison. Choose a small set and keep the practice question unchanged long enough to evaluate it.`,
      ],
      [
        "Choose the task before the brand",
        `| Observed problem | Trainer task to try | Native-game check |
| --- | --- | --- |
| Final correction overshoots | Small stationary targets with deliberate settling | First-shot placement at a fixed range |
| Clicking begins before arrival | Controlled click timing with accuracy emphasized | Whether the first shot waits for alignment |
| Short transitions become uncontrolled | Moderate target switching with a clean stop | Transfer between two known target positions |
| Moving target is repeatedly lost | Smooth tracking at a manageable speed | Following movement while preserving a firing decision |
| Shots occur before movement settles | Trainer alone is insufficient | Native movement-and-shot timing exercise |

These are editorial drill choices, not a validated promise that one task repairs every cause of a miss. A player can make the same visible error for different reasons. Use the task as a hypothesis, then check the matching behavior in Valorant. If the error changes only inside the trainer, the transfer question remains open.

Avoid training only the task whose scoreboard is easiest to improve. Large targets and repeated familiar paths can reward speed without demanding the final correction you wanted to practice. Make the target and distance appropriate to the error, and record the task configuration. A score without its settings is difficult to interpret across sessions.

The [Valorant 1v1 guide](/guides/valorant-1v1) covers agreeing on a custom drill, while [CS2 versus Valorant](/guides/cs2-vs-valorant) separates the games' demands. This article owns external aim-trainer selection and transfer checks. It does not duplicate native CS2 map recommendations or claim that one game's movement exercise reproduces another game's timing.`,
      ],
      [
        "Free online and installed options: compare the workflow",
        `| Environment | Useful reason to choose it | Limitation to keep visible | Verification step |
| --- | --- | --- | --- |
| Valorant's native practice environment | Actual game input, weapons and movement | May be less convenient for a narrow repeated external task | Check the current client and available practice controls |
| 3D Aim Trainer browser entry | Quick access to published free practice | Browser performance and task configuration remain variables | Use the publisher's own Quick Play path |
| Installed trainer such as Aimlabs | Publisher-supported training workflows and stored tasks | Installation and optional feature boundaries require checking | Read the current official product and training pages |
| A simple two-dimensional pointer drill | Easy observation of arrival and click timing | Cursor movement differs from three-dimensional camera aiming | Keep viewport and input mode fixed |

3D Aim Trainer's official FAQ describes its platform as free and points users to Quick Play. Its publisher also discusses account-based progress features. That supports a free-entry statement, not a claim that every present or future feature is identical across browser, launcher and installed versions. Check the current interface before building a routine around one feature.

Aimlabs publishes Valorant-focused material and an official product page. Use those primary sources to confirm the available workflow, rather than relying on an old video for menu names or a paid-feature boundary. This guide does not invent current subscription prices, claim every feature is free or endorse marketing promises of guaranteed rank improvement.

When using a shared computer or managed network, obtain the owner's permission before installing or accessing a trainer. A browser option is convenient access, not a way around restrictions. Use official publisher entry points and avoid clones requesting game credentials. A standalone aiming drill does not need a promise to unlock your account or repair a competitive rank.`,
      ],
      [
        "Calibrate enough to make the drill meaningful",
        `Keep the same active mouse DPI in both environments. Then establish the trainer's supported sensitivity convention rather than copying a number blindly. Games translate mouse counts into camera rotation through different scales. A profile labeled for the destination game can be helpful, but verify physical turning distance in the actual version you use.

Choose a recognizable landmark and measure the comfortable mouse movement for a known camera turn. Repeat in the trainer and the native game with unchanged DPI. Do several passes rather than trusting one rough sweep. If the values differ, investigate the selected game profile, sensitivity scale and any rounding before blaming your hand for an unfamiliar feeling.

Field of view affects how movement looks on the screen. A trainer and a game can describe field of view using different conventions, including horizontal or vertical values and aspect-ratio assumptions. Equal-looking numbers therefore need not create an equal view. Use the trainer's own documentation and game profile, then inspect the result rather than inventing a conversion formula.

Zoomed aiming is another separate condition. Matching an unscoped physical turn does not automatically reproduce every scoped visual behavior. Begin with one clearly defined state and add another only when the practice goal requires it. An eDPI product has a limited scope; it is not a universal converter between every trainer and shooter.`,
      ],
      [
        "A compact routine with a transfer check",
        `- Choose one observed error and write the behavior you want to improve.
- Confirm mouse profile, physical turn distance and the trainer's game settings.
- Spend a short unscored block becoming comfortable with the chosen task.
- Complete a fixed block of deliberate repetitions, recording accuracy and the actual error.
- Rest briefly, then repeat the same task at a comfortable controlled pace.
- Open native practice and test the matching behavior with a fixed weapon and setup.
- End with one note about transfer rather than adding more tasks to chase a score.

An example routine might use three minutes of familiarization, two four-minute focused blocks separated by a rest, and five minutes of native verification. Those durations are an editorial scheduling example, not an optimal dose established by research. Shorten the routine if concentration fades. More minutes are not automatically more useful when errors become careless.

In the first focused block, prioritize arriving cleanly before clicking. In the second, retain that instruction while allowing a comfortable pace. Do not simultaneously shrink targets, accelerate movement and raise sensitivity. A stable task makes it possible to see whether the intended control changed. If you change task difficulty later, record the new baseline rather than comparing raw scores across versions.

For native verification, remove unrelated complexity only as far as the practice controls permit. Fix the weapon, starting position and intended target behavior. Observe whether the final correction or timing error appears less often. Then return to ordinary play as a separate test of decisions. A controlled native drill is closer to the game, but it still does not reproduce every team interaction.`,
      ],
      [
        "Read improvement without fooling yourself",
        `A trainer score can rise because you learned the target layout, selected an easier condition or changed your risk tolerance. Keep the task version and settings in your notes. Compare equally prepared sessions and retain the ordinary attempts rather than only personal bests. A record score is encouraging, but it is not a complete description of repeatable control.

Use both an outcome and an observation. The outcome might be accuracy or task time; the observation might be whether you repeatedly click during an unfinished correction. If the score improves but the error remains, the task may be rewarding another behavior. Modify the instruction or choose a more relevant scenario rather than declaring the original issue solved.

Do not use a short ranked-match streak as proof of training efficacy. Opponents, teammates, maps, role and ordinary variation affect results. A clearer early signal is a recurring mechanical behavior improving in matched practice. Later match review can ask whether that behavior persists under decisions and pressure, without assigning the trainer a fabricated win-rate contribution.

When progress stalls, check the task before adding volume. It may be too easy, too difficult or simply unrelated to the real problem. Make one change and preserve the rest. A useful training log describes what changed and why. It does not need an invented scientific label or a promise that everyone improves on the same schedule.`,
      ],
      [
        "What transfers to CS2, and what must be relearned",
        `General control habits can be relevant across shooters: noticing a target, making a deliberate correction, avoiding unnecessary movement and clicking after alignment. That does not make the games mechanically equivalent. Native weapon behavior, movement accuracy, recoil, utility and tactical information shape how an aiming movement is used. Verify those demands in the destination rather than carrying a trainer instruction over unchanged.

If you move from Valorant practice to CS2, first establish a comfortable physical turn scale. Then practice native stopping and firing behavior instead of assuming the same key timing. A good-looking external flick cannot show whether your first shot occurred under the destination game's intended accuracy conditions. Keep the task narrow enough to identify the mismatch.

The [CS2 aim training guide](/guides/cs2-aim-training) owns that native framework. This page does not rank CS2 Workshop maps or recommend copying another player's settings. It explains why an external drill is a supplement. The [FPS and aim topic](/guides/topics/fps-and-aim) can help you choose a separate guide once the actual transfer problem is clear.

Abilities and team decisions also deserve their own practice. A target-switching scenario does not teach when to use utility, how to read a teammate's information or whether an engagement is worth taking. If your review repeatedly identifies those errors, spending all available practice time on isolated aim may be a poor allocation even while the trainer score rises.`,
      ],
      [
        "Keep the routine sustainable and the software ordinary",
        `Choose a setup you can start consistently without a long optimization ritual. Save the task configuration and keep a short record of the drill, settings and observation. That reduces the temptation to spend every session searching for the perfect playlist. A repeatable modest routine is easier to evaluate than a different ambitious routine each day.

Treat discomfort, loss of concentration or increasing grip tension as reasons to pause. This is practice, not a test of how long you can force repetitions. Do not chase a record at the cost of a relaxed controllable movement. If ordinary adjustments do not resolve persistent discomfort, the practice plan should not ask you to push through it.

Use standalone trainer features and supported game settings. Avoid software that automates shots, reads hidden game information or promises live decision assistance. Riot's third-party application policy makes integrity a relevant boundary. A trainer used separately is a different workflow from a tool operating inside a live match, and a publisher's training branding does not approve unrelated add-ons.

Browser convenience can be useful, but background tabs, focus and performance should remain consistent when comparing runs. If one session is visibly stuttering, record it as an invalid comparison rather than treating the score as evidence of lost skill. Resume under the baseline conditions and preserve the distinction between a technical interruption and a training outcome.`,
      ],
      [
        "Separate practice from cash-entry decisions",
        `For [browser FPS options](/guides/browser-fps-games), distinguish training from independent games. [PvPStrike](/fps-1v1) is a separate CS-style browser shooter, not Valorant or Valve CS2. Local practice is first to seven against a bot; cash series are best of five or nine. Server validation of inputs, hits and results does not promise cheating immunity; see [fairness](/fairness).

Cash play is 18+ where permitted. The published minimum is $1, but consult actual lobby entries. The fee is 5% of the combined pot. Hypothetical USD example: $1 each yields $1.90 winner credit and $0.90 net after the winner's entry. Hypothetical USD example: $5 each yields $9.50 credit and $4.50 net. A loss costs the entry; credit and withdrawal are separate.

Read the [FPS money hub](/guides/fps-for-money-hub), [CS2 cash-duel distinction](/guides/cs2-1v1-for-money) and [crypto FPS guide](/guides/crypto-fps-game) for that boundary. An external trainer score is neither an eligibility check nor a promise of earnings.`,
      ],
    ],
    faqs: [
      {
        q: "What is the best Valorant aim trainer?",
        a: "Choose by the error you need to isolate, stable settings and a practical native-game transfer check. Native practice, 3D Aim Trainer and installed options such as Aimlabs serve different workflows. This guide does not claim a universal winner or rely on invented hands-on scores, professional rank or guaranteed improvement.",
      },
      {
        q: "Is 3D Aim Trainer free?",
        a: "Its official FAQ describes free use and browser Quick Play. Confirm the current entry flow and any account or optional-feature distinctions on the publisher's site. Free access does not prove every feature is identical across versions, nor does it independently validate the publisher's claims about how much your aim will improve.",
      },
      {
        q: "Can I use an aim trainer online without installing anything?",
        a: "The reviewed 3D Aim Trainer publisher pages provide a browser entry. Use an authorized device and network and keep browser conditions consistent when comparing sessions. Browser access does not bypass installation or network rules, and a page claiming to be a trainer should not receive unrelated game-account credentials.",
      },
      {
        q: "Will Valorant training transfer to CS2?",
        a: "Some deliberate correction and target-acquisition habits can be relevant, but sensitivity scales, movement, firing and tactical systems differ. Verify physical turn distance, then test native behavior in CS2. A higher external score does not establish that weapon timing, recoil control or match decisions transferred automatically.",
      },
      {
        q: "Should I copy my Valorant sensitivity number into a trainer?",
        a: "Only when the trainer explicitly supports that game's scale, and even then verify the result. Keep mouse DPI fixed, compare physical turns and understand field-of-view conventions. Equal numbers across different scales do not establish equal movement, and matching unscoped behavior does not automatically reproduce every zoom state.",
      },
      {
        q: "Can an aim trainer predict rank or cash-match wins?",
        a: "No. A narrow task omits opponent decisions, team context and many native mechanics. Use its feedback to investigate a specific control habit, then verify that habit in unpaid practice. Do not convert a trainer score into a professional percentile, a win probability or an expected income figure.",
      },
    ],
    sources: [
      {
        label: "3D Aim Trainer: official free-entry and platform FAQ",
        url: "https://www.3daimtrainer.com/faq/",
      },
      { label: "3D Aim Trainer: official browser entry", url: "https://www.3daimtrainer.com/" },
      { label: "Aimlabs: official training product information", url: "https://www.aimlabs.com/" },
      {
        label: "Aimlabs: publisher's Valorant practice guidance",
        url: "https://www.aimlabs.com/articles/valorant/how-to-start-valorant-aim-training-like-the-pros/",
      },
      {
        label: "Riot Games: third-party application policy",
        url: "https://support.riotgames.com/en-us/riot/events/third-party-applications",
      },
    ],
    related: ["valorant-1v1", "cs2-vs-valorant", "edpi-calculator", "cs2-aim-training"],
  }),
];
