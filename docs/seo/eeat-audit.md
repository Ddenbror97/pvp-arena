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
| Guides with no source list | 241 | 241 | 241 |
| Guides with no named human author | 966 | 966 | 966 |
| Thin guides under 1,850 words | 0 | 0 | 0 |
| Duplicate primary keywords | 0 | 0 | 0 |
| Indexable pages missing a canonical | 10 | 0 | 0 |
| Metadata problems on indexable templates | 3 | 0 | 0 |
| Structured data errors fixed | 2 | 0 | 0 |
| Technical indexing errors | 1 | 0 | 1 flagged |

Counts are from the guide registry, route heads, and a full-text scan. "Unsupported or stale product claims" is the 63 guide files that described three or four games, a retired wheel, or said this site does not offer poker. Unrelated uses of "four games" (a series score, a dealer career) were left in place. A second scan of `src/content/guides` no longer finds "does not offer poker", "PVPspinArena is not a poker room", or "four games" outside those unrelated sentences.

Remaining trust gaps are facts the repository does not contain: a legal entity name, registration number, address, and gambling licence. Remaining author gap: no verified person to name. The 404 `noindex` tag is in the React tree; a crawler that ignores hoisted body meta could still index a soft 404. That is flagged, not treated as a route-head change.

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
- 241 guides cite no external source. Many are product comparisons that correctly leave cells as "not published". Adding sources requires checking each claim.
- Do not merge or noindex guides. No two guides share a primary keyword. Overlap across poker explainers is topical, not a duplicate URL.

## E. Diagnostic scores (0–100)

These scores judge the public site after this change. They are not a ranking forecast.

| Area | Score | Evidence |
|---|---:|---|
| Experience | 62 | Game pages now explain entry, winner, fee, and payout from the live rules. Guides still do not claim first-hand testing. |
| Expertise | 70 | Fees, wheel math, and commit-reveal match the code and terms. No named specialist. |
| Authoritativeness | 48 | No licence, registration, or independent audit is published, and none was invented. |
| Trustworthiness | 74 | Contact, terms, privacy, responsible gambling, fairness, and an honest editorial policy are linked. Open gaps are the missing legal identity. |
| Content quality | 76 | 966 guides pass the length and metadata checker. Stale "no poker" lines were corrected. Outside-product cells still say "not published". |
| Technical SEO | 84 | Canonical host, sitemap coverage, and robots exclusions match the route list. Per-URL live fetches were not repeated for every guide. |
| Internal linking | 78 | Lobbies link to rules, fairness, and a relevant guide. Footer includes fairness. Guide-to-guide links were already required by the checker. |
| Overall readiness | 71 | Safe corrections are in. Legal identity and a real author remain owner decisions. |

## F. Untouched systems

No game settlement, RNG, fairness math, wallet, deposit, withdrawal, ledger, migration, secret, or production deploy was changed.
