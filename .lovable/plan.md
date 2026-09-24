# Cold-start performance investigation (investigate only)

Goal: find, with evidence, exactly what slows the first visit to Jackpot, Coinflip, Roulette, Fairness and Sign in, especially on phones and slow connections. No app code changes. Result: a written report with findings and a ranked list of proposed fixes for you to approve.

## What will be measured

1. **Startup timeline per page.** The steps from opening the page to seeing the main content: page download, code discovery, code download, code start-up, sign-in check, data requests and first display. Each step gets its measured time.
2. **Code size per page.** Measured on the real finished build: total code, compressed size, number of files, largest files, what loads immediately versus later, and what is shared versus page-specific. This fills in the table from your brief.
3. **Largest code contributors.** Which libraries and our own files make up the first-load code, and whether each one is needed before the first screen appears (for example the MetaMask wallet code, the backend library, icons, notifications and the chat).
4. **Processor cost.** How long the phone spends starting up the code (long tasks, parsing, execution), comparing a normal phone speed with a 4x slower one.
5. **Network waterfall.** Every request in order, including requests that wait on other requests, fonts, logo, avatars and third-party scripts.
6. **Sign-in and data start-up.** When the sign-in check finishes, which data requests each page makes, whether any repeat, and how long they take.
7. **Jackpot and Coinflip in depth,** compared with Roulette, Fairness and Sign in.
8. **True first visit versus return visit,** and signed out versus signed in.
9. **Repeated work,** such as data fetched twice, repeated renders at start-up, and code loaded but not used.

## Test conditions

- The live site (pvpspinarena.com), plus a local run of the finished build when the live site doesn't have the latest changes.
- Desktop, phone, phone on 4G, and phone on slow 4G with a slower processor.
- Signed out and signed in. Signed-in runs use the existing test account; no new accounts are created.
- Several runs per case, reported as a range and not a single best result.

## Deliverable

A report saved to your files that follows the 14 sections in your brief's final report, including:

- tables of measured numbers
- the startup timeline per page
- an opportunities table (impact, risk, complexity, pages affected), with the evidence behind each entry
- a recommended order for the fixes
- estimated gains, clearly labelled as estimates
- a list of areas that must not be changed casually: game results, fairness, sign-in, live updates, balances, animations and page movement

## Limits

- No changes to the app. Only temporary measurement scripts outside the project.
- If a local run of the finished build still fails (as happened before), the live site becomes the main source and the report says so.

## Technical details

- Production build via `vite build`, with a temporary source-map build in /tmp to attribute bytes to modules. The project build config is not changed.
- Chunk graph taken from the build manifest and HTML modulepreload lists. Measurements: gzip and Brotli sizes, and immediate versus dynamic imports.
- Playwright with Chrome DevTools Protocol for network and CPU throttling and trace capture, using PerformanceObserver (FCP, LCP, CLS, long tasks) and Resource Timing.
- Checks auth `getSession` timing, Supabase REST/Realtime request order, React commit counts using the Profiler when feasible, and font/logo/avatar timing.
