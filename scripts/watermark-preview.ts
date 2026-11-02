import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { candidateSchema } from '../src/lib/schema';
import { validateApproved } from './image-policy';
import { publicImage, sha256 } from './public-image';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export const samples: { stoneId: string; corner: Corner; color?: string }[] = [
  { stoneId: 's001', corner: 'bottom-left' },
  { stoneId: 's007', corner: 'bottom-right' },
  { stoneId: 's048', corner: 'bottom-left' },
  { stoneId: 's107', corner: 'bottom-right' },
  { stoneId: 's180', corner: 'top-left' },
  { stoneId: 's210', corner: 'bottom-right' },
];

export async function watermark(bytes: Buffer, corner: Corner, color?: string) {
  const { width, height } = await sharp(bytes).metadata();
  if (!width || !height) throw Error('画像サイズが不明です');
  if (color && !/^#[0-9a-f]{6}$/i.test(color))
    throw Error('色は#RRGGBB形式です');
  const size = Math.max(10, Math.round(Math.min(width, height) * 0.021));
  const inset = Math.round(size * 1.2);
  const right = corner.endsWith('right');
  const bottom = corner.startsWith('bottom');
  const x = right ? width - inset : inset;
  const y = bottom ? height - inset : inset + size;
  const patch = await sharp(bytes)
    .extract({
      left: right ? Math.max(0, width - size * 11) : 0,
      top: bottom ? Math.max(0, height - size * 3) : 0,
      width: Math.min(width, size * 11),
      height: Math.min(height, size * 3),
    })
    .stats();
  const light = patch.channels.slice(0, 3).reduce((n, c) => n + c.mean, 0) / 3;
  const fill = color || (light < 145 ? '#ffffff' : '#8b7562');
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${x}" y="${y}" text-anchor="${right ? 'end' : 'start'}" font-family="DejaVu Serif,serif" font-size="${size}" letter-spacing="1.5" fill="${fill}" opacity="0.74">ALMÉA GEM</text></svg>`,
  );
  // Lossless encoding changes only the composited pixels; no new color grading.
  const marked = await sharp(bytes)
    .composite([{ input: overlay }])
    .webp({ lossless: true })
    .toBuffer();
  return { bytes: marked, color: fill, corner };
}

export async function previewWatermarks(root: string) {
  const images = candidateSchema
    .array()
    .parse(
      JSON.parse(await readFile(join(root, 'src/content/images.json'), 'utf8')),
    );
  const output = join(root, 'docs/watermark-preview');
  const privateOutput = join(root, '.editor/watermark-preview');
  await mkdir(output, { recursive: true });
  await mkdir(privateOutput, { recursive: true });
  const manifest = [];
  // Deliberately limited to six. Never called by build or images:prepare.
  for (const sample of samples) {
    const image = validateApproved(
      images.find((i) => i.stoneId === sample.stoneId),
    );
    const source = await readFile(
      join(
        root,
        'assets/approved-images',
        image.localPath!.replace(/^\/images\//, ''),
      ),
    );
    if (sha256(source) !== image.sha256)
      throw Error('原本のSHA256が一致しません');
    const before = await publicImage(source);
    const after = await watermark(before.bytes, sample.corner, sample.color);
    await writeFile(
      join(privateOutput, `${sample.stoneId}-watermarked.webp`),
      after.bytes,
    );
    const left = await sharp(before.bytes)
      .resize(600, 600, { fit: 'contain', background: '#faf7f2' })
      .toBuffer();
    const right = await sharp(after.bytes)
      .resize(600, 600, { fit: 'contain', background: '#faf7f2' })
      .toBuffer();
    const heading = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="50"><rect width="1200" height="50" fill="#faf7f2"/><g fill="#625953" font-family="DejaVu Sans,sans-serif" font-size="17"><text x="20" y="32">${sample.stoneId} / BEFORE (public size)</text><text x="620" y="32">AFTER / WATERMARK PROTOTYPE</text></g></svg>`,
    );
    const comparison = await sharp({
      create: { width: 1200, height: 650, channels: 4, background: '#faf7f2' },
    })
      .composite([
        { input: heading, top: 0, left: 0 },
        { input: left, top: 50, left: 0 },
        { input: right, top: 50, left: 600 },
      ])
      .webp({ quality: 92 })
      .toBuffer();
    const file = `${sample.stoneId}-comparison.webp`;
    await writeFile(join(output, file), comparison);
    manifest.push({
      stoneId: sample.stoneId,
      sourceSha256: sha256(source),
      publicSha256: sha256(before.bytes),
      watermarkedSha256: sha256(after.bytes),
      comparisonSha256: sha256(comparison),
      width: before.width,
      height: before.height,
      corner: after.corner,
      color: after.color,
      file,
    });
  }
  await writeFile(
    join(output, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  return manifest.length;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    `Generated ${await previewWatermarks(fileURLToPath(new URL('../', import.meta.url)))} watermark comparisons; public images unchanged`,
  );
