# Manual Damas guide publishing prompt

Publish one new how-to guide for **Damas - Video Link Transcriber** on [linktranscriber.com](https://linktranscriber.com/) through the [website repository](https://github.com/mdo91/linktranscriber-web). If I give you a topic, reader, or screenshot, use it to focus the guide. Otherwise, choose a useful question the existing guides have yet to answer. Write equivalent versions in all 11 supported site languages. The default deliverable is a ready-to-review pull request to `main`. Merge and verify the live deployment only if I explicitly request that scope.

## Choose a distinct reader question

1. Start from the latest `origin/main` in a clean checkout. Read the [repo instructions](../README.md), [organic-growth guidance](../.agents/skills/organic-growth/SKILL.md), and [product facts](product-facts.md). This is a manual guide request. Leave the scheduled runner, its configuration, and its private research alone.
2. Check the [live sitemap](https://linktranscriber.com/sitemap.xml) and the published files under `content/guides/`. Read the nearest guides in full and check open guide PRs for work already in progress. Choose a reader task with a distinct answer or exercise. Changing a title, a platform, or an example alone does not justify a new guide.
3. Use a natural question such as “How can I …?” or a clear “How to …” title, with an idiomatic equivalent in each language. Answer the question in the opening paragraph, show the verified steps in Damas, and give a worked example that helps readers apply them. Clearly identify fictional examples and any manual review steps.
4. Verify current product claims against the [App Store listing](https://apps.apple.com/us/app/damas-video-link-transcriber/id6766233794) and the [reviewed product facts](../src/content/product-facts.json). Use verified interface labels and explain relevant requirements, allowance costs, and limitations. Attribute the guide to Damas Technologies LLC. Report search demand only when there is relevant measured evidence.

## Write and localize

- Create one Markdown file per locale under `content/guides/<locale>/<slug>.md`. Cover English (`en`), French (`fr`), German (`de`), Japanese (`ja`), Korean (`ko`), Malay (`ms`), Portuguese (`pt`), Russian (`ru`), Simplified Chinese (`zh-hans`), Spanish (`es`), and Turkish (`tr`). Localize the full article, title, description, primary query, topics, image alt text and caption, and link text.
- Follow the current frontmatter schema. Include `title`, `description`, `slug`, `locale`, `publishedAt`, `updatedAt`, `status`, `primaryQuery`, `topics`, `sources`, `related`, and `translationKey`. Use one shared translation key and set `status: published` on complete versions. Use the intended publication date in Europe/Istanbul in `YYYY-MM-DD` format. Cite primary sources and link to relevant guides in the same language.
- Choose a screenshot that illustrates a step or output. Use the existing local derivative from the [reviewed media catalog](../src/content/guide-media.json), which includes the [November 19 Insight Studio captures](https://github.com/mdo91/voicey/tree/main/docs/screenshots/insight-studio/2026-11-19). Follow the [media instructions](marketing-media.md) for exact localized staging notices, captions, and provenance. Keep real captures distinct from worked examples.
- Consult Google Search Central for [helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [titles](https://developers.google.com/search/docs/appearance/title-link), [descriptions](https://developers.google.com/search/docs/appearance/snippet), [localized pages](https://developers.google.com/search/docs/specialty/international/localized-versions), and [image metadata](https://developers.google.com/search/docs/appearance/google-images). Write descriptive titles and unique summaries. Use the site generator for canonicals, reciprocal `hreflang`, guide index links, sitemap entries, and `BlogPosting` and social metadata.

## Validate and deliver

Run the repository checks with Node.js 24.

```sh
npm ci
npm run typecheck
npm test
BASE_PATH=/ npm run build
BASE_PATH=/linktranscriber-web/ npm run build
git diff --check
```

Inspect all 11 rendered pages for localized metadata, index links, self-canonicals, reciprocal language alternates, sitemap entries, and the correct image and alt text. Preview a representative page. Keep the diff to the new guide files unless I request another change.

Commit on a conventionally named branch, push it, and open a PR to `main`. Describe what makes the guide different from its closest neighbors. Wait for **Validate website** and resolve failures caused by the change. Include the PR, checks, and all 11 canonical guide links in the chat. Label the links as pending publication until GitHub Pages deploys the merged commit. If publication is in scope, verify that deployment and confirm that all 11 public URLs serve the guide and appear in the live sitemap.
