import { it, expect } from 'vitest';
import { mkdtemp, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { EditorStore } from '../scripts/admin-store';
import { PhotoMedia } from '../scripts/photo-media';
import { licenseUrls } from '../scripts/image-policy';
it('manual uploads preserve every supported license and provenance through approval and batch publication', async () => {
  const root = await mkdtemp(join(tmpdir(), 'almea-manual-'));
  try {
    await cp('src/content', join(root, 'src/content'), { recursive: true });
    await writeFile(join(root, 'src/content/images.json'), '[]\n');
    const store = new EditorStore(root),
      media = new PhotoMedia(store);
    const stones = await store.read('stones');
    const bytes = await sharp({
      create: { width: 64, height: 48, channels: 3, background: '#bca5ad' },
    })
      .png()
      .toBuffer();
    const data = 'data:image/png;base64,' + bytes.toString('base64');
    const licenses = [
      'CC0',
      'CC BY 2.0',
      'CC BY 2.5',
      'CC BY-SA 2.0',
      'CC BY-SA 2.5',
      'CC BY 3.0',
      'CC BY 4.0',
      'CC BY-SA 3.0',
      'CC BY-SA 4.0',
      'Own photo',
      'Commercial permission',
    ];
    for (const [index, license] of licenses.entries()) {
      const c = await media.upload({
        stoneId: stones[index].id,
        data,
        license,
        photographer: 'Test author',
        note:
          license === 'Commercial permission'
            ? 'PRIVATE PERMISSION RECORD: commercial display, resize and attribution agreed'
            : '',
        sourceUrl: license.startsWith('CC')
          ? 'https://commons.wikimedia.org/wiki/File:Manual_fixture.jpg'
          : '',
        originalImageUrl: 'https://upload.wikimedia.org/manual_fixture.png',
        creditText: 'Required test attribution',
      });
      expect(c.licenseUrl).toBe(licenseUrls[license]);
      expect(c.identityConfirmed).toBe(false);
      expect(c.rightsConfirmed).toBe(false);
      await store.approve(
        {
          ...c,
          alt: 'Synthetic test photo',
          identityConfirmed: true,
          rightsConfirmed: true,
        },
        fetch,
        true,
      );
    }
    expect(await store.read('images')).toEqual([]);
    expect(await store.applyApproved()).toEqual({ applied: licenses.length });
    const manifest = await store.read('images');
    expect(manifest.map((c: any) => c.license).sort()).toEqual(
      [...licenses].sort(),
    );
    for (const c of manifest) {
      expect(c.originalUrl).toBe(
        'https://upload.wikimedia.org/manual_fixture.png',
      );
      expect(c.creditText).toBe('Required test attribution');
      expect(c.photographer).toBe('Test author');
    }
    expect(JSON.stringify(manifest)).not.toContain('PRIVATE PERMISSION RECORD');
    await store.applyApproved();
    expect(await store.read('images')).toHaveLength(licenses.length);
    const candidate = (await store.candidates())[0];
    await expect(
      store.approve(
        {
          ...candidate,
          pageUrl: 'https://commons.wikimedia.org/wiki/File:Wrong.jpg',
        },
        fetch,
        true,
      ),
    ).rejects.toThrow('記録');
    const before = await readFile(
      join(root, 'src/content/images.json'),
      'utf8',
    );
    await expect(
      media.upload({
        stoneId: stones[8].id,
        data,
        license: 'CC BY 4.0',
        photographer: 'Test author',
        note: '',
        sourceUrl: 'https://example.org/no-license',
      }),
    ).rejects.toThrow('Fileページ');
    expect(await readFile(join(root, 'src/content/images.json'), 'utf8')).toBe(
      before,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
