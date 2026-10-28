import { test, expect } from '@playwright/test';
import { mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import sharp from 'sharp';
import { startEditor } from '../../scripts/admin-server';
let root: string, server: Server, url: string;
test.beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'almea-manual-ui-'));
  await cp('src/content', join(root, 'src/content'), { recursive: true });
  await writeFile(join(root, 'src/content/images.json'), '[]\n');
  server = await startEditor(
    root,
    'manual-browser-fixture-passphrase',
    0,
    async () => {
      throw new Error('Manual flow must not download external images');
    },
  );
  const address = server.address();
  url = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});
test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await rm(root, { recursive: true, force: true });
});
test('Mac-style file selection, provenance preview and one-click adoption work with automatic search closed', async ({
  page,
}) => {
  await page.goto(url + '/login');
  await page
    .locator('input[type=password]')
    .fill('manual-browser-fixture-passphrase');
  await page.locator('button').click();
  await page.locator('[data-tab=images]').click();
  await expect(page.locator('#auto-search')).not.toHaveAttribute('open');
  await expect(page.locator('#photo-overview .photo-row')).toHaveCount(210);
  await page.locator('#image-stone').selectOption('s107');
  const bytes = await sharp({
    create: { width: 420, height: 280, channels: 3, background: '#c6a4b2' },
  })
    .jpeg()
    .toBuffer();
  await page.locator('#photo-file').setInputFiles({
    name: 'mac-rose-quartz.jpg',
    mimeType: 'image/jpeg',
    buffer: bytes,
  });
  await page.locator('#upload-license').selectOption('CC BY-SA 4.0');
  await page.locator('#upload-author').fill('SYNTHETIC TEST AUTHOR');
  await page
    .locator('#upload-source')
    .fill('https://commons.wikimedia.org/wiki/File:Manual_fixture.jpg');
  await page
    .locator('#upload-original')
    .fill('https://upload.wikimedia.org/manual_fixture.jpg');
  await page.locator('#upload-credit').fill('Synthetic fixture credit');
  await expect(page.locator('#upload-license-url')).toHaveValue(
    'https://creativecommons.org/licenses/by-sa/4.0/',
  );
  await expect
    .poll(() =>
      page
        .locator('#manual-preview-image')
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (test.info().project.name === 'desktop' && [390, 1440].includes(width))
      await page.locator('#manual-upload').screenshot({
        path: `docs/screenshots/manual-photo/form-fixture-${width}.png`,
      });
  }
  await page.locator('#manual-identity').check();
  await page.locator('#manual-rights').check();
  await page.locator('#manual-adopt').click();
  await expect(page.locator('#status')).toContainText('代表写真として採用');
  await expect(page.locator('#manual-adopt')).toBeDisabled();
  const state = await (await page.request.get(url + '/api/state')).json();
  expect(state.candidates).toHaveLength(1);
  expect(state.candidates[0].originalUrl).toBe(
    'https://upload.wikimedia.org/manual_fixture.jpg',
  );
  expect(state.images).toHaveLength(0);
  page.once('dialog', (d) => d.accept());
  await page.locator('#apply-photos').click();
  await expect(page.locator('#status')).toContainText('1種類を反映');
  const after = await (await page.request.get(url + '/api/state')).json();
  expect(after.images[0].license).toBe('CC BY-SA 4.0');
  expect(after.images[0].pageUrl).toContain('File:Manual_fixture.jpg');
  await expect(page.locator('#photo-summary')).toContainText('登録済み 1種類');
});
