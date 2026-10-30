import { it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { prepareImages } from '../scripts/prepare-images';
import { licenseUrls } from '../scripts/image-policy';
it('publishes only currently approved image files and keeps removed originals out of the next build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'almea-images-output-'));
  try {
    await mkdir(join(root, 'assets/approved-images/s107'), { recursive: true });
    await mkdir(join(root, 'public/images/s107'), { recursive: true });
    await mkdir(join(root, 'src/content'), { recursive: true });
    const bytes = await sharp({
        create: { width: 30, height: 20, channels: 3, background: '#e2d0cf' },
      })
        .webp()
        .toBuffer(),
      hash = createHash('sha256').update(bytes).digest('hex');
    const original = join(root, 'assets/approved-images/s107', hash + '.webp');
    await writeFile(original, bytes);
    await writeFile(
      join(root, 'assets/approved-images/s107/previous-approved.webp'),
      'retained original fixture',
    );
    await writeFile(
      join(root, 'public/images/s107/previous-approved.webp'),
      'stale generated fixture',
    );
    const image = {
      id: 'fixture',
      stoneId: 's107',
      stoneName: 'ローズクォーツ',
      searchName: 'Rose Quartz',
      imageUrl: 'https://upload.wikimedia.org/fixture.png',
      pageUrl: 'https://commons.wikimedia.org/wiki/File:Fixture.png',
      photographer: 'Fixture author',
      provider: 'Wikimedia Commons',
      license: 'CC BY 4.0',
      licenseUrl: licenseUrls['CC BY 4.0'],
      commercial: true,
      derivatives: true,
      attribution: true,
      modified: true,
      status: 'approved',
      misidentificationNote: 'テスト専用',
      identityConfirmed: true,
      rightsConfirmed: true,
      reviewedAt: '2026-10-27',
      alt: 'テスト画像',
      localPath: `/images/s107/${hash}.webp`,
      width: 30,
      height: 20,
      sha256: hash,
    };
    await writeFile(
      join(root, 'src/content/images.json'),
      JSON.stringify([image]),
    );
    expect(await prepareImages(root)).toBe(1);
    expect(await readFile(root + '/public' + image.localPath)).toEqual(bytes);
    await expect(
      readFile(join(root, 'public/images/s107/previous-approved.webp')),
    ).rejects.toThrow();
    expect(
      await readFile(
        join(root, 'assets/approved-images/s107/previous-approved.webp'),
        'utf8',
      ),
    ).toBe('retained original fixture');
    await writeFile(join(root, 'src/content/images.json'), '[]');
    expect(await prepareImages(root)).toBe(0);
    await expect(
      readFile(root + '/public' + image.localPath),
    ).rejects.toThrow();
    expect(await readFile(original)).toEqual(bytes);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
