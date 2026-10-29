import { test, expect } from '@playwright/test';
import { Miniflare } from 'miniflare';
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { handle, type Env } from '../../cloud/photos/worker';
let mf: Miniflare;
let env: Env;
const admin = 'https://cloud-admin.test';
const api = 'https://photos.example.test';
test.beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2026-08-01',
    d1Databases: ['DB'],
    r2Buckets: ['IMAGES'],
  });
  const DB = await mf.getD1Database('DB'),
    IMAGES = await mf.getR2Bucket('IMAGES');
  for (const sql of (
    await readFile('cloud/photos/migrations/0001_photos.sql', 'utf8')
  )
    .replace(/^--.*$/gm, '')
    .split(';')
    .filter((s) => s.trim()))
    await DB.prepare(sql).run();
  env = {
    DB,
    IMAGES,
    ADMIN_ORIGIN: admin,
    PUBLIC_ORIGIN: 'http://127.0.0.1:4321',
    ACCESS_TEAM: 'test.cloudflareaccess.com',
    ACCESS_AUD: 'test',
    ADMIN_EMAILS: 'owner@example.com',
    UPLOADS_ENABLED: 'true',
  } as unknown as Env;
});
test.afterAll(async () => {
  await mf.dispose();
});
test('cloud management: upload, preview, publish, replacement, pause and delete at six widths', async ({
  page,
}, info) => {
  // Only this test adapter substitutes Access login. Production fetch always verifies real JWT.
  const adapter = async (route: import('@playwright/test').Route) => {
    const r = route.request();
    const res = await handle(
      new Request(r.url(), {
        method: r.method(),
        headers: r.headers(),
        ...(r.method() === 'POST' ? { body: r.postData() } : {}),
      }),
      env,
      async () => 'owner@example.com',
    );
    await route.fulfill({
      status: res.status,
      headers: Object.fromEntries(res.headers),
      body: Buffer.from(await res.arrayBuffer()),
    });
  };
  await page.route(admin + '/**', adapter);
  await page.route(api + '/**', adapter);
  await page.goto(admin + '/');
  await expect(page.locator('#list button')).toHaveCount(210);
  await page.getByRole('button', { name: /s001 オブシディアン/ }).click();
  const image = await sharp({
    create: { width: 600, height: 450, channels: 3, background: '#e5bfc5' },
  })
    .jpeg()
    .toBuffer();
  await page.locator('#file').setInputFiles({
    name: 'owned-photo-test.jpg',
    mimeType: 'image/jpeg',
    buffer: image,
  });
  await expect(page.locator('#preview')).toBeVisible();
  await page.locator('#photographer').fill('Test owner');
  await page.locator('#license').selectOption('Own photo');
  await page.locator('#kind').selectOption('illustrative');
  await page.locator('#alt').fill('確認用イメージ写真');
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (info.project.name === 'desktop') {
      await mkdir('docs/screenshots/cloud-photos', { recursive: true });
      await page.screenshot({
        path: 'docs/screenshots/cloud-photos/admin-fixture-' + width + '.png',
        fullPage: true,
      });
    }
  }
  await page.locator('#identity').check();
  await page.locator('#rights').check();
  await page.getByRole('button', { name: '保存して公開' }).click();
  await expect(page.locator('#status')).toContainText('保存・公開しました');
  const manifest = await handle(new Request(api + '/public/photos'), env);
  expect(await manifest.text()).toContain('Test owner');
  if (process.env.PUBLIC_PHOTO_API_ORIGIN === api) {
    await page.goto('/stones/obsidian/');
    await expect(
      page.locator('figcaption').filter({ hasText: 'イメージ写真' }),
    ).toBeVisible();
    await expect(page.locator('img[alt="確認用イメージ写真"]')).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('img[alt="確認用イメージ写真"]')
          .evaluate((el: HTMLImageElement) => el.naturalWidth),
      )
      .toBeGreaterThan(0);
    if (info.project.name === 'desktop')
      await page.screenshot({
        path: 'docs/screenshots/cloud-photos/public-fixture.png',
        fullPage: true,
      });
    await page.goto(admin + '/');
    await page.getByRole('button', { name: /s001 オブシディアン/ }).click();
  }
  await page.locator('#file').setInputFiles({
    name: 'replacement.jpg',
    mimeType: 'image/jpeg',
    buffer: image,
  });
  await expect(page.locator('#status')).toContainText('プレビューを確認');
  await page.locator('#identity').check();
  await page.locator('#rights').check();
  await page.getByRole('button', { name: '保存して公開' }).click();
  await expect(page.locator('#status')).toContainText('保存・公開しました');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '公開停止', exact: true }).click();
  await expect(page.locator('#status')).toContainText('非表示にしました');
  expect(
    (await handle(new Request(api + '/public/image/s001'), env)).status,
  ).toBe(404);
  await page.getByRole('button', { name: '登録を削除', exact: true }).click();
  await expect(page.locator('#list button').first()).toContainText('登録削除');
});
