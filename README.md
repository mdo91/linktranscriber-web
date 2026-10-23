# Damas website

Static, multilingual website for **Damas - Video Link Transcriber**, published at [linktranscriber.com](https://linktranscriber.com). It contains the app landing page, a downloadable media kit, guides, and the existing legal/support URLs. The site has no analytics or transcription backend. Video processing takes place in the iPhone app.

## Develop and verify

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
BASE_PATH=/linktranscriber-web/ npm run build
npm run preview
```

Vite publishes generated HTML from `.generated/`; source pages are rendered by `scripts/generate.ts` and `src/render.ts`. Generated HTML, build output and private research are ignored. Important content, navigation, native language switching and guides work without JavaScript. Display WebP images are optimized; original PNG/MP4 downloads remain in `public/assets/`.

English uses `/`; the other languages use `/fr/`, `/de/`, `/ja/`, `/ko/`, `/ms/`, `/pt/`, `/ru/`, `/zh-hans/`, `/es/`, and `/tr/`. Each locale includes a landing page, guide index, media kit, three initial guides, privacy policy, terms, and support. Equivalent published pages receive reciprocal `hreflang`. The canonical origin remains production for both supported deployment bases.

## Content

Guides live in `content/guides/<locale>/<slug>.md`. Frontmatter requires `title`, `description`, `slug`, `locale`, `publishedAt`, `updatedAt`, `status`, `primaryQuery`, `topics`, `sources`, `related` and `translationKey`. Dates use `YYYY-MM-DD`. Drafts never appear in HTML or the sitemap. Do not advance dates unless the content meaningfully changes. Equivalent translations share a `translationKey`, but only published equivalents appear as alternates. Current product facts are documented in the growth skill and must be rechecked against Apple before changing claims.

The 33 launch guides were refined against live Keyword Planner data for all 11 languages. See [research methodology](docs/keyword-methodology.md). Private caches retain authentic estimates and unavailable values; they are never committed.

## SEO and deployment

`.github/workflows/pages.yml` runs TypeScript, tests, HTML publication validation, and root/repository-path production builds before Pages deployment. The required check is **Validate website**. Validation covers metadata, canonical/alternate URLs, sitemap dates, structured data, local resources, article sources, download destinations and missing artifacts. GitHub Pages serves `404.html` with a genuine 404 for unknown paths; verify this after publishing.

The authentic Search Console verification tag is committed permanently in `src/content/site-verification.json`; keep it after ownership verification.

Optional repository variables:
- `APP_STORE_PROVIDER_TOKEN`: an authentic provider token for this app, if obtained from App Store Connect. Without it, links remain ordinary App Store links and download attribution is unavailable.
- `WEBSITE_BASE_PATH`: `/linktranscriber-web/` only during project-path staging; `/` after attaching the custom domain. This affects asset/navigation paths, never production canonical URLs.

All language directories belong to the new Search Console URL-prefix property `https://linktranscriber.com/`, covered by DNS ownership of `linktranscriber.com`. The original `https://damascenerose.com/` property was verified on 2026-10-20 and processed its 99-URL launch sitemap; retain it for migration history. Keep the verification metadata permanently. Sitemap processing and missing Search Console performance data do not establish whether individual pages are indexed.

## Organic growth

Call **`$organic-growth`** in Codex while this repository is open. The self-contained instructions are in `.agents/skills/organic-growth/SKILL.md`, and non-secret project settings are in `growth.config.json`.

```sh
npm run growth:keywords -- --plan
npm run growth:keywords
npm run growth:collect
```

The audited Gum build is reproducible with `bash scripts/gum/build-keyword-gum.sh` (Go required). The project MCP entry uses the read-only `damas-searchconsole` profile. Keyword collection uses the separate `damas-keywords` profile and only the two permitted keyword-planning operations. See the skill for exact scopes, targeting, caching and provisioning. Keep `.growth`, OAuth secrets and tokens private; do not commit any credentials.

The private [Damas growth runner](https://github.com/mdo91/damas-growth-runner) schedules the daily workflow at 08:00 Europe/Istanbul. It uses the owner's selected **Codex subscription** with an isolated session provisioned once, refreshed and persisted in the cloud, shared subscription limits, and no separate OpenAI API key. Daily runs require no interactive login or Mac availability. Expired or revoked authorization requires owner action. Signature Scan's runner and profiles are independent.

Activation was verified on **2026-10-20**: the hosted trial published and verified the [Spanish guide update](https://github.com/mdo91/damascene-rose-web/pull/4), native Gum research succeeded across all 11 languages, and the separate encrypted Google and Codex state completed cloud round trips. Bootstrap flags are disabled and the two initial seed secrets have been removed. A follow-up run confirmed that a completed day starts no further generation or publication. Daily recurrence is enabled, with recovery checks at 08:17 and 08:37 Istanbul; GitHub may delay scheduled starts.

## Domain migration and rollback

This repository succeeds `mdo91/damascene-rose-web` and uses `https://linktranscriber.com/` as its canonical origin. Preserve every existing language, guide and legal path. Production uses `WEBSITE_BASE_PATH=/`; project-path checks use `/linktranscriber-web/`.

The legacy domain is forwarded through Squarespace using permanent, SSL-enabled, path-preserving redirects after the new deployment is verified. Preserve DNS ownership records for both domains. Keep the original repository and deployment commit for rollback; historical PR and activation links above intentionally refer to that repository.

To roll back a failed cutover, pause the runner, restore the saved old-domain DNS and Pages configuration, and verify HTTPS, representative pages and a genuine 404 before resuming publication. Never attach one custom domain to two repositories.

Favicons are derived from the existing app icon with `node scripts/icons.mjs`: a 96px PNG, a 180px Apple touch icon, and an ICO containing 16/32/48px images. All generated pages declare stable base-aware icon URLs.
