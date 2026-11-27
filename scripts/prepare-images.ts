import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import sharp from 'sharp';
import { candidateSchema } from '../src/lib/schema';
import { validateApproved } from './image-policy';
import { publicImage, sha256 } from './public-image';
export async function prepareImages(root: string) {
  const images = z
    .array(candidateSchema)
    .parse(
      JSON.parse(await readFile(join(root, 'src/content/images.json'), 'utf8')),
    )
    .map(validateApproved);
  const output = join(root, 'public/images');
  const manifest = [];
  await rm(output, { recursive: true, force: true });
  for (const image of images) {
    const path = image.localPath!.replace(/^\/images\//, '');
    const to = join(output, path);
    await mkdir(join(to, '..'), { recursive: true });
    const source = await readFile(join(root, 'assets/approved-images', path));
    if (sha256(source) !== image.sha256)
      throw Error(`承認済み画像のSHA256不一致: ${image.stoneId}`);
    const optimized = await publicImage(source);
    await writeFile(to, optimized.bytes);
    manifest.push({
      stoneId: image.stoneId,
      localPath: image.localPath,
      sourceSha256: image.sha256,
      publicSha256: sha256(optimized.bytes),
      width: optimized.width,
      height: optimized.height,
    });
  }
  // Build-only provenance: never copied into public/ or dist/.
  await mkdir(join(root, '.astro'), { recursive: true });
  await writeFile(
    join(root, '.astro/public-images.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  return images.length;
}
async function prepareChapterTwoCover(root: string) {
  // Chapter II uses existing public illustrations, embedded at thumbnail resolution
  // so the SVG cover renders correctly in <img> without external image references.
  const coverDir = join(root, 'public/special-stones');
  let cover = await readFile(join(coverDir, '02_chapter_cover.svg'), 'utf8');
  const specimenPaths = [
    join(coverDir, 'gibeon.png'),
    join(
      root,
      'assets/approved-images/s104/e7bad8ebb98bad8af460ab6bd51c5d0d6044f2a072c8a4a1b8a9a35be15c7604.webp',
    ),
    join(coverDir, 'libyan-glass.png'),
  ];
  const thumbs = await Promise.all(
    specimenPaths.map((p) =>
      sharp(p)
        .resize(340, 340, { fit: 'contain', background: '#f8f4ef' })
        .flatten({ background: '#f8f4ef' })
        .jpeg({ quality: 85 })
        .toBuffer(),
    ),
  );
  const frames = [
    [140, 758, 250],
    [398, 650, 290],
    [696, 758, 250],
  ];
  const frameMarkup = frames
    .map(
      ([x, y, w], i) =>
        '<g><rect x="' +
        (x - 6) +
        '" y="' +
        (y - 6) +
        '" width="' +
        (w + 12) +
        '" height="' +
        (w + 12) +
        '" rx="18" fill="#cbb297"/><rect x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        w +
        '" height="' +
        w +
        '" rx="12" fill="#faf5ed"/><clipPath id="stoneClip' +
        i +
        '"><rect x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        w +
        '" height="' +
        w +
        '" rx="12"/></clipPath><image x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        w +
        '" height="' +
        w +
        '" href="data:image/jpeg;base64,' +
        thumbs[i].toString('base64') +
        '" clip-path="url(#stoneClip' +
        i +
        ')"/></g>',
    )
    .join('');
  const placeholder =
    /<g stroke="#e1c9a8" stroke-width="1\.5"><circle cx="270"[\s\S]*?<\/g>/;
  if (!placeholder.test(cover))
    throw Error('Chapter II cover template has changed');
  cover = cover.replace(placeholder, () => frameMarkup);
  cover = cover
    .replace(
      '軌道と三つの石を抽象的に表現。',
      '軌道と三つの石のイメージ画像を使用。',
    )
    .replace('x="270" y="1020"', 'x="265" y="1046"')
    .replace('x="543" y="946"', 'x="543" y="974"')
    .replace('x="816" y="1020"', 'x="821" y="1046"');
  await writeFile(join(coverDir, '02_chapter_starlight.svg'), cover);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const count = await prepareImages(root);
  await prepareChapterTwoCover(root);
  console.log(`Prepared ${count} approved images and chapter two cover`);
}
