import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const source = 'public/assets/damas-icon.png';
await sharp(source).resize(96, 96).png().toFile('public/favicon.png');
await sharp(source).resize(180, 180).png().toFile('public/apple-touch-icon.png');
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => sharp(source).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((bytes, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index]; header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(bytes.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += bytes.length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, ...images]));
