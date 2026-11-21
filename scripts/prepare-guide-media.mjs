import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), check = args.includes('--check');
const inputs = args.filter(value => value !== '--check');
if (inputs.length !== 1 || !isAbsolute(inputs[0])) throw new Error('Pass the absolute directory containing the pinned original November 19 PNGs; optionally use --check.');
const root = fileURLToPath(new URL('../', import.meta.url));
const catalogBytes = await readFile(new URL('../src/content/guide-media.json', import.meta.url));
if (catalogBytes.length > 24000) throw new Error('Guide media catalog exceeds its boundary');
const catalog = JSON.parse(catalogBytes);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const prepared = [];
for (const asset of catalog.assets) {
  if (!/^[a-z0-9-]+$/.test(asset.id) || !/^\d\d[b]?-[-A-Za-z]+\.png$/.test(asset.sourceFile) || !/^\/assets\/[a-z0-9-]+\.webp$/.test(asset.file)) throw new Error('Unsafe guide media record');
  const input = resolve(inputs[0], asset.sourceFile), stat = await lstat(input);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 10 * 1024 * 1024) throw new Error(`${asset.sourceFile}: unsafe original`);
  const original = await readFile(input);
  const blob = createHash('sha1').update(Buffer.from(`blob ${original.length}\0`)).update(original).digest('hex');
  if (blob !== asset.sourceBlob || digest(original) !== asset.sourceSha256) throw new Error(`${asset.sourceFile}: original differs from the pinned source`);
  const dimensions = await sharp(original).metadata();
  if (dimensions.width !== 2420 || dimensions.height !== 1668 || dimensions.format !== 'png') throw new Error(`${asset.sourceFile}: unexpected native capture dimensions`);
  // Preserve the complete screenshot, including source labels and system UI.
  const output = await sharp(original).resize({ width: 1440 }).webp({ quality: 85, effort: 5 }).toBuffer();
  const meta = await sharp(output).metadata();
  if (meta.width !== asset.width || meta.height !== asset.height || output.length !== asset.bytes || digest(output) !== asset.sha256) throw new Error(`${asset.id}: output differs from the reviewed derivative`);
  const target = resolve(root, 'public' + asset.file);
  const current = await readFile(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (current && digest(current) !== asset.sha256) throw new Error(`${asset.id}: existing asset changed; review it before replacing`);
  if (check && !current) throw new Error(`${asset.id}: reviewed asset is missing`);
  prepared.push({ target, output, present: !!current });
}
// Validate the whole set before writing any missing file. Existing six outputs
// retain exactly their original bytes; this importer adds no crop or retouch.
if (!check) for (const item of prepared) if (!item.present) await writeFile(item.target, item.output, { flag: 'wx' });
console.log(`${check ? 'Verified' : 'Prepared'} ${prepared.length} source-pinned full-frame guide screenshots.`);
