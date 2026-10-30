import { test, expect } from '@playwright/test';
import { mkdtemp, cp, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import sharp from 'sharp';
import { startEditor } from '../../scripts/admin-server';
import { EditorStore } from '../../scripts/admin-store';
import { PhotoMedia } from '../../scripts/photo-media';
import type { Candidate } from '../../src/lib/schema';
let root: string,
  server: Server,
  url: string,
  store: EditorStore,
  a: Candidate,
  b: Candidate,
  c: Candidate,
  approved: Candidate,
  published: Candidate;
test.beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'almea-trash-ui-'));
  await cp('src/content', join(root, 'src/content'), { recursive: true });
  await cp('assets/approved-images', join(root, 'assets/approved-images'), {
    recursive: true,
  });
  store = new EditorStore(root);
  const media = new PhotoMedia(store);
  const data =
    'data:image/png;base64,' +
    (
      await sharp({
        create: { width: 160, height: 120, channels: 3, background: '#bfa5b3' },
      })
        .png()
        .toBuffer()
    ).toString('base64');
  const upload = (stoneId: string) =>
    media.upload({
      stoneId,
      data,
      license: 'Own photo',
      photographer: 'Test author',
      note: '本人撮影・掲載許可確認済みのテスト画像',
    });
  a = await upload('s003');
  b = await upload('s004');
  await store.saveCandidate({ ...b, status: 'review' });
  b = (await store.candidates()).find((p) => p.id === b.id)!;
  c = await upload('s005');
  const d = await upload('s007');
  approved = await store.approve(
    {
      ...d,
      alt: 'approved fixture',
      identityConfirmed: true,
      rightsConfirmed: true,
    },
    fetch,
    true,
  );
  published = (await store.read('images'))[0];
  await store.atomic(join(root, '.editor/candidates.json'), [
    ...(await store.rawCandidates()),
    published,
  ]);
  server = await startEditor(
    root,
    'trash-browser-fixture-passphrase',
    0,
    async () => {
      throw Error('No external downloads in local trash fixture');
    },
  );
  const address = server.address();
  url =
    'http://127.0.0.1:' +
    (typeof address === 'object' && address ? address.port : 0);
});
test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await rm(root, { recursive: true, force: true });
});
test('single and checked-subset deletion, cancel, restore, stale protection and mobile layout', async ({
  page,
  request,
}, info) => {
  const rawBefore = await readFile(
      join(root, '.editor/candidates.json'),
      'utf8',
    ),
    publicBefore = await readFile(
      join(root, 'src/content/images.json'),
      'utf8',
    );
  expect(
    (
      await request.post(url + '/api/photo-trash-preview', {
        headers: { Origin: url },
        data: { items: [] },
      })
    ).status(),
  ).toBe(401);
  await page.goto(url + '/login');
  await page
    .locator('input[type=password]')
    .fill('trash-browser-fixture-passphrase');
  await page.locator('button').click();
  await page.locator('[data-tab=images]').click();
  const card = (id: string) =>
    page.locator('#bulk-candidates .bulk-card').filter({ hasText: id });
  await card(a.stoneId)
    .getByRole('button', { name: a.stoneName + 'の候補を削除', exact: true })
    .click();
  await expect(page.locator('#photo-trash-dialog')).toBeVisible();
  await expect(page.locator('#photo-trash-confirm-list img')).toHaveCount(1);
  await expect(page.locator('#photo-trash-selection-count')).toContainText(
    '削除にチェック 1枚',
  );
  await page.locator('#photo-trash-cancel').click();
  expect(await readFile(join(root, '.editor/candidates.json'), 'utf8')).toBe(
    rawBefore,
  );
  await expect(card(a.stoneId)).toBeVisible();
  await card(a.stoneId)
    .getByRole('button', { name: a.stoneName + 'の候補を削除', exact: true })
    .click();
  await page.locator('#photo-trash-confirm').click();
  await expect(page.locator('#status')).toContainText(
    '1枚の未承認候補をゴミ箱',
  );
  await expect(card(a.stoneId)).toHaveCount(0);
  await expect(page.locator('#photo-trash-count')).toContainText('ゴミ箱 1枚');
  await page
    .locator('#photo-trash-panel')
    .evaluate((el: HTMLDetailsElement) => (el.open = true));
  const thumb = page.locator('#photo-trash-list img').first();
  await thumb.scrollIntoViewIfNeeded();
  await expect
    .poll(() => thumb.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  page.once('dialog', (d) => d.accept());
  await page
    .getByRole('button', { name: a.stoneName + 'の候補を復元', exact: true })
    .click();
  await expect(card(a.stoneId)).toBeVisible();
  await expect(page.locator('#photo-trash-count')).toContainText('ゴミ箱 0枚');
  await page.locator('#bulk-select-all').click();
  await page.locator('#bulk-delete-selected').click();
  await expect(page.locator('#photo-trash-confirm-list img')).toHaveCount(3);
  await page
    .getByRole('checkbox', { name: c.stoneName + 'の削除を確認', exact: true })
    .uncheck();
  await expect(page.locator('#photo-trash-selection-count')).toContainText(
    '削除にチェック 2枚',
  );
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator('#photo-trash-dialog')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    if (info.project.name === 'desktop' && [390, 1440].includes(width)) {
      await mkdir('docs/screenshots/photo-trash', { recursive: true });
      await page.locator('#photo-trash-dialog').screenshot({
        path: 'docs/screenshots/photo-trash/confirm-' + width + '.png',
      });
    }
  }
  await page.locator('#photo-trash-confirm').click();
  await expect(page.locator('#status')).toContainText(
    '2枚の未承認候補をゴミ箱',
  );
  await expect(card(a.stoneId)).toHaveCount(0);
  await expect(card(b.stoneId)).toHaveCount(0);
  await expect(card(c.stoneId)).toHaveCount(1);
  await expect(page.locator('#photo-trash-count')).toContainText('ゴミ箱 2枚');
  expect(await readFile(join(root, '.editor/candidates.json'), 'utf8')).toBe(
    rawBefore,
  );
  await page.locator('#bulk-filter').selectOption('all');
  for (const protectedPhoto of [approved, published])
    await expect(
      card(protectedPhoto.stoneId).getByRole('button', {
        name: protectedPhoto.stoneName + 'の候補を削除',
        exact: true,
      }),
    ).toBeDisabled();
  const state = await (await page.request.get(url + '/api/state')).json();
  const headers = { Origin: url, 'X-CSRF-Token': state.csrf };
  expect(
    (
      await page.request.post(url + '/api/photo-trash-preview', {
        headers: { Origin: url },
        data: { items: [] },
      })
    ).status(),
  ).toBe(403);
  const target = state.photoTrash.permissions.find(
    (p: any) => p.id === published.id,
  );
  const selection = {
    id: target.id,
    stoneId: target.stoneId,
    revision: target.revision,
  };
  const blocked = await (
    await page.request.post(url + '/api/photo-trash-preview', {
      headers,
      data: { items: [selection] },
    })
  ).json();
  expect(blocked.items[0].allowed).toBe(false);
  expect(
    (
      await page.request.post(url + '/api/photo-trash-delete', {
        headers,
        data: { token: blocked.token, items: [selection] },
      })
    ).status(),
  ).toBe(400);
  const fresh = state.photoTrash.permissions.find((p: any) => p.id === c.id);
  const item = { id: c.id, stoneId: c.stoneId, revision: fresh.revision };
  const stalePlan = await (
    await page.request.post(url + '/api/photo-trash-preview', {
      headers,
      data: { items: [item] },
    })
  ).json();
  expect(
    (
      await page.request.post(url + '/api/stage-photo', {
        headers,
        data: {
          document: {
            ...c,
            alt: 'now approved',
            identityConfirmed: true,
            rightsConfirmed: true,
          },
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post(url + '/api/photo-trash-delete', {
        headers,
        data: { token: stalePlan.token, items: [item] },
      })
    ).status(),
  ).toBe(400);
  await page.locator('#bulk-reload').click();
  await expect(
    card(c.stoneId).getByRole('button', {
      name: c.stoneName + 'の候補を削除',
      exact: true,
    }),
  ).toBeDisabled();
  expect(await readFile(join(root, 'src/content/images.json'), 'utf8')).toBe(
    publicBefore,
  );
  page.once('dialog', (d) => d.accept());
  await page
    .getByRole('button', { name: b.stoneName + 'の候補を復元', exact: true })
    .click();
  await expect(card(b.stoneId)).toContainText('確認待ち');
  await expect(page.locator('#photo-trash-count')).toContainText('ゴミ箱 1枚');
  expect((await store.candidates()).find((p) => p.id === b.id)).toEqual(b);
  await page.reload();
  await page.locator('[data-tab=images]').click();
  await expect(page.locator('#photo-trash-count')).toContainText('ゴミ箱 1枚');
  await page
    .locator('#photo-trash-panel')
    .evaluate((el: HTMLDetailsElement) => (el.open = true));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page
      .locator('#photo-trash-panel')
      .evaluate((el) => el.scrollIntoView({ block: 'start' }));
    if (info.project.name === 'desktop')
      await page.screenshot({
        path: 'docs/screenshots/photo-trash/trash-' + width + '.png',
      });
  }
  for (const p of JSON.parse(publicBefore))
    expect(
      await readFile(
        join(root, 'assets/approved-images', p.stoneId, p.sha256 + '.webp'),
      ),
    ).toEqual(
      await readFile(
        join('assets/approved-images', p.stoneId, p.sha256 + '.webp'),
      ),
    );
});
