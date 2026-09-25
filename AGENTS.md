<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Roulette lifecycle timing is driven by the one-second `pvp-roulette-worker`; browser tick calls are recovery hints only, so anonymous traffic cannot stall rounds.
- SEO guides are typed content objects in `src/content/guides/` rendered by `/guides/$slug`; a guide is published only by adding it to `GUIDES` after `bun scripts/check-guides.ts` passes (1,850–2,500 words, meta lengths, links), so unreleased guides never 404 from links.
- Guide clusters get topic pages at `/guides/topics/$topic` only when they have 3+ guides (`MIN_TOPIC_GUIDES`), so thin hub pages are never published.
