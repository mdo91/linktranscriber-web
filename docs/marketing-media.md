# Damas feature-rollout media

The November 17 landing page uses adult professionals and mature university learners in the onboarding's textured plum, lavender, cream and peach pencil style. The three new illustrations were generated with the built-in image generation tool. They use the onboarding planning artwork only as a texture/palette reference; the younger character design was replaced at the owner's request.

The final prompt set uses a shared brief: new standalone editorial scene; clearly mature adult, realistic adult proportions and normal-size eyes; confident imperfect plum pencil outlines, lavender textured fills, cream paper and restrained peach details; transparent background, landscape 3:2 composition and clear margins; no written text, logo, watermark or fabricated app UI. Subjects:

- `connections`: woman around 32 in a rolled-sleeve lavender shirt at a worktable, arranging a central note connected to four idea cards.
- `tailored`: professional woman around 35 with glasses and a lavender blouse, annotating cards representing topic, audience and language.
- `ready`: professional man around 35 with light beard and lavender overshirt, closing a notebook beside a phone with bell/checkmark and two small allowance-token stacks.

Original PNGs are retained locally in ignored `.marketing/illustrations/`. Deployed AVIF/WebP derivatives live at `public/assets/illustration-{connections,tailored,ready}-{480,720,960}.{avif,webp}`. Their genuine transparency is preserved. Earlier, younger-looking generated variants are not used by the website. Existing artwork and media-kit download URLs remain unchanged.

## Actual app screens

The six new screens are real Damas SwiftUI simulator captures, in English with original offline sample content, **Make room for focused work**. They show the transcript, a short Standard summary, a four-node editable map, checked action items, an answered quiz with explanation and a revealed flashcard. They are examples, not evidence of a live backend generation or real customer's data. No online processing, account sign-in or purchase was used.

The isolated capture build uses bundle `com.damas.ai.recording.storecapture`, Xcode 27, iPhone 18 Pro / iOS 27, light appearance and 9:41. Normal app launch and existing Docker-based test fixtures are unchanged. `-ui-testing -ui-test-screen recordingDetails -website-capture -website-scene <scene>` selects the DEBUG-only sample fixture; scenes are `transcript`, `summary`, `mind-map`, `checklist`, `quiz`, `flashcards`. The map uses the real native zoom setting at 65% so every branch fits. The checklist has two checked actions; the quiz and flashcard use native persisted response states. Capture provenance is stored beside this document. The app support patch is retained locally in ignored `.marketing/website-capture-support.patch`; app source is not published with website media.

The versioned `scripts/capture-website.py` requires `DAMAS_CAPTURE_DEVICE` and `DAMAS_CAPTURE_IOS_APP`; `DAMAS_CAPTURE_OUTPUT_DIR` optionally changes its ignored output directory. Use a dedicated simulator with no account and the isolated app build.

Use per-command `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`; the machine-wide selected toolchain need not change. Build with signing disabled and the isolated capture bundle. Use `xcrun simctl io <dedicated-simulator> screenshot <scene>.png` after launching the selected fixture and waiting for the production view to finish rendering. Avoid persistent-library and real-insight launch modes.

## Responsive derivatives

With three illustration PNGs named `connections.png`, `tailored.png`, `ready.png` and the six verified capture PNGs, run:

```sh
node scripts/prepare-marketing-media.mjs --art-dir /absolute/illustrations --capture-dir /absolute/captures
```

The script validates capture dimensions and illustration alpha, produces responsive AVIF and WebP, and records sizes/hashes in `docs/marketing-media.json`. Screens keep their full 1206×2622 composition. HTML reserves their aspect ratios, uses responsive sources and lazy-loads below-fold media. The hero illustration has high fetch priority. The former preview video is no longer loaded by the landing page; its original URL remains available in the media kit.


## November 20 iPad showcase update

The landing page now displays five landscape iPad screenshots from the [November 19 capture set](https://github.com/mdo91/voicey/tree/main/docs/screenshots/insight-studio/2026-11-19): short summary, mind map in Outline view, action items, quiz feedback and a revealed flashcard. These are real generated staging results from Damas V3 Staging 1.6.1 (133) on an iPad Pro 11-inch (M4). They are examples of visible output, not a claim of App Store production verification. Longer results continue beyond the captured viewport. Outline view is used for legibility.

One original iPhone transcript screenshot remains in the planning section to demonstrate iPhone support. It retains the original offline sample content described above; it is a separate example from the iPad product-market fit talk.

The source images are resized without cropping, retouching or fabricated UI. Tablet frames are CSS, leaving native screenshots intact. Responsive AVIF/WebP files at 800 and 1440 pixels, dimensions, source filenames and hashes are recorded in `ipad-showcase.json`. Regenerate with `node scripts/prepare-ipad-showcase.mjs /absolute/path/to/2026-11-19`. Existing asset URLs and guide images remain available.

All eleven homepages retain server-rendered captions, localized example notes, descriptive device-specific alt text, intrinsic dimensions and lazy loading. MobileApplication structured data lists the five iPad screenshots. Canonicals, hreflang and published guide routes are preserved.

## Study Guide evidence for the English lecture guide

The English lecture study-guide article also uses the genuine `06-Study-guide.png` from the same November 19 capture set. Its [pinned first-party source](https://github.com/mdo91/voicey/blob/c36abfa4984cf02c60d8bf9f3a0edf29f20c0311/docs/screenshots/insight-studio/2026-11-19/06-Study-guide.png) was verified against Git blob `9697f821284454c097243903f1c8dc5656c96df4` and SHA-256 `464576bd56135b0432b4ad2466090aa3f67bba785a846ff72a274e6e0eb56c26` before resizing. The original is 2420×1668 pixels. It shows **Learning Guide: The Lean Product Process**, learning objectives, key explanations, **AI generated**, **Source excerpt**, **Edit**, and the **Transcript / Outputs** tabs. It does not show the creation sheet.

`public/assets/insight-studio-ipad-study-guide-1440.webp` is a complete, uncropped 1440×993 WebP derivative, 117,420 bytes, SHA-256 `8e7860ede37c803fee0942b9551d7b7280c3efb0085dd450f6c3e339f0aabb91`. Only proportional resizing and WebP encoding were applied; no content, controls or results were added or retouched. The source image remains in task-local evidence storage. To reproduce from the verified PNG with the repository's Sharp version, use `sharp(input).resize({width:1440}).webp({quality:85,effort:5})`.

The staging device/build and date are the same as the five homepage iPad captures above. The pictured product-market fit talk is separate from the article's explicitly fictional workshop example. Longer output continues below the captured viewport; neither this capture nor the retained iPhone sample establishes production device parity. The machine-readable source, derivative integrity and visible-label evidence live in `src/content/product-facts.json` under `insightStudio.screenshots.studyGuide`. Existing homepage image pairs, original media-kit downloads and all localized guide identities remain unchanged.

## Topic-specific guide library

`src/content/guide-media.json` catalogs all nine authentic screenshots from the [November 19 source set at its pinned commit](https://github.com/mdo91/voicey/tree/524377c9eb9509437f8fdbb86ebf159f3147edd8/docs/screenshots/insight-studio/2026-11-19). Each entry records the original filename, Git blob and SHA-256, the complete 1440×993 WebP derivative's integrity and size, the visible task, and its limitations. The six existing short-summary, Outline mind-map, checklist, study-guide, quiz and flashcard derivatives keep their exact bytes. The added detailed-summary, diagram mind-map and step-by-step derivatives use the same proportional resize and WebP settings. None is cropped, retouched or given fabricated controls. The original **AI generated** labels and source controls remain visible.

These are English-interface, dark-appearance outputs on a physical iPad Pro 11-inch (M4), iPadOS 27.2.1, **Damas V3 Staging 1.6.1 (133)**. They show Dan Olsen's product-market fit talk and remain separate from a guide's own worked example. They do not verify the App Store build, every generated fact, or equivalent iPhone/Mac controls. Long outputs extend below the captured viewport. Prefer the readable Outline image when explaining a map's hierarchy; the diagram capture intentionally shows only the visible upper branches at minimum zoom. The detailed summary visibly retains raw source-reference markers, which must not be called verified citations. The quiz shows one correctly answered question and **1 / 5**, rather than a completed quiz or an exam grade.

Choose a catalog image that explains the guide's specific output or next step. Use its local `/assets/` path, descriptive localized alt text and a localized Markdown image title. The title is rendered as a visible caption and must retain the exact language-specific staging/English-interface notice from `source.notices`, followed by the useful description. For example:

```md
![The first quiz question answered on iPad, with its explanation](/assets/insight-studio-ipad-quiz-1440.webp "iPad staging example; English interface. One answered question with feedback; this is a separate example from the guide.")
```

The first reviewed image in the article body also supplies its BlogPosting, Open Graph and Twitter image. Reference-style Markdown works the same way. Captions are escaped text; unknown or external image URLs are rejected. The article no longer inserts a generic iPhone transcript sidebar based on an English slug. An older guide without a relevant inline image remains text-only and has a text social card. Existing content, URLs, publication dates and homepage media are preserved.

Fetch originals through the authorized private source repository into a local evidence directory using their pinned Git blob IDs. Do not publish temporary authenticated download URLs, source credentials or the original private repository's images as hotlinks. With the nine verified PNGs, reproduce/check the derivatives from the website checkout:

```sh
node scripts/prepare-guide-media.mjs --check /absolute/path/to/2026-11-19
node scripts/prepare-guide-media.mjs /absolute/path/to/2026-11-19
```

The first command validates every original blob/SHA-256 and reproduces all nine derivative hashes without writing. The second only writes missing derivatives after the entire set passes; it never replaces a modified file. The source images are needed only for this trusted maintenance step. Scheduled guide writing reads the bounded catalog and protected local derivatives without source-repository credentials.
