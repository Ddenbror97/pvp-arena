# Faster page switching and less layout jumping (performance pass)

This is an optimization-only pass. Game logic, fairness, balances, ledger, workers, wallet/MetaMask, sign-in, chat moderation/security and the database stay unchanged. Your message was cut off at section 27 (React rendering). The plan covers sections 1–27. Send the rest and I'll add it.

## What exists today (from a first look)
- Pages: `/` (Jackpot), `/coinflip`, `/coinflip/$gameId`, `/games/$gameId`, `/fairness`, `/auth`, `/terms`, `/privacy`, `/responsible-gambling`, plus signed-in `/profile`, `/wallet`, `/admin`. There is no `/imoveis` page and no HadoSEO integration in this project, so those parts don't apply.
- The router already splits each page's UI into its own file automatically. The Jackpot page and the Coinflip list page already load chat separately with `lazy()`.
- The chat moderation rules are imported only by server-only code (`chat.server.ts`). Step 1 will confirm they never reach the browser.
- MetaMask/viem code is used only by the wallet card and should appear only on the profile/wallet pages. The build audit will confirm this.
- The project uses Unbounded, Manrope and JetBrains Mono, not DM Sans. The current way fonts load stays as it is.

## Steps

1. **Measure first (production build).** Build the app, record every JS file's size (raw and gzip), and map which modules go into each file. Use Rollup's built-in output and a temporary script, with no new permanent dependency. In a headless browser against the production preview, record:
   - how many JS requests happen on first load, `/` to `/coinflip`, `/coinflip` to `/`, and when chat opens
   - CLS and LCP on `/` and `/coinflip`, with the element behind each layout shift
   - navigation timing
   
   The result is a short before table.
2. **Fix the problems the measurements find.** Expected candidates, each kept only if the numbers improve:
   - Code that should belong to one page but gets pulled into the shared startup file (the shared header/footer, sign-in context, profile setup dialog, sonner, the recharts chart helper, lucide icons, `/fairness` verifier code, viem/MetaMask).
   - Barrel-style imports that pull in extra modules.
   - Duplicate library copies (React, Supabase client, validation libraries).
   - Manual chunk rules only if the audit shows a real problem.
3. **Chat stays separate and never blocks the game.** Confirm that chat code, history and the live connection load after the game is usable on `/`, `/coinflip` and `/coinflip/$gameId`. Keep moderation server-only. Use a fixed-size placeholder so chat never pushes the game around:
   - desktop: fixed column width and height
   - mobile: known heights
   - online count: fixed width
4. **Smart prefetch.** Use the router's built-in hover/touch ("intent") preload on the header and bottom-tab links only. Turn it off for Save-Data or 2G/slow-3G connections. There is no preload-everything.
5. **Stable shell and no duplicate fetches.** Keep the header, tab bar, sign-in context, toasts and theme mounted across page changes. Remove duplicate profile/balance/game requests on navigation by reusing the existing query cache with sensible freshness times. Realtime updates still invalidate as they do now.
6. **Loading placeholders.** Give each page a lightweight skeleton that matches its real layout (wheel plus side columns, the Coinflip grid, the profile card) instead of a blank area.
7. **Fix layout jumping at the source.** Fix the shifts measured in step 1, such as:
   - avatars and fallback initials without fixed size
   - balance or online-count text changing width
   - the Coinflip grid resizing when chat arrives
   - the logo/OG images without dimensions
   - sign-in state swapping header buttons
   
   Use CSS only, with no JavaScript measuring. Leave the Coinflip coin and Jackpot wheel animations and their timing untouched.
8. **Re-measure and report.** Repeat the step 1 measurements and give you a before/after table. Run the existing tests plus a typecheck to confirm nothing changed in behavior. Check at 390px and 1440px that nothing overflows sideways.

## Technical details
- TanStack Start `autoCodeSplitting` is on. The work is limited to verifying it, keeping route components unexported, and moving heavy imports out of `__root.tsx` and shared components only when the measurements say so.
- Prefetch: set `defaultPreload: "intent"` on the router or on specific `Link`s, gated by `navigator.connection.saveData` / `effectiveType`.
- Query cache: set `staleTime` on the existing query options and use `ensureQueryData` where a loader already exists. No new state library.
- Chat skeleton: `GameChat`'s `Suspense` fallback uses the same outer size classes as the real panel.
- Deliverable: a performance report with before/after numbers, and the changed files limited to the ones behind the measured issues.
