import { request } from 'node:http';
import { beforeEach, afterEach, it, expect } from 'vitest';
import { mkdtemp, cp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EditorStore } from '../scripts/admin-store';
import { startEditor } from '../scripts/admin-server';
import sharp from 'sharp';
import { licenseUrls } from '../scripts/image-policy';
let root: string, store: EditorStore;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'almea-public-editor-'));
  await cp('src/content', join(root, 'src/content'), { recursive: true });
  store = new EditorStore(root);
});
afterEach(async () => rm(root, { recursive: true, force: true }));
it('keeps drafts private and rejects stale or fixed-ID-changing edits before atomic publication', async () => {
  const original = await store.read('stones'),
    entry = await store.entry('stones', 's107');
  const edited = { ...entry.document, name: '確認済みの名前' };
  const saved = await store.draft('stones', 's107', entry.revision, edited);
  expect(await store.read('stones')).toEqual(original);
  await expect(
    store.draft('stones', 's107', entry.revision, edited),
  ).rejects.toThrow('更新');
  await expect(
    store.draft('stones', 's107', saved.revision, { ...edited, id: 's110' }),
  ).rejects.toThrow('固定');
  await store.publish('stones', 's107', saved.revision);
  const after = await store.read('stones');
  expect(after.find((s: any) => s.id === 's107').name).toBe('確認済みの名前');
  expect(after).toHaveLength(210);
  expect(after.filter((s: any) => s.id !== 's107')).toEqual(
    original.filter((s: any) => s.id !== 's107'),
  );
});
it('does not overwrite a newer publication and retains the draft for recovery', async () => {
  const entry = await store.entry('stones', 's107'),
    saved = await store.draft('stones', 's107', entry.revision, {
      ...entry.document,
      name: '下書き',
    });
  const publicData = await store.read('stones');
  publicData.find((s: any) => s.id === 's107').name = '外部で更新';
  await store.atomic(join(root, 'src/content/stones.json'), publicData);
  await expect(store.publish('stones', 's107', saved.revision)).rejects.toThrow(
    '公開用',
  );
  expect((await store.entry('stones', 's107')).document.name).toBe('下書き');
});
it('registers and edits original articles and the twelve category records', async () => {
  const article = {
    slug: 'new-note',
    title: '新しい記事',
    category: '編集',
    description: '説明',
    sections: [{ heading: '見出し', body: '本文' }],
    stoneIds: ['s107'],
    updatedAt: '2026-10-27',
    status: 'published',
  };
  const saved = await store.draft('articles', 'new-note', 'new', article);
  await store.publish('articles', 'new-note', saved.revision);
  expect(
    (await store.read('articles')).some((a: any) => a.slug === 'new-note'),
  ).toBe(true);
  const entry = await store.entry('categories', 'love'),
    draft = await store.draft('categories', 'love', entry.revision, {
      ...entry.document,
      subcategories: ['新しい願い'],
    });
  await store.publish('categories', 'love', draft.revision);
  expect((await store.read('categories'))[0].subcategories).toEqual([
    '新しい願い',
  ]);
});
it('cannot publish unreviewed photos; approved photos only alter the selected fixed-ID association', async () => {
  const image = {
    id: 'local-fixture',
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
    modified: false,
    status: 'pending',
    misidentificationNote: 'テスト専用',
    identityConfirmed: false,
    rightsConfirmed: false,
    reviewedAt: null,
    alt: 'テスト専用の単色画像',
    localPath: null,
    width: null,
    height: null,
    sha256: null,
  };
  await store.saveCandidate(image);
  await expect(store.approve(image)).rejects.toThrow('確認');
  expect(await store.read('images')).toEqual([]);
  const bytes = await sharp({
    create: { width: 40, height: 20, channels: 3, background: '#c5b2a4' },
  })
    .png()
    .toBuffer();
  const published = await store.approve(
    { ...image, identityConfirmed: true, rightsConfirmed: true },
    async () =>
      new Response(new Uint8Array(bytes), {
        headers: { 'content-type': 'image/png' },
      }),
  );
  expect(published.modified).toBe(true);
  expect(published.stoneId).toBe('s107');
  expect(await store.read('images')).toHaveLength(1);
  expect(
    await readFile(
      root +
        '/assets/approved-images/' +
        published.localPath!.replace(/^\/images\//, ''),
    ),
  ).toBeTruthy();
  await store.removePhoto('s107');
  expect(await store.read('images')).toEqual([]);
  expect(
    await readFile(
      root +
        '/assets/approved-images/' +
        published.localPath!.replace(/^\/images\//, ''),
    ),
  ).toBeTruthy();
});
it('requires local Host, password, session, same-origin and CSRF, without exposing private APIs', async () => {
  const server = await startEditor(
    root,
    'test-only-passphrase-32-characters',
    0,
  );
  try {
    const port = (server.address() as import('node:net').AddressInfo).port,
      base = `http://127.0.0.1:${port}`;
    expect((await fetch(base + '/api/state')).status).toBe(401);
    expect(
      await new Promise<number | undefined>((r) => {
        const req = request(
          base + '/api/state',
          { headers: { Host: 'evil.test' } },
          (res) => {
            res.resume();
            r(res.statusCode);
          },
        );
        req.end();
      }),
    ).toBe(403);
    const login = await fetch(base + '/api/login', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'test-only-passphrase-32-characters' }),
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    expect(login.headers.get('set-cookie')).toContain('HttpOnly');
    const state = await (
      await fetch(base + '/api/state', { headers: { Cookie: cookie } })
    ).json();
    expect(state.stones).toHaveLength(210);
    expect(
      (
        await fetch(base + '/api/remove-photo', {
          method: 'POST',
          headers: {
            Cookie: cookie,
            Origin: base,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ stoneId: 's107' }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(base + '/api/remove-photo', {
          method: 'POST',
          headers: {
            Cookie: cookie,
            Origin: 'https://evil.test',
            'Content-Type': 'application/json',
            'X-CSRF-Token': state.csrf,
          },
          body: JSON.stringify({ stoneId: 's107' }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(base + '/api/remove-photo', {
          method: 'POST',
          headers: {
            Cookie: cookie,
            Origin: base,
            'Content-Type': 'application/json',
            'X-CSRF-Token': state.csrf,
          },
          body: JSON.stringify({ stoneId: 's107' }),
        })
      ).status,
    ).toBe(200);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
it('refuses weak passwords before opening an editor port', async () => {
  await expect(startEditor(root, 'weak', 0)).rejects.toThrow('20文字');
});

it('does not share authenticated sessions between independent editor instances', async () => {
  const a = await startEditor(root, 'instance-one-fixture-passphrase', 0),
    b = await startEditor(root, 'instance-two-fixture-passphrase', 0);
  try {
    const origin = (s: typeof a) =>
      `http://127.0.0.1:${(s.address() as import('node:net').AddressInfo).port}`;
    const response = await fetch(origin(a) + '/api/login', {
      method: 'POST',
      headers: { Origin: origin(a), 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'instance-one-fixture-passphrase' }),
    });
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    expect(
      (await fetch(origin(b) + '/api/state', { headers: { Cookie: cookie } }))
        .status,
    ).toBe(401);
  } finally {
    await Promise.all(
      [a, b].map((s) => new Promise<void>((r) => s.close(() => r()))),
    );
  }
});

it('rate-limits repeated incorrect editor passwords', async () => {
  const server = await startEditor(root, 'rate-limit-fixture-passphrase', 0);
  try {
    const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
    for (let i = 0; i < 5; i++)
      expect(
        (
          await fetch(base + '/api/login', {
            method: 'POST',
            headers: { Origin: base, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'incorrect-fixture-password' }),
          })
        ).status,
      ).toBe(401);
    expect(
      (
        await fetch(base + '/api/login', {
          method: 'POST',
          headers: { Origin: base, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'rate-limit-fixture-passphrase' }),
        })
      ).status,
    ).toBe(429);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
