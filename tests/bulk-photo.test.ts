import { it, expect } from 'vitest';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { EditorStore } from '../scripts/admin-store';
import { PhotoMedia } from '../scripts/photo-media';
import { PhotoBulk } from '../scripts/photo-bulk';
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'almea-bulk-'));
  await cp('src/content', join(root, 'src/content'), { recursive: true });
  await cp('assets/approved-images', join(root, 'assets/approved-images'), {
    recursive: true,
  });
  const store = new EditorStore(root),
    media = new PhotoMedia(store),
    bulk = new PhotoBulk(store);
  const bytes = await sharp({
    create: { width: 64, height: 48, channels: 3, background: '#bca5ad' },
  })
    .png()
    .toBuffer();
  const upload = async (
    stoneId: string,
    license = 'Own photo',
    requestId = randomUUID(),
  ) => {
    const input = {
      stoneId,
      license,
      requestId,
      imageKind: license === 'AI-generated' ? 'ai-generated' : 'real-photo',
      photographer: 'Test author',
      note: 'テスト用の自社撮影または生成利用権限確認記録',
      sourceUrl: '',
      data: 'data:image/png;base64,' + bytes.toString('base64'),
    };
    return { input, c: await media.upload(input) };
  };
  const decision = async (c: any) => ({
    id: c.id,
    stoneId: c.stoneId,
    revision: (await bulk.state()).candidates.find((x) => x.id === c.id)!
      .revision,
    imageKind: c.imageKind,
    alt: c.stoneName + 'のテスト写真',
    identityConfirmed: true,
    rightsConfirmed: true,
  });
  return { root, store, media, bulk, upload, decision };
}
it('adopts only eight of ten saved uploads, survives reopening and preserves published photos', async () => {
  const x = await setup();
  try {
    const original = await x.store.read('images');
    expect(original.some((p: any) => p.stoneId === 's001')).toBe(true);
    expect(original.some((p: any) => p.stoneId === 's002')).toBe(true);
    const saved = [];
    for (let i = 3; i <= 12; i++)
      saved.push(
        await x.upload(
          's' + String(i).padStart(3, '0'),
          i % 2 ? 'Own photo' : 'AI-generated',
        ),
      );
    expect((await x.media.upload(saved[0].input)).id).toBe(saved[0].c.id);
    expect(await x.store.candidates()).toHaveLength(10);
    const plan = await x.bulk.preview(
      await Promise.all(saved.slice(0, 8).map((v) => x.decision(v.c))),
    );
    expect(plan.results.every((r) => r.status === 'ready')).toBe(true);
    const result = await x.bulk.adopt(plan.token);
    expect(result.results.filter((r) => r.status === 'adopted')).toHaveLength(
      8,
    );
    expect(await x.store.read('images')).toEqual(original);
    const reopened = new PhotoBulk(new EditorStore(x.root));
    expect(
      (await reopened.state()).candidates.filter(
        (c) => c.state === '承認済み・反映待ち',
      ),
    ).toHaveLength(8);
    expect(
      (await reopened.state()).candidates.filter((c) => c.state === '仮保存'),
    ).toHaveLength(2);
    expect((await reopened.adopt(plan.token)).results).toEqual(result.results);
    expect(await x.store.applyApproved(true)).toEqual({ applied: 8 });
    expect(await x.store.applyApproved(true)).toEqual({ applied: 0 });
    const manifest = await x.store.read('images');
    expect(manifest).toHaveLength(original.length + 8);
    for (const photo of original) {
      expect(manifest.find((p: any) => p.stoneId === photo.stoneId)).toEqual(
        photo,
      );
      const path = join(
        'assets/approved-images',
        photo.stoneId,
        photo.sha256 + '.webp',
      );
      expect(await readFile(join(x.root, path))).toEqual(await readFile(path));
    }
    expect(
      (await reopened.state()).candidates.filter(
        (c) => c.state === '図鑑データへ反映済み',
      ),
    ).toHaveLength(8);
  } finally {
    await rm(x.root, { recursive: true, force: true });
  }
});
it('excludes duplicate stones, missing confirmation and protected images while adopting valid rows', async () => {
  const x = await setup();
  try {
    const entries = [];
    for (const id of ['s013', 's013', 's014', 's001', 's015', 's016'])
      entries.push(await x.upload(id));
    const decisions = await Promise.all(entries.map((v) => x.decision(v.c)));
    decisions[2].rightsConfirmed = false;
    // Corrupt only this private test fixture. The real candidate/original is untouched.
    const broken = await x.upload('s017');
    const brokenDecision = await x.decision(broken.c);
    await writeFile(
      join(x.root, '.editor/uploads', broken.c.uploadSha256 + '.webp'),
      'invalid',
    );
    // Each upload shares bytes here, so restore a unique valid upload for the successful row.
    const validBytes = await sharp({
      create: { width: 80, height: 80, channels: 3, background: '#112233' },
    })
      .png()
      .toBuffer();
    const valid = await x.media.upload({
      ...entries[5].input,
      requestId: randomUUID(),
      data: 'data:image/png;base64,' + validBytes.toString('base64'),
    });
    const plan = await x.bulk.preview([
      ...decisions.slice(0, 4),
      brokenDecision,
      await x.decision(valid),
    ]);
    expect(plan.results.filter((r) => r.status === 'excluded')).toHaveLength(4);
    const job = await x.bulk.adopt(plan.token);
    expect(job.results.filter((r) => r.status === 'adopted')).toHaveLength(1);
    expect(job.results.filter((r) => r.status === 'failed')).toHaveLength(1);
    expect(job.results.filter((r) => r.status === 'excluded')).toHaveLength(4);
    expect(
      (await x.bulk.state()).candidates.filter((c) => c.state === '確認待ち'),
    ).toHaveLength(5);
    const before = await x.store.read('images');
    await x.store.applyApproved(true);
    expect(
      (await x.store.read('images')).find((p: any) => p.stoneId === 's001'),
    ).toEqual(before.find((p: any) => p.stoneId === 's001'));
  } finally {
    await rm(x.root, { recursive: true, force: true });
  }
});
it('rejects stale review plans and reports interrupted jobs without losing saved candidates', async () => {
  const x = await setup();
  try {
    const { c } = await x.upload('s020');
    const plan = await x.bulk.preview([await x.decision(c)]);
    await x.store.saveCandidate({ ...c, alt: '別画面で更新' });
    const job = await x.bulk.adopt(plan.token);
    expect(job.results[0].status).toBe('excluded');
    await x.store.atomic(join(x.root, '.editor/bulk-adoption.json'), {
      ...job,
      status: 'running',
    });
    expect((await new PhotoBulk(x.store).state()).job.status).toBe(
      'interrupted',
    );
    expect(await x.store.candidates()).toHaveLength(1);
  } finally {
    await rm(x.root, { recursive: true, force: true });
  }
});
