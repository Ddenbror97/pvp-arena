# Browser configuration incident — 2026-11-03

The browser assets were built without the production `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The app Worker still had its correct server-side bindings, so SSR returned HTTP 200 and asset hashes matched the build. Browser startup then failed when the auth provider initialized Supabase, showing the root error boundary.

Recovery: rebuild using `node --env-file=.env.fps-production node_modules/vite/bin/vite.js build` and redeploy only the app with the existing production-generated config. The FPS Worker, database and financial flags were unchanged. The FPS fixes remain included. Production app recovery version: `4efd7699-b4b8-4498-a1ca-0c7150869229`.

Prevention:

- Vite refuses a build missing either required browser variable.
- Both release-config scripts inspect the actual browser JavaScript for the intended Supabase URL and public key, and reject privileged credential leakage. Worker runtime variables do not substitute for a configured browser build.
- Verify a hydrated homepage and game lobby in a browser after deployment; HTTP status and byte-hash checks alone cannot validate client startup.

Validation: six guard tests cover missing browser configuration, incorrect target, server-only configuration, secret public-key input and credential leakage. An unconfigured `npm run build` is explicitly verified to fail before asset generation. The configured recovery output passes the release guard. The homepage renders the jackpot and sign-in UI, the PvPStrike lobby renders Practice/open games, and Bomb Defusal renders its signed-out entry page. The first homepage visit also reports a recoverable React hydration warning; it does not reproduce the Supabase startup crash, and it is not claimed resolved by this configuration repair.
