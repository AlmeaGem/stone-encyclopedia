import { readFile, mkdir, rm, writeFile, access } from 'node:fs/promises';
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

async function prepareChapterThreeCover(root: string) {
  const coverDir = join(root, 'public/special-stones');
  const cover = await readFile(join(coverDir, '03_chapter_cover.svg'), 'utf8');
  const specimens = [
    {
      path: 's209/4b13f1c25a481d98e03d0e439a8b48bfb39641d7fadaba84c53879faf7fa587b.webp',
      x: 383,
      y: 655,
      size: 320,
      name: 'GOLD RUTILE',
    },
    {
      path: 's051/0dd18cfdf1a1602a01edf2444b53a70210af41b6ebe2adb62f2c66ae53f32ba4.webp',
      x: 126,
      y: 835,
      size: 245,
      name: 'IMPERIAL TOPAZ',
    },
    {
      path: 's047/3b952d10bca735f5bf0818962df1790df1c9c40b10179e080d752258e391fd34.webp',
      x: 715,
      y: 835,
      size: 245,
      name: 'SUNSTONE',
    },
  ];
  const frames = await Promise.all(
    specimens.map(async ({ path, x, y, size, name }, index) => {
      const thumb = await sharp(join(root, 'public/images', path))
        .resize(360, 360, { fit: 'contain', background: '#fffaf5' })
        .flatten({ background: '#fffaf5' })
        .jpeg({ quality: 87 })
        .toBuffer();
      const center = x + size / 2;
      const radius = size / 2;
      return `<g><circle cx="${center}" cy="${y + radius}" r="${radius + 5}" fill="#fffaf5" stroke="#bba087" stroke-width="1.5"/><clipPath id="gem${index}"><circle cx="${center}" cy="${y + radius}" r="${radius}"/></clipPath><image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/jpeg;base64,${thumb.toString('base64')}" clip-path="url(#gem${index})"/><text x="${center}" y="${y + size + 31}" fill="#705343" text-anchor="middle" font-family="Georgia,serif" font-size="17" letter-spacing="2">${name}</text></g>`;
    }),
  );
  const motif =
    /<g fill="none" stroke="#baa083">[\s\S]*?<g transform="translate\(543 842\)"[\s\S]*?<\/g>/;
  if (!motif.test(cover)) throw Error('Chapter III cover template has changed');
  const illustrated = cover
    .replace(motif, () => frames.join(''))
    .replace(
      '金の糸をモチーフにした第三章の表紙。',
      '三つの天然石のイメージ画像を使用した第三章の表紙。',
    );
  await writeFile(join(coverDir, '03_chapter_silky.svg'), illustrated);
}

async function prepareRutileIllustrations(root: string) {
  const directory = join(root, 'public/special-stones');
  const names = [
    'platinum-rutile',
    'black-rutile',
    'red-rutile',
    'taichin-rutile',
  ];
  for (const name of names) {
    await sharp(join(directory, name + '.png'))
      .resize(960, 960, { fit: 'contain', background: '#fffaf5' })
      .webp({ quality: 87 })
      .toFile(join(directory, name + '.webp'));
  }
}

async function prepareChapterFourCover(root: string) {
  const directory = join(root, 'public/special-stones');
  const template = await readFile(
    join(directory, '04_chapter_rose.svg'),
    'utf8',
  );
  const spinel = join(directory, 'pink-spinel.png');
  const hasSpinel = await access(spinel).then(
    () => true,
    () => false,
  );
  const specimens = [
    {
      path: join(
        root,
        'public/images/s205/eeae1b3a2dfb7e0ab3c1ee14b2498a5516278f3175e1227976f99c5115246dee.webp',
      ),
      x: hasSpinel ? 126 : 154,
      y: hasSpinel ? 814 : 691,
      size: hasSpinel ? 248 : 365,
      name: 'RUBELLITE',
    },
    {
      path: join(
        root,
        'public/images/s207/8770880a9aa2aee00cb92e282099abcf90e134bba0d6ea3c3d3f399349384cf7.webp',
      ),
      x: hasSpinel ? 712 : 567,
      y: hasSpinel ? 814 : 691,
      size: hasSpinel ? 248 : 365,
      name: 'PINK SAPPHIRE',
    },
  ];
  if (hasSpinel) {
    specimens.unshift({
      path: spinel,
      x: 358,
      y: 646,
      size: 370,
      name: 'PINK SPINEL',
    });
  }
  const frames = await Promise.all(
    specimens.map(async ({ path, x, y, size, name }, i) => {
      const thumb = await sharp(path)
        .resize(400, 400, { fit: 'contain', background: '#fff8f6' })
        .flatten({ background: '#fff8f6' })
        .jpeg({ quality: 88 })
        .toBuffer();
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size / 2;
      return `<g><circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="#fff8f6" stroke="#b68b9a" stroke-width="2"/><clipPath id="roseGem${i}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/jpeg;base64,${thumb.toString('base64')}" clip-path="url(#roseGem${i})"/><text x="${cx}" y="${y + size + 31}" fill="#795662" text-anchor="middle" font-family="Georgia,serif" font-size="18" letter-spacing="2">${name}</text></g>`;
    }),
  );
  const motif = /<!-- GEM_ART_START -->[\s\S]*?<!-- GEM_ART_END -->/;
  if (!motif.test(template)) throw Error('Chapter IV cover template changed');
  await writeFile(
    join(directory, '04_chapter_love.svg'),
    template.replace(motif, () => frames.join('')),
  );
}

async function prepareChapterFiveCover(root: string) {
  const directory = join(root, 'public/special-stones');
  const template = await readFile(
    join(directory, '05_chapter_lavender.svg'),
    'utf8',
  );
  const herkimer = join(directory, 'herkimer-diamond.png');
  const hasHerkimer = await access(herkimer).then(
    () => true,
    () => false,
  );
  const specimens = [
    {
      path: join(
        root,
        'public/images/s178/cfe12d8f64ad989027df415d8f4c66e8785411266682e4c293bc146fac3560eb.webp',
      ),
      x: hasHerkimer ? 126 : 154,
      y: hasHerkimer ? 814 : 691,
      size: hasHerkimer ? 248 : 365,
      name: 'PHENAKITE',
    },
    {
      path: join(
        root,
        'public/images/s138/c25deadb0a8baf40c79c8c047d8cb18a7856bceeee48eba3ebe56f71a6ee9b92.webp',
      ),
      x: hasHerkimer ? 712 : 567,
      y: hasHerkimer ? 814 : 691,
      size: hasHerkimer ? 248 : 365,
      name: 'AMETRINE',
    },
  ];
  if (hasHerkimer) {
    specimens.unshift({
      path: herkimer,
      x: 358,
      y: 646,
      size: 370,
      name: 'HERKIMER DIAMOND',
    });
  }
  const frames = await Promise.all(
    specimens.map(async ({ path, x, y, size, name }, i) => {
      const thumb = await sharp(path)
        .resize(400, 400, { fit: 'contain', background: '#fffcfa' })
        .flatten({ background: '#fffcfa' })
        .jpeg({ quality: 88 })
        .toBuffer();
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size / 2;
      return `<g><circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="#fffcfa" stroke="#b5a0c8" stroke-width="2"/><clipPath id="miracleGem${i}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/jpeg;base64,${thumb.toString('base64')}" clip-path="url(#miracleGem${i})"/><text x="${cx}" y="${y + size + 31}" fill="#6c587f" text-anchor="middle" font-family="Georgia,serif" font-size="18" letter-spacing="2">${name}</text></g>`;
    }),
  );
  const motif = /<!-- GEM_ART_START -->[\s\S]*?<!-- GEM_ART_END -->/;
  if (!motif.test(template)) throw Error('Chapter V cover template changed');
  await writeFile(
    join(directory, '05_chapter_miracle.svg'),
    template.replace(motif, () => frames.join('')),
  );
}

async function prepareChapterSixCover(root: string) {
  const directory = join(root, 'public/special-stones');
  const template = await readFile(
    join(directory, '06_chapter_pearl.svg'),
    'utf8',
  );
  const diamond = join(directory, 'black-diamond.png');
  const hasDiamond = await access(diamond).then(
    () => true,
    () => false,
  );
  const specimens = [
    {
      path: join(
        root,
        'public/images/s019/90f9676b098d3d493967a55bf601baa25854fae651f21dc3562cb21b25bb9f28.webp',
      ),
      x: hasDiamond ? 126 : 154,
      y: hasDiamond ? 814 : 691,
      size: hasDiamond ? 248 : 365,
      name: 'MORION',
    },
    {
      path: join(
        root,
        'public/images/s001/799ff7ede196fc6470cfe997d7c37efbd61b4310a2a2dcdeab50e311e32abaa7.webp',
      ),
      x: hasDiamond ? 712 : 567,
      y: hasDiamond ? 814 : 691,
      size: hasDiamond ? 248 : 365,
      name: 'OBSIDIAN',
    },
  ];
  if (hasDiamond) {
    specimens.unshift({
      path: diamond,
      x: 358,
      y: 646,
      size: 370,
      name: 'BLACK DIAMOND',
    });
  }
  const frames = await Promise.all(
    specimens.map(async ({ path, x, y, size, name }, i) => {
      const thumb = await sharp(path)
        .resize(400, 400, { fit: 'contain', background: '#fffcfa' })
        .flatten({ background: '#fffcfa' })
        .jpeg({ quality: 88 })
        .toBuffer();
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size / 2;
      return `<g><circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="#fffcfa" stroke="#a4a0ad" stroke-width="2"/><clipPath id="protectionGem${i}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/jpeg;base64,${thumb.toString('base64')}" clip-path="url(#protectionGem${i})"/><text x="${cx}" y="${y + size + 31}" fill="#595562" text-anchor="middle" font-family="Georgia,serif" font-size="18" letter-spacing="2">${name}</text></g>`;
    }),
  );
  const motif = /<!-- GEM_ART_START -->[\s\S]*?<!-- GEM_ART_END -->/;
  if (!motif.test(template)) throw Error('Chapter VI cover template changed');
  await writeFile(
    join(directory, '06_chapter_protection.svg'),
    template.replace(motif, () => frames.join('')),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const count = await prepareImages(root);
  await prepareChapterTwoCover(root);
  await prepareChapterThreeCover(root);
  await prepareRutileIllustrations(root);
  await prepareChapterFourCover(root);
  await prepareChapterFiveCover(root);
  await prepareChapterSixCover(root);
  console.log(
    `Prepared ${count} approved images and illustrated chapter covers`,
  );
}
