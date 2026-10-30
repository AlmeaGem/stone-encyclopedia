import { test, expect } from '@playwright/test';
import { mkdtemp, cp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import sharp from 'sharp';
import { startEditor } from '../../scripts/admin-server';
let root: string, server: Server, url: string;
test.beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'almea-bulk-ui-'));
  await cp('src/content', join(root, 'src/content'), { recursive: true });
  await cp('assets/approved-images', join(root, 'assets/approved-images'), {
    recursive: true,
  });
  server = await startEditor(
    root,
    'bulk-browser-fixture-passphrase',
    0,
    async () => {
      throw Error('No external requests in manual batch');
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
test('uploads ten images, selects eight, confirms, adopts and applies once without overwriting existing photos', async ({
  page,
}, info) => {
  const before = await readFile(join(root, 'src/content/images.json'), 'utf8');
  await page.goto(url + '/login');
  await page
    .locator('input[type=password]')
    .fill('bulk-browser-fixture-passphrase');
  await page.locator('button').click();
  await page.locator('[data-tab=images]').click();
  const image = await sharp({
    create: { width: 160, height: 120, channels: 3, background: '#ba9aaf' },
  })
    .png()
    .toBuffer();
  await page.locator('#bulk-files').setInputFiles(
    Array.from({ length: 10 }, (_, i) => ({
      name: 'stone-' + i + '.png',
      mimeType: 'image/png',
      buffer: image,
    })),
  );
  const rows = page.locator('#bulk-upload-rows .bulk-card');
  await expect(rows).toHaveCount(10);
  for (let i = 0; i < 10; i++) {
    const row = rows.nth(i);
    await expect(row.getByLabel('登録先の石')).toHaveValue('');
    await row
      .getByLabel('登録先の石')
      .selectOption('s' + String(i + 3).padStart(3, '0'));
    await row
      .getByLabel('写真区分')
      .selectOption(i % 2 ? 'ai-generated' : 'real-photo');
    await row
      .getByLabel('権利の種類')
      .selectOption(i % 2 ? 'AI-generated' : 'Own photo');
    await row.getByLabel('撮影者・権利者（必須）').fill('Test author');
    await row
      .getByLabel('権利・許諾記録（非公開）')
      .fill('自社撮影または生成画像の利用条件確認済みテスト');
  }
  await page.locator('#bulk-save-uploads').click();
  await expect(page.locator('#bulk-upload-result')).toContainText(
    '仮保存 10件',
  );
  await page.reload();
  await page.locator('[data-tab=images]').click();
  await expect(page.locator('#bulk-candidates .bulk-card')).toHaveCount(10);
  await page.locator('#bulk-select-all').click();
  const checks = page.locator('#bulk-candidates input[type=checkbox]');
  await checks.nth(8).uncheck();
  await checks.nth(9).uncheck();
  await expect(page.locator('#bulk-counts')).toContainText('選択 8件');
  await page.locator('#bulk-identity').check();
  await page.locator('#bulk-rights').check();
  await page.locator('#bulk-preview').click();
  await expect(page.locator('#bulk-confirm-results p')).toHaveCount(8);
  await page.locator('#bulk-confirm-adopt').click();
  await expect(page.locator('#bulk-job')).toContainText('採用済み 8件');
  await expect(page.locator('#bulk-job')).toContainText('未採用（全候補） 2件');
  expect(await readFile(join(root, 'src/content/images.json'), 'utf8')).toBe(
    before,
  );
  await page.reload();
  await page.locator('[data-tab=images]').click();
  await expect(page.locator('#bulk-counts')).toContainText(
    '承認済み・反映待ち 8',
  );
  await page.locator('#bulk-filter').selectOption('all');
  await expect(page.locator('#bulk-candidates .bulk-card')).toHaveCount(10);
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (info.project.name === 'desktop' && [390, 1440].includes(width)) {
      const { mkdir } = await import('node:fs/promises');
      await mkdir('docs/screenshots/bulk-photos', { recursive: true });
      await page
        .locator('#bulk-photos')
        .evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({
        path: 'docs/screenshots/bulk-photos/viewport-' + width + '.png',
      });
      await page.locator('#bulk-photos').screenshot({
        path: 'docs/screenshots/bulk-photos/candidates-' + width + '.png',
      });
    }
  }
  page.on('dialog', (d) => d.accept());
  await page.locator('#bulk-apply').click();
  await expect(page.locator('#status')).toContainText('8件を図鑑データへ反映');
  const after = JSON.parse(
    await readFile(join(root, 'src/content/images.json'), 'utf8'),
  );
  for (const original of JSON.parse(before))
    expect(after.find((p: any) => p.stoneId === original.stoneId)).toEqual(
      original,
    );
  expect(after).toHaveLength(JSON.parse(before).length + 8);
  await expect(page.locator('#bulk-counts')).toContainText(
    '図鑑データへ反映済み 8',
  );
  await expect(page.locator('#bulk-candidates')).toContainText(
    '公開サイトへ反映待ち',
  );
});
