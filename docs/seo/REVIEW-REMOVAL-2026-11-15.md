# Review catalogue cleanup — 15 November 2026

The owner requested deletion of about 80% of review pages, retaining a smaller source-based selection. Of 203 review articles (review slugs plus three review-titled articles), 163 are deleted and 40 retained. The exact selection is recorded in `review-removals-2026-11-15.json`.

The removed group includes the Bitz and Cryptorino identity stubs, unsupported operator and reward-app reviews, and repetitive public-checklist reviews. Deletion removes their source modules and catalogue registrations, contextual promotional sentences, related links, editorial groups, and future-content plan entries. The guide hub, topic pages, structured article lists and sitemap derive from the remaining catalogue. Empty editorial groups are removed. The asset emitter also removes obsolete generated JSON, so a previous build cannot keep serving the removed article body directly. The normal missing-guide handler returns 404; there is no noindex-only treatment or unrelated redirect.

The retained selection covers wallets, skill-tournament platforms, market structures, poker rooms and specific operator terms. Selection favours identifiable products, primary sources, useful explanations and candid limits on what was checked. A primary-source citation is not independent proof of operator reliability, eligibility or a successful payout. Older dated observations are not relabelled as current tests. “Last tested” wording is replaced with “Public sources read” where the work was a desk review. The source checks during this cleanup also corrected Sporttrade's relaunch presentation, Rainbow's desktop/product scope, an overbroad Exodus custody claim, and an expired Betr promotion.

## Indexing investigation

The supplied Search Console report was last updated on 8 November and lists 147 URLs with no last crawl. The live HTTP audit found all 147 returned 200, allowed indexing, had self-referencing canonicals and appeared in the sitemap. The guide pages were server-rendered and linked from the guide hub. Only Beam Boys lacked a contextual incoming article link; widespread orphaning was not established.

The connected Search Console planner supplies only 10–12 November performance data and no URL Inspection endpoint. Current indexing of the retained reviews is therefore **not confirmed**. Missing impressions over three days are not proof that a page is unindexed. The report does not establish a manual action, an AI-content penalty or the precise reason Google deferred crawling. See Google's [Page indexing report documentation](https://support.google.com/webmasters/answer/7440203?hl=en).

This cleanup addresses an observed editorial weakness and the owner's catalogue decision. It does not guarantee crawling, indexing or a ranking recovery. Existing non-review guides are not removed solely because they appear in the report, are short or lack citations. Other slot and legal-guide quality issues identified during the investigation remain separate editorial work; this release does not certify the entire catalogue.

## Validation and release scope

Run the guide publishing check, guide quality and retirement regression tests, typecheck, changed-file lint and a production build. Verify the generated hub/topic data contains only published links, retired article/body URLs return 404, retained pages return 200, and sitemap/structured data omit retired URLs.

Site only. No database migration, match Worker, secret, anti-cheat setting or game asset change.
