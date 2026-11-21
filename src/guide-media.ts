import { marked, type Tokens } from 'marked';
import media from './content/guide-media.json';
import product from './content/product-facts.json';

// Existing guide captures remain valid. New choices come from the separate,
// source-pinned catalog; the daily writer cannot add or change these files.
const { items, studyGuide, iphoneTranscript } = product.insightStudio.screenshots;
export const reviewedGuideScreenshots = new Map(
  [
    ...[...items, studyGuide, iphoneTranscript].map(({ file, width, height }) => ({ file: file.replace(/^public/, ''), width, height })),
    ...media.assets,
  ].map(({ file, width, height }) => [file, { width, height }]),
);

export function reviewedGuideImage(token: Tokens.Image) {
  const size = reviewedGuideScreenshots.get(token.href);
  if (!size) throw new Error('Guide images require a reviewed screenshot');
  if (!token.text.trim()) throw new Error('Guide images require descriptive alt text');
  return size;
}

export function guideImageReferences(body: string) {
  const images: { href: string; alt: string; title: string | null; width: number; height: number }[] = [];
  // The same Markdown parser resolves inline and reference-style images,
  // including images inside links, before either rendering or selecting social media.
  marked.walkTokens(marked.lexer(body), token => {
    if (token.type === 'image') {
      const image = token as Tokens.Image;
      images.push({ href: image.href, alt: image.text, title: image.title || null, ...reviewedGuideImage(image) });
    }
  });
  return images;
}
