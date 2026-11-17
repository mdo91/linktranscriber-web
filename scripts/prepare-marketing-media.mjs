import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Source PNGs are retained privately; only responsive derivatives are deployed.
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== '--art-dir' || args[2] !== '--capture-dir') throw new Error('Usage: node scripts/prepare-marketing-media.mjs --art-dir /absolute/art --capture-dir /absolute/captures');
const [artDirectory, captureDirectory] = [resolve(args[1]), resolve(args[3])];
const target = resolve('public/assets');
const assets = [];
await mkdir(target, { recursive: true });
for (const [kind, names, directory, widths] of [
  ['illustration', ['connections', 'tailored', 'ready'], artDirectory, [480, 720, 960]],
  ['screen', ['transcript', 'summary', 'mind-map', 'checklist', 'quiz', 'flashcards'], captureDirectory, [630, 960]],
]) {
  for (const name of names) {
    const source = join(directory, name + '.png');
    const metadata = await sharp(source).metadata();
    if (kind === 'illustration' && !metadata.hasAlpha) throw new Error(`${name}: illustration must retain transparency`);
    if (kind === 'screen' && (metadata.width !== 1206 || metadata.height !== 2622)) throw new Error(`${name}: expected verified iPhone capture dimensions`);
    for (const width of widths) for (const format of ['avif', 'webp']) {
      const filename = `${kind}-${name}-${width}.${format}`;
      const image = sharp(source).resize({ width, withoutEnlargement: true });
      const output = await (format === 'avif' ? image.avif({ quality: kind === 'screen' ? 75 : 65, effort: 5 }) : image.webp({ quality: kind === 'screen' ? 88 : 84, effort: 5 })).toBuffer();
      await writeFile(join(target, filename), output);
      const dimensions = await sharp(output).metadata();
      assets.push({ file: `public/assets/${filename}`, width: dimensions.width, height: dimensions.height, bytes: output.length, sha256: createHash('sha256').update(output).digest('hex') });
    }
  }
}
await mkdir('docs', { recursive: true });
await writeFile('docs/marketing-media.json', JSON.stringify({ generatedFor: '2026-11-17 feature rollout', source: 'Original adult editorial artwork and real Damas iPhone simulator screenshots with original sample content', assets }, null, 2) + '\n');
console.log(`Prepared ${assets.length} responsive assets; largest ${Math.max(...assets.map(a => a.bytes))} bytes.`);
