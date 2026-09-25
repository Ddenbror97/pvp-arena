# Homepage intro: logo reveal, then the gate opens onto Jackpot

## What the visitor sees (about 2.6 seconds)
1. **Black screen.** The PVPspinArena logo fades and scales in with a soft lime glow, and a thin light sweep passes across it (0–1.2s).
2. **Charge-up.** A lime line grows out from the logo's centre, across the full width (1.2–1.6s).
3. **Gate opens.** The screen splits along that line. The two halves, each carrying half the logo, slide apart top and bottom like a vault door, with a slight motion blur (1.6–2.4s).
4. **Jackpot is revealed** underneath, already live and loaded. The overlay removes itself and the site is fully usable.
- A small "Skip" button (bottom right) and a click anywhere end the intro immediately.

## When it shows
- **Once per browser session:** only on the first time someone lands on the homepage. It doesn't show when clicking back to Jackpot, using Back/Forward, or opening other pages first and then coming to Jackpot.
- It never shows for visitors who ask their device for reduced motion.
- A new visit (a new tab or browser session) shows it again, like Stake. If you'd rather it show only once ever per device, that's a one-word change.

## Won't affect
- Game logic, timing and loading: the Jackpot page loads behind the intro, so the wheel is ready when the gate opens.
- Search engines and page speed: the overlay is added only in the browser after the page loads, so Google still sees the Jackpot page and the layout doesn't jump.

## Technical notes
- New `src/components/IntroGate.tsx`, rendered only in `src/routes/index.tsx`, and mounted after the page loads in the browser (via `useEffect`) so the server-rendered page stays unchanged.
- Uses the `sessionStorage` key `pvp_intro_seen`, set when the intro starts.
- Also checks `performance.getEntriesByType("navigation")[0].type`. The intro plays only on a full page load ("navigate"/"reload") that starts at `/`, never on in-app navigation, since the component only mounts on first load.
- Uses the existing `arena-logo-v2` asset. The animation is CSS keyframes with transforms and opacity only, on the GPU, in a fixed `z-[100]` overlay with the `bg-background` and `primary` tokens.
- Page scroll is locked while the intro plays. Esc, a click or Skip dismisses it, and focus is returned afterwards.
- Checked afterwards with a Playwright frame capture at 0.5s, 1.4s, 2.0s and 2.8s, plus a second visit to confirm it doesn't repeat.
