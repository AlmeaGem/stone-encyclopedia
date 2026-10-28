import { it, expect } from 'vitest';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { photoQueries, searchMode } from '../scripts/photo-search';
import { EditorStore } from '../scripts/admin-store';
import { PhotoMedia } from '../scripts/photo-media';
import { collectForStone } from '../scripts/collect-images';
import { commonsCandidates } from '../scripts/image-policy';
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'almea-shapes-'));
  await cp('src/content', join(root, 'src/content'), { recursive: true });
  // Only this temporary test copy starts with an empty photo manifest.
  await writeFile(join(root, 'src/content/images.json'), '[]\n');
  return { root, store: new EditorStore(root) };
}
const meta = (url = 'https://upload.wikimedia.org/current.jpg') => ({
  query: {
    pages: {
      1: {
        pageid: 1,
        imageinfo: [
          {
            url,
            thumburl: url,
            mime: 'image/jpeg',
            width: 2400,
            height: 1800,
            descriptionurl:
              'https://commons.wikimedia.org/wiki/File:Fixture.jpg',
            extmetadata: {
              Artist: { value: 'TEST ONLY' },
              LicenseShortName: { value: 'CC BY 4.0' },
            },
          },
        ],
      },
    },
  },
});
it('compares old and sphere queries for ten stones and never infers shape from a search term', async () => {
  const { root, store } = await setup();
  try {
    for (const stone of (await store.read('stones')).slice(0, 10)) {
      expect(photoQueries(stone, 'sphere')[0]).toContain('sphere');
      expect(photoQueries(stone, 'all')[0]).not.toContain('sphere');
      const c = commonsCandidates(meta(), stone)[0];
      expect(c.shape).toBe('unknown');
      expect(c.shapeConfirmed).toBe(false);
      expect(c.sourceWidth).toBe(2400);
    }
    expect(searchMode(undefined)).toBe('sphere');
    expect(() => searchMode('guess')).toThrow();
    expect(
      photoQueries(
        { english: 'Amethyst', name: 'アメジスト', aliases: [] },
        'polished',
      )[0],
    ).toContain('gemstone beads');
    expect(
      photoQueries(
        { english: 'Rubellite', name: 'ルベライト', aliases: [] },
        'loose',
      )[0],
    ).toContain('cabochon');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it('preserves historical candidates instead of truncating them during another search', async () => {
  const { root, store } = await setup();
  try {
    const stone = (await store.read('stones'))[0];
    const c = commonsCandidates(meta(), stone)[0];
    const before = Array.from({ length: 12 }, (_, i) => ({
      ...c,
      id: 'old-' + i,
    }));
    await store.atomic(join(root, '.editor/candidates.json'), before);
    await collectForStone(
      root,
      stone.id,
      async () => Response.json(meta()),
      'sphere',
    );
    expect((await store.candidates()).map((c) => c.id)).toEqual(
      expect.arrayContaining(before.map((c) => c.id)),
    );
    expect(await store.read('images')).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 10000);
it('reports HTTP errors and refreshes only via official Commons metadata without replacing published images', async () => {
  const { root, store } = await setup();
  try {
    const stone = (await store.read('stones'))[0];
    const c = commonsCandidates(
      meta('https://upload.wikimedia.org/old.jpg'),
      stone,
    )[0];
    await store.saveCandidate(c);
    const bytes = await sharp({
      create: { width: 50, height: 40, channels: 3, background: '#c6b0bc' },
    })
      .jpeg()
      .toBuffer();
    const media = new PhotoMedia(store, async (url) =>
      String(url).includes('/w/api.php')
        ? Response.json(meta())
        : String(url).includes('/old.jpg')
          ? new Response(null, { status: 404 })
          : new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } }),
    );
    await expect(media.thumbnail(c, false)).rejects.toThrow('404');
    expect((await media.health())[c.stoneId + ':' + c.id].status).toBe('error');
    await media.retry(c.id, c.stoneId);
    const updated = (await store.candidates())[0];
    expect(updated.imageUrl).toContain('current.jpg');
    expect(updated.identityConfirmed).toBe(false);
    expect((await media.health())[c.stoneId + ':' + c.id].status).toBe('ok');
    expect(await store.read('images')).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it('keeps uploads and permission notes private until explicit identity and rights approval', async () => {
  const { root, store } = await setup();
  try {
    const stone = (await store.read('stones'))[0];
    const media = new PhotoMedia(store);
    const bytes = await sharp({
      create: { width: 40, height: 40, channels: 3, background: '#c6b0bc' },
    })
      .jpeg()
      .toBuffer();
    const data = 'data:image/jpeg;base64,' + bytes.toString('base64');
    await expect(
      media.upload({
        stoneId: stone.id,
        data,
        photographer: 'Owner',
        license: 'Commercial permission',
        note: '',
      }),
    ).rejects.toThrow();
    const c = await media.upload({
      stoneId: stone.id,
      data,
      photographer: 'Owner',
      license: 'Own photo',
      note: 'PRIVATE OWNERSHIP RECORD — original photo, business use and resize allowed',
    });
    expect(await store.read('images')).toEqual([]);
    await expect(store.approve(c, fetch, true)).rejects.toThrow();
    await store.approve(
      {
        ...c,
        alt: 'Synthetic fixture',
        identityConfirmed: true,
        rightsConfirmed: true,
      },
      fetch,
      true,
    );
    await store.applyApproved();
    const manifest = await readFile(
      join(root, 'src/content/images.json'),
      'utf8',
    );
    expect(manifest).not.toContain('PRIVATE OWNERSHIP RECORD');
    expect(manifest).toContain('Own photo');
    await expect(
      media.upload({
        stoneId: stone.id,
        data: 'data:image/svg+xml;base64,PHN2Zz4=',
        photographer: 'Owner',
        license: 'Own photo',
        note: 'Original photo owned by me',
      }),
    ).rejects.toThrow('JPEG');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it('deduplicates simultaneous thumbnail downloads and bounds the preview size', async () => {
  const { root, store } = await setup();
  try {
    const stone = (await store.read('stones'))[0],
      c = commonsCandidates(meta(), stone)[0];
    await store.saveCandidate(c);
    const bytes = await sharp({
      create: { width: 900, height: 700, channels: 3, background: '#b99aaa' },
    })
      .jpeg()
      .toBuffer();
    let downloads = 0;
    const media = new PhotoMedia(store, async () => {
      downloads++;
      return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } });
    });
    const [a, b] = await Promise.all([
      media.thumbnail(c, false),
      media.thumbnail(c, false),
    ]);
    expect(downloads).toBe(1);
    expect(a.equals(b)).toBe(true);
    expect((await sharp(a).metadata()).width).toBe(480);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
