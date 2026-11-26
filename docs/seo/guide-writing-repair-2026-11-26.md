# Guide writing repair — 26 November 2026

This pass screened all 1,030 published guides for repeated body copy, search-query narration, unsupported specificity, and irrelevant product detours. It edited the affected guides rather than using an AI-detector score as a publishing criterion.

| Screening signal | Before | After |
| --- | ---: | ---: |
| Identical paragraphs on four or more guides | 104 guides | 0 |
| Eight-word shingle overlap, Jaccard at least 0.25 | 98 guide pairs | 0 |
| Search-query narration | 78 guides | 1 |
| No listed sources | 55 guides | 0 |
| Only Wikipedia or Britannica sources | 126 guides | 0 |
| Formulaic-transition regex | 7 guides | 4 |

The one remaining search-language flag is in a PUBG access guide, where the sentence explains that “unblocked” does not name an official edition. Four transition matches occur in otherwise substantive passages. The remaining refusal and editorial-meta flags require reading in context: several correctly delimit unverified live prices, game versions, network access, or allegations. They are not evidence of a Google penalty.

Specific corrections include Sweet Bonanza's anywhere-pays rule, the first-touchdown scorer settlement examples, jurisdiction-specific lottery and gambling guidance, removal of the repeated pool support paragraph, and a sourced account of the Garrett Adelstein investigation that distinguishes an unresolved allegation from a finding.

The guide checker no longer requires arbitrary quotas of prose links to guides, topic hubs and site products. The rendered breadcrumb, topic hub and related guides provide navigation. All prose links and related destinations still undergo validation.

Verification: `npm run check:guides`, the guide-hub audit, relevant guide/SEO tests, TypeScript, lint and production build. The screening was automated and sampled manually; it does not certify every external claim or measure GPTZero predictions or Google rankings. Sources should be revisited whenever prices, rules, legal status or game releases change.
