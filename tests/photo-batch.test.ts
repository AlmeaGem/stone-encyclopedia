import { it, expect } from 'vitest';
import { mkdtemp, cp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { EditorStore } from '../scripts/admin-store';
import { ImageBatch } from '../scripts/image-batch';
import { collectForStone } from '../scripts/collect-images';
import { prepareImages } from '../scripts/prepare-images';

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'almea-photo-batch-'));
  await cp('src/content', join(root, 'src/content'), { recursive: true });
  return { root, store: new EditorStore(root) };
}
async function settled(batch: ImageBatch) {
  for (let n = 0; n < 5000; n++) {
    if (!batch.busy) return batch.state();
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('worker did not stop');
}
function response() {
  return new Response(
    JSON.stringify({
      query: {
        pages: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [
            i,
            {
              pageid: i + 1,
              imageinfo: [
                {
                  mime: 'image/jpeg',
                  url: `https://upload.wikimedia.org/fixture-${i}.jpg`,
                  descriptionurl: `https://commons.wikimedia.org/wiki/File:Fixture_${i}.jpg`,
                  extmetadata: {
                    Artist: { value: 'Fixture author (test only)' },
                    LicenseShortName: { value: 'CC BY 4.0' },
                  },
                },
              ],
            },
          ]),
        ),
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
it('collects ten stones, stages manual selections, and publishes only confirmed images atomically', async () => {
  const { root, store } = await setup();
  try {
    const ids = (await store.read('stones')).slice(0, 10).map((s: any) => s.id);
    const batch = new ImageBatch(
      store,
      (r, id) => collectForStone(r, id, async () => response()),
      0,
    );
    await batch.start(ids);
    expect((await settled(batch))?.status).toBe('completed');
    expect(await store.candidates()).toHaveLength(100);
    expect(await store.read('images')).toEqual([]);
    const bytes = await sharp({
      create: { width: 24, height: 24, channels: 3, background: '#bd9999' },
    })
      .jpeg()
      .toBuffer();
    for (const id of ids) {
      const c = (await store.candidates()).find((c) => c.stoneId === id)!;
      await expect(
        store.approve(c, async () => new Response(bytes), true),
      ).rejects.toThrow();
      await store.approve(
        {
          ...c,
          identityConfirmed: true,
          rightsConfirmed: true,
          alt: 'TEST FIXTURE ONLY',
        },
        async () =>
          new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } }),
        true,
      );
    }
    expect(await store.read('images')).toEqual([]);
    expect(await store.applyApproved()).toEqual({ applied: 10 });
    expect(await prepareImages(root)).toBe(10);
    await store.applyApproved();
    expect(await store.read('images')).toHaveLength(10);
    const failed = await store.candidates();
    failed.find((c) => c.status === 'approved')!.rightsConfirmed = false;
    await store.atomic(join(root, '.editor/candidates.json'), failed);
    const before = await readFile(
      join(root, 'src/content/images.json'),
      'utf8',
    );
    await expect(store.applyApproved()).rejects.toThrow();
    expect(await readFile(join(root, 'src/content/images.json'), 'utf8')).toBe(
      before,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
it('persists errors, resumes without repeating completed stones, and prevents duplicate workers', async () => {
  const { root, store } = await setup();
  try {
    const ids = (await store.read('stones')).slice(0, 3).map((s: any) => s.id);
    let calls: string[] = [];
    let fail = true;
    const collect = async (_r: string, id: string) => {
      calls.push(id);
      if (id === ids[1] && fail) throw new Error('HTTP 429');
      return [];
    };
    const batch = new ImageBatch(store, collect, 0);
    await batch.start(ids);
    expect((await settled(batch))?.cursor).toBe(1);
    expect((await batch.state())?.error).toContain('429');
    await expect(batch.start(ids)).rejects.toThrow();
    fail = false;
    const resumed = new ImageBatch(store, collect, 0);
    await resumed.resume();
    await resumed.resume();
    expect((await settled(resumed))?.status).toBe('completed');
    expect(calls.filter((id) => id === ids[0])).toHaveLength(1);
    expect(calls.filter((id) => id === ids[2])).toHaveLength(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it('stops on API errors and daily budgets without publishing or approving', async () => {
  const { root, store } = await setup();
  try {
    const id = (await store.read('stones'))[0].id;
    await expect(
      collectForStone(root, id, async () => new Response('', { status: 429 })),
    ).rejects.toThrow('429');
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
    }).format(new Date());
    await store.atomic(join(root, '.editor/image-budget.json'), {
      date,
      calls: 1,
      limit: 1,
    });
    let requests = 0;
    await expect(
      collectForStone(root, id, async () => {
        requests++;
        return response();
      }),
    ).rejects.toThrow('上限');
    expect(requests).toBe(0);
    expect(await store.read('images')).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it('pauses after the current stone, rejects a second worker, and recovers interrupted jobs', async () => {
  const { root, store } = await setup();
  try {
    const ids = (await store.read('stones')).slice(0, 3).map((s: any) => s.id);
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const batch = new ImageBatch(
      store,
      async () => {
        await gate;
        return [];
      },
      0,
    );
    await batch.start(ids);
    const second = new ImageBatch(store, async () => [], 0);
    expect((await second.state())?.status).toBe('running');
    await expect(second.start(ids)).rejects.toThrow('ワーカー');
    await batch.pause();
    release();
    expect((await settled(batch))?.cursor).toBe(1);
    expect((await batch.state())?.status).toBe('paused');
    const seen: string[] = [];
    const restarted = new ImageBatch(
      store,
      async (_root, id) => {
        seen.push(id);
        return [];
      },
      0,
    );
    await restarted.resume();
    expect((await settled(restarted))?.status).toBe('completed');
    expect(seen).toEqual(ids.slice(1));
    await store.atomic(join(root, '.editor/image-job.json'), {
      id: 'interrupted',
      ids,
      cursor: 1,
      status: 'running',
      error: '',
      updatedAt: '',
    });
    expect((await new ImageBatch(store).state())?.status).toBe('paused');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
