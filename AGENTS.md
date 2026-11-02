## Repository workflow

- Install with `npm ci` using `package-lock.json`. Do not add a second package-manager lockfile.
- Preserve published Git history: do not force push or rewrite commits already pushed.

## Architecture rules

- Roulette lifecycle timing is driven by the one-second `pvp-roulette-worker`; browser tick calls are recovery hints only, so anonymous traffic cannot stall rounds.
- SEO guides are typed content objects in `src/content/guides/` rendered by `/guides/$slug`; a guide is published only by adding it to `GUIDES` after `npm run check:guides` passes (meta lengths, links, and no keyword-insertion skeleton or repeated boilerplate). Missing sources are a warning, not a reason to invent a citation. Length is not a quota, so unreleased guides never 404 from links.
- Guide clusters get topic pages at `/guides/topics/$topic` only when they have 3+ guides (`MIN_TOPIC_GUIDES`), so thin hub pages are never published.
