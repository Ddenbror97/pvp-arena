# E-E-A-T and technical SEO audit

Audit date: 20 October 2026. Canonical host: https://pvpspinarena.com/. This is an internal diagnostic. It is not a Google score and it does not predict rankings.

Machine-readable URL inventory: `docs/seo/eeat-inventory.json`.

## A. Coverage

| Item | Count |
|---|---:|
| Published guides audited | 966 |
| Published topic hubs | 20 |
| Indexable static pages | 14 |
| Indexable URLs (static + guides + topics) | 1,000 |
| Game lobbies audited | 5 (Jackpot, Coinflip, Roulette, Slott, Poker) |
| Trust and legal pages audited | 7 (About, How it works, Terms, Privacy, Responsible gambling, Fairness, Editorial) |
| Intentionally excluded route patterns | 17 |

Guide HTTP status was verified from the shared SSR template and the guide checker, not by fetching all 966 URLs. Private and per-round routes stay `noindex` and out of the sitemap.

## B. Findings

| Category | Before | After | Remaining |
|---|---:|---:|---:|
| Missing essential trust information | 4 | 2 | 2 |
| Unsupported or stale product claims | 63 | 0 | 0 |
| Guides with no source list | 241 | 224 | 224 documented |
| Guides with no named human author | 966 | 966 | 966 |
| Thin guides under 1,850 words | 0 | 0 | 0 |
| Duplicate primary keywords | 0 | 0 | 0 |
| Indexable pages missing a canonical | 10 | 0 | 0 |
| Metadata problems on indexable templates | 3 | 0 | 0 |
| Structured data errors fixed | 2 | 0 | 0 |
| Technical indexing errors | 1 | 0 | 0 |

Counts are from the guide registry, route heads, and a full-text scan. The first pass fixed 63 guide files that described three or four games, a retired wheel, or said this site does not offer poker. A later pass fixed 104 more files whose "live games" list still omitted six-max poker. Unrelated uses of "four games" (a series score, a dealer career) were left in place. The library no longer says this site is not a Hold'em client.

Remaining trust gaps are facts the repository does not contain: a legal entity name, registration number, address, and gambling licence. Remaining author gap: no verified person to name. Unknown URLs return HTTP 404 and a server `noindex` from the root head. TanStack marks that case `globalNotFound` on the root match, with status `success`, so the head checks `globalNotFound` rather than `status === "notFound"`.

## C. What changed

- Public game lobbies now render the fee, winner rule, and fairness limit in server HTML.
- Indexable pages that lacked a canonical now point at `https://pvpspinarena.com`.
- `public/llms.txt` matches the five live games, the 33-slot wheel, and all 20 topic hubs.
- Terms and responsible gambling include poker and the 5% post-flop fee.
- `/editorial` states that no person is named, dates are the stored update, and corrections go to contact@pvpspinarena.com.
- Footer links Fairness and the editorial policy. Sitemap includes `/editorial` and `/leaderboards`.
- Guides that denied poker, or counted four games, now name six-max No-Limit Hold'em and the post-flop fee.
- Homepage JSON-LD is Organization, WebSite, and WebPage. No rating, review, or search action.

## D. Manual decisions

- Publish a legal name, address, and licence only after they are verified.
- Name an editor only when a real person agrees to the byline. Do not invent one.
- Jurisdiction list and disconnect rules for an unfinished poker hand, beyond the reveal-timeout void already in How it works, need an operator decision.
- 224 of the original 241 sourceless guides still have an empty source list. The per-guide reason is in `docs/seo/source-review.json`: 4 pages refuse to invent a statute, and 220 leave outside figures unpublished or explain a rule without a third-party number. Do not add a generic homepage to those pages.
- Do not merge or noindex guides. No two guides share a primary keyword. Overlap across poker explainers is topical, not a duplicate URL.

## E. Diagnostic scores (0–100)

These scores judge the public site after this change. They are not a ranking forecast.

| Area | Score | Evidence |
|---|---:|---|
| Experience | 62 | Game pages now explain entry, winner, fee, and payout from the live rules. Guides still do not claim first-hand testing. |
| Expertise | 70 | Fees, wheel math, and commit-reveal match the code and terms. No named specialist. |
| Authoritativeness | 48 | No licence, registration, or independent audit is published, and none was invented. |
| Trustworthiness | 74 | Contact, terms, privacy, responsible gambling, fairness, and an honest editorial policy are linked. Open gaps are the missing legal identity. |
| Content quality | 82 | 966 guides pass the length and metadata checker. Live-game lists include poker. Outside-product cells still say "not published". |
| Technical SEO | 90 | Canonical host, sitemap, robots, and a server `noindex` on unknown URLs. Representative templates were rendered and checked. |
| Internal linking | 80 | No broken guide or topic links. No guide is unlinked from the other guides. Lobbies link to rules and fairness. |
| Overall readiness | 76 | Safe corrections are in. Legal identity and a real author remain owner decisions. |

## F. Untouched systems

No game settlement, RNG, fairness math, wallet, deposit, withdrawal, ledger, migration, secret, or production deploy was changed.

## G. Final verification, 20 October 2026

This pass reviewed the 241 guides that had an empty `sources` array. Each record in `docs/seo/source-review.json` quotes that guide's opening and says why a source was added or withheld. Seventeen guides now cite a page that was fetched and matched the claim: MetaMask Help Center getting started (checked 20 October 2026), the MetaMask private-key export article, ethereum.org wallets, EIP-20, TRON TRC-20, the Bitcoin Developer Guide block chain page, and eCOGRA. Four legal pages still refuse to print a statute number: Kentucky, South Carolina, the Lonestar name, and VPN use. The other 220 do not state an outside fee, licence, or return that a new URL would verify. A marketing homepage was not added to those pages.

The same pass corrected catalog sentences that listed Jackpot, Coinflip, Roulette, and P2P Slott as the whole live set. Those sentences now include six-max poker. MetaMask pages that said the app was Ethereum-only now follow the 20 October 2026 getting-started page: Ethereum, Solana, and Bitcoin are named, and Litecoin and Cardano are not.

Guide markup uses `dateModified` only. There is no first-published field, so none was invented. All 966 guides have an ISO update date.

Internal links: 0 broken `/guides` or `/guides/topics` targets, 0 guides with no inbound link from another guide, 20 published topic hubs, and no cluster under the three-guide minimum. Guides also link to `/wallet` (117), `/prestige` (4), and `/profile` (3). Those routes are `noindex` on purpose. The links are cashier and account navigation, not sitemap entries.

Checked on the Vite dev server, which server-renders the current source:

| Route | Result |
|---|---|
| `/`, `/coinflip`, `/roulette`, `/slott`, `/poker` | 200, canonical on `https://pvpspinarena.com`, `index, follow`, crawlable fee text |
| `/fairness`, `/about`, `/how-it-works`, `/terms`, `/privacy`, `/responsible-gambling`, `/editorial`, `/leaderboards`, `/guides` | 200, canonical, `index, follow` |
| `/guides/what-is-metamask`, `/guides/topics/poker` | 200, canonical, `dateModified` present, `datePublished` absent, author is the organization |
| `/this-page-does-not-exist-seo`, unknown guide, unknown topic | HTTP 404, title "Page not found", `<meta name="robots" content="noindex">` in `<head>` |
| `/auth`, `/wallet` | `noindex, nofollow` |
| `/robots.txt` | Allow all, sitemap `https://pvpspinarena.com/sitemap.xml` |
| `/sitemap.xml` | 1,000 URLs: 14 static, 966 guides, 20 topics. No wallet, auth, admin, profile, or prestige URL |

`vite preview` could not boot this build: it looks for `dist/server/server.js`, and the Cloudflare Nitro output is `.output/server`. That is an environment preview gap, not a missing head tag. The production `vite build` completed. www and https redirects are edge configuration and were not changed.

Checks: `bun scripts/check-guides.ts` passed all 966. `npx vitest run tests/seo-public.test.ts` passed 8. `npx tsc --noEmit` passed. ESLint passed on the files this pass edited. `npx eslint .` still reports a large pre-existing Prettier backlog, including `src/routes/privacy.tsx`, and that backlog was left alone. `npx vite build` succeeded.

## H. Owner decisions still required

- Legal entity, registered address, company number, jurisdiction, and gambling licence. None of these are in the repository. They were not invented.
- A named human author, credentials, personal testing, or an independent audit. None is on file. The editorial page says so.
- Whether guides should stop linking to the noindex wallet, profile, and prestige screens. Those links are how a reader opens the cashier. They were left in place.
