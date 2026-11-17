# Damas feature-rollout media

The November 17 landing page uses adult professionals and mature university learners in the onboarding's textured plum, lavender, cream and peach pencil style. The three new illustrations were generated with the built-in image generation tool. They use the onboarding planning artwork only as a texture/palette reference; the younger character design was replaced at the owner's request.

The final prompt set uses a shared brief: new standalone editorial scene; clearly mature adult, realistic adult proportions and normal-size eyes; confident imperfect plum pencil outlines, lavender textured fills, cream paper and restrained peach details; transparent background, landscape 3:2 composition and clear margins; no written text, logo, watermark or fabricated app UI. Subjects:

- `connections`: woman around 32 in a rolled-sleeve lavender shirt at a worktable, arranging a central note connected to four idea cards.
- `tailored`: professional woman around 35 with glasses and a lavender blouse, annotating cards representing topic, audience and language.
- `ready`: professional man around 35 with light beard and lavender overshirt, closing a notebook beside a phone with bell/checkmark and two small allowance-token stacks.

Original PNGs are retained locally in ignored `.marketing/illustrations/`. Deployed AVIF/WebP derivatives live at `public/assets/illustration-{connections,tailored,ready}-{480,960}.{avif,webp}`. Their genuine transparency is preserved. Earlier, younger-looking generated variants are not used by the website. Existing artwork and media-kit download URLs remain unchanged.

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
