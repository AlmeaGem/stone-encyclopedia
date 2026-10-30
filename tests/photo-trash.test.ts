import { it, expect } from 'vitest';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { EditorStore } from '../scripts/admin-store';
import { PhotoMedia } from '../scripts/photo-media';
import { PhotoTrash } from '../scripts/photo-trash';
import { photoRevision } from '../scripts/photo-trash-state';
import type { Candidate } from '../src/lib/schema';
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'almea-trash-'));
  await cp('src/content', join(root, 'src/content'), { recursive: true });
  await cp('assets/approved-images', join(root, 'assets/approved-images'), {
    recursive: true,
  });
  const store = new EditorStore(root),
    media = new PhotoMedia(store);
  let clock = Date.parse('2026-10-29T00:00:00Z');
  const trash = new PhotoTrash(store, () => clock);
  const data =
    'data:image/png;base64,' +
    (
      await sharp({
        create: { width: 48, height: 32, channels: 3, background: '#c7abb8' },
      })
        .png()
        .toBuffer()
    ).toString('base64');
  const upload = async (stoneId: string) => {
    const input = {
      requestId: randomUUID(),
      stoneId,
      license: 'Own photo',
      photographer: 'Test author',
      note: '本人撮影・掲載許可を確認した単色テスト画像',
      data,
    };
    return { input, c: await media.upload(input) };
  };
  const selection = (c: Candidate) => ({
    id: c.id,
    stoneId: c.stoneId,
    revision: photoRevision(c),
  });
  return {
    root,
    store,
    media,
    trash,
    upload,
    selection,
    setClock: (value: number) => {
      clock = value;
    },
  };
}
it('deletes only final checked candidates, leaves raw files intact and restores the original status', async () => {
  const x = await setup();
  try {
    const a = await x.upload('s003'),
      b = await x.upload('s004'),
      c = await x.upload('s005');
    await x.store.saveCandidate({ ...b.c, status: 'review' });
    b.c = (await x.store.candidates()).find((p) => p.id === b.c.id)!;
    const raw = await readFile(join(x.root, '.editor/candidates.json'), 'utf8'),
      pub = await readFile(join(x.root, 'src/content/images.json'), 'utf8'),
      proof = await readFile(
        join(x.root, '.editor/upload-rights', a.c.id + '.json'),
      );
    const plan = await x.trash.preview([
      x.selection(a.c),
      x.selection(b.c),
      x.selection(c.c),
    ]);
    expect(plan.items.every((i) => i.allowed)).toBe(true);
    expect((await x.trash.state()).entries).toHaveLength(0);
    expect(
      await readFile(join(x.root, '.editor/candidates.json'), 'utf8'),
    ).toBe(raw); // cancel / preview does not mutate
    expect(
      await x.trash.remove(plan.token, [x.selection(a.c), x.selection(b.c)]),
    ).toMatchObject({ deleted: 2 });
    expect((await x.store.candidates()).map((c) => c.id)).toEqual([c.c.id]);
    expect((await x.trash.state()).entries).toHaveLength(2);
    expect(
      await readFile(join(x.root, '.editor/candidates.json'), 'utf8'),
    ).toBe(raw);
    expect(
      await readFile(join(x.root, 'src/content/images.json'), 'utf8'),
    ).toBe(pub);
    expect(
      await readFile(join(x.root, '.editor/upload-rights', a.c.id + '.json')),
    ).toEqual(proof);
    expect(
      (await x.trash.remove(plan.token, [x.selection(a.c), x.selection(b.c)]))
        .alreadyProcessed,
    ).toBe(true);
    await expect(
      x.trash.remove(plan.token, [x.selection(c.c)]),
    ).rejects.toThrow('変更');
    const entry = (await x.trash.state()).entries.find(
      (e) => e.candidate.id === b.c.id,
    )!;
    await x.trash.restore(entry.trashId);
    expect((await x.store.candidates()).find((p) => p.id === b.c.id)).toEqual(
      b.c,
    );
    expect((await x.trash.restore(entry.trashId)).restored).toBe(0);
    for (const p of await x.store.read('images'))
      expect(
        await readFile(
          join(x.root, 'assets/approved-images', p.stoneId, p.sha256 + '.webp'),
        ),
      ).toEqual(
        await readFile(
          join('assets/approved-images', p.stoneId, p.sha256 + '.webp'),
        ),
      );
  } finally {
    await rm(x.root, { recursive: true, force: true });
  }
});
it('rejects approved, rejected and published references, including approval after confirmation, without partial deletion', async () => {
  const x = await setup();
  try {
    const a = await x.upload('s003'),
      b = await x.upload('s004'),
      r = await x.upload('s006');
    await x.store.approve(
      { ...a.c, alt: 'test', identityConfirmed: true, rightsConfirmed: true },
      fetch,
      true,
    );
    await x.store.saveCandidate({ ...r.c, status: 'rejected' });
    const published = (await x.store.read('images'))[0];
    const fakePending = { ...published, status: 'pending' };
    await x.store.atomic(join(x.root, '.editor/candidates.json'), [
      ...(await x.store.rawCandidates()),
      fakePending,
    ]);
    const blocked = await x.trash.preview([
      x.selection((await x.store.candidates()).find((c) => c.id === a.c.id)!),
      x.selection(fakePending),
      x.selection((await x.store.candidates()).find((c) => c.id === r.c.id)!),
    ]);
    expect(blocked.items.every((i) => !i.allowed)).toBe(true);
    await expect(
      x.trash.remove(blocked.token, [blocked.items[0].selection]),
    ).rejects.toThrow('対象以外');
    const next = await x.upload('s005');
    const plan = await x.trash.preview([x.selection(b.c), x.selection(next.c)]);
    await x.store.approve(
      {
        ...next.c,
        alt: 'test',
        identityConfirmed: true,
        rightsConfirmed: true,
      },
      fetch,
      true,
    );
    await expect(
      x.trash.remove(plan.token, [x.selection(b.c), x.selection(next.c)]),
    ).rejects.toThrow('更新');
    expect((await x.trash.state()).entries).toHaveLength(0);
    expect((await x.store.candidates()).some((c) => c.id === b.c.id)).toBe(
      true,
    );
  } finally {
    await rm(x.root, { recursive: true, force: true });
  }
});
it('blocks stale single adoption and upload replay while trashed; later saves and approvals preserve trash originals', async () => {
  const x = await setup();
  try {
    const a = await x.upload('s003');
    const plan = await x.trash.preview([x.selection(a.c)]);
    await x.trash.remove(plan.token, [x.selection(a.c)]);
    await expect(
      x.store.saveCandidate({ ...a.c, alt: 'changed' }),
    ).rejects.toThrow('ゴミ箱');
    await expect(x.media.upload(a.input)).rejects.toThrow('ゴミ箱');
    await expect(
      x.store.approve(
        { ...a.c, alt: 'test', identityConfirmed: true, rightsConfirmed: true },
        fetch,
        true,
      ),
    ).rejects.toThrow('ゴミ箱');
    const b = await x.upload('s004');
    await x.store.approve(
      { ...b.c, alt: 'test', identityConfirmed: true, rightsConfirmed: true },
      fetch,
      true,
    );
    expect(
      (await x.store.rawCandidates()).find((p) => p.id === a.c.id),
    ).toEqual(a.c);
    expect((await x.store.candidates()).some((p) => p.id === a.c.id)).toBe(
      false,
    );
    await x.store.applyApproved(true);
    expect(
      (await x.store.read('images')).some((p: Candidate) => p.id === a.c.id),
    ).toBe(false);
    await x.trash.restore((await x.trash.state()).entries[0].trashId);
    expect((await x.store.candidates()).find((p) => p.id === a.c.id)).toEqual(
      a.c,
    );
  } finally {
    await rm(x.root, { recursive: true, force: true });
  }
});
it('enforces 30-day restore expiry without purging images and rejects metadata tampering', async () => {
  const x = await setup();
  try {
    const a = await x.upload('s003'),
      b = await x.upload('s004');
    const plan = await x.trash.preview([x.selection(a.c), x.selection(b.c)]);
    await x.trash.remove(plan.token, [x.selection(a.c), x.selection(b.c)]);
    const entries = (await x.trash.state()).entries;
    const ea = entries.find((e) => e.candidate.id === a.c.id)!,
      eb = entries.find((e) => e.candidate.id === b.c.id)!;
    x.setClock(ea.restoreUntil - 1);
    await x.trash.restore(ea.trashId);
    x.setClock(eb.restoreUntil);
    await expect(x.trash.restore(eb.trashId)).rejects.toThrow('期限');
    expect((await x.trash.state()).entries[0].canRestore).toBe(false);
    expect(
      (
        await readFile(
          join(x.root, '.editor/uploads', b.c.uploadSha256 + '.webp'),
        )
      ).length,
    ).toBeGreaterThan(0);
    x.setClock(eb.deletedAt + 1000);
    const raw = await x.store.rawCandidates();
    await x.store.atomic(
      join(x.root, '.editor/candidates.json'),
      raw.map((c) => (c.id === b.c.id ? { ...c, alt: 'external edit' } : c)),
    );
    await expect(x.trash.restore(eb.trashId)).rejects.toThrow('変更');
  } finally {
    await rm(x.root, { recursive: true, force: true });
  }
});
it('rejects unconfirmed IDs and invalid trash state without resetting existing data', async () => {
  const x = await setup();
  try {
    const a = await x.upload('s003'),
      b = await x.upload('s004');
    const plan = await x.trash.preview([x.selection(a.c)]);
    await expect(
      x.trash.remove(plan.token, [x.selection(b.c)]),
    ).rejects.toThrow('対象以外');
    expect((await x.store.candidates()).length).toBe(2);
    const raw = await readFile(join(x.root, '.editor/candidates.json'), 'utf8');
    await writeFile(join(x.root, '.editor/photo-trash.json'), 'broken-json');
    await expect(x.store.candidates()).rejects.toThrow();
    expect(
      await readFile(join(x.root, '.editor/candidates.json'), 'utf8'),
    ).toBe(raw);
    expect(
      await readFile(join(x.root, '.editor/photo-trash.json'), 'utf8'),
    ).toBe('broken-json');
  } finally {
    await rm(x.root, { recursive: true, force: true });
  }
});
