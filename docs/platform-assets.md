# Official badges and platform marks

Retrieved November 17, 2026. `src/content/platform-assets.json` records each original file's source URL, archive member, SHA-256, intrinsic dimensions and SVG view box. Original source files retain their supplied bytes, colors, geometry and clear space; no logos or badge text were generated, traced or recolored.

## App Store

All eleven localized black download badges come from Apple's Marketing Tools endpoint, which redirects from `tools.applemediaservices.com` to `toolbox.marketingtools.apple.com`. The manifest records every locale mapping. `pt-br` matches the site's Brazilian wording, including “salvos” and “compartilhe.” The English SVG is byte-identical to the requested DailyTaskr reference.

Only the universal App Store badge is supplied; there is no separate Mac badge. Its original height is 40 pixels and widths vary by localization. Preserve the intrinsic ratio and follow [Apple's Marketing Resources and Identity Guidelines](https://developer.apple.com/app-store/marketing/guidelines/), including clear space, minimum size and unmodified artwork/border.

## Supported platforms

- **YouTube:** original red digital PNG from the archive linked by [YouTube's official icon resources](https://brand.youtube/youtube-icon/). The current archive supplies PNG, EPS and AI files, with no SVG. Its transparent padding is retained.
- **X:** original `logo-black.png` from [X's official brand toolkit](https://about.x.com/en/who-we-are/brand-toolkit). The supplied SVG is white, so the official black PNG is used on the light site surface.
- **Instagram:** original black glyph SVG from Meta's `IG_brand_asset_pack_2023.zip`, linked by the [current official Instagram brand overview](https://www.meta.com/brand/resources/instagram/instagram-brand/). The older `/icons` route was unavailable. The signed CDN URL is recorded; locate a fresh download through the overview if it expires.

These remain their owners' trademark assets, subject to the linked guidelines; no open-source license, partnership or endorsement is claimed. X/YouTube have `inlineSvg: null`. Instagram supplies its original SVG root markup for decorative inlining beside readable labels. All SVGs were checked for executable elements, event handlers and external resource references.

The served X and YouTube PNGs are 3× web derivatives fitted inside 72 × 72 pixels with Sharp, retaining proportions, transparent clear space and color. No crop or recoloring is applied. The manifest records served-file hashes and dimensions alongside `sourceFile`, `sourceSha256`, `sourceWidth` and `sourceHeight` for the unchanged official originals. Badges and the Instagram SVG remain unchanged.
