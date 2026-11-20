import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const source = process.argv[2];
if (!source) throw new Error('Pass the original 2026-11-19 Insight Studio screenshot directory');
const mapping = { summary: '01-Short-summary.png', 'mind-map': '03b-Mind-map-outline.png', checklist: '04-Action-items.png', quiz: '07-Quiz-feedback.png', flashcards: '08-Flashcards-answer.png' };
const assets = [];
for (const [name, file] of Object.entries(mapping)) {
  const input = await readFile(join(source, file));
  const meta = await sharp(input).metadata();
  if (meta.width !== 2420 || meta.height !== 1668) throw new Error(`${file}: unexpected capture dimensions`);
  for (const width of [800, 1440]) for (const format of ['avif', 'webp']) {
    const output = await sharp(input).resize({ width }).toFormat(format, { quality: format === 'avif' ? 65 : 85, effort: 5 }).toBuffer();
    const path = `public/assets/insight-studio-ipad-${name}-${width}.${format}`;
    await writeFile(path, output);
    const dimensions = await sharp(output).metadata();
    assets.push({ file: path, width: dimensions.width, height: dimensions.height, bytes: output.length, sha256: createHash('sha256').update(output).digest('hex'), source: file });
  }
}
await writeFile('docs/ipad-showcase.json', JSON.stringify({ source: 'https://github.com/mdo91/voicey/tree/main/docs/screenshots/insight-studio/2026-11-19', captured: '2026-11-19', device: 'iPad Pro 11-inch (M4)', environment: 'Damas V3 Staging 1.6.1 (133)', assets }, null, 2) + '\n');
