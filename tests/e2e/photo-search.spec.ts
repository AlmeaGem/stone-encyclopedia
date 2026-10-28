import { test, expect } from '@playwright/test';
import sharp from 'sharp';
async function login(page: any) {
  await page.goto('http://127.0.0.1:4322/login');
  await page
    .locator('input[type=password]')
    .fill('browser-fixture-only-passphrase-32');
  await page.locator('button').click();
  await page.locator('[data-tab=images]').click();
  await page
    .locator('#auto-search')
    .evaluate((el: HTMLDetailsElement) => (el.open = true));
}
test('sphere search defaults, error reasons and official metadata retry work without adopting candidates', async ({
  page,
}) => {
  await login(page);
  await expect(page.locator('#photo-search-mode')).toHaveValue('sphere');
  await page
    .locator('#image-stone')
    .selectOption(test.info().project.name === 'desktop' ? 's008' : 's007');
  await page.locator('.photo-preview').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.image-error')).toContainText('403');
  await expect(
    page.getByRole('button', { name: 'この写真を選ぶ', exact: true }),
  ).toBeDisabled();
  if (test.info().project.name === 'desktop')
    await page
      .locator('#candidates')
      .screenshot({ path: test.info().outputPath('error-fixture.png') });
  await page.getByRole('button', { name: '画像を再取得', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'この写真を選ぶ', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('.candidate-group')).toHaveText('形状未確認');
  await page.locator('#select-ten').click();
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (test.info().project.name === 'desktop' && [390, 1440].includes(width))
      await page.locator('#images').screenshot({
        path: test.info().outputPath(`after-fixture-${width}.png`),
      });
  }
});
test('manual photo upload and confirmed shape filtering need no JSON or public image service', async ({
  page,
}) => {
  await login(page);
  await page
    .locator('#image-stone')
    .selectOption(test.info().project.name === 'desktop' ? 's010' : 's009');
  await page.locator('#upload-license').selectOption('Own photo');
  const bytes = await sharp({
    create: { width: 80, height: 60, channels: 3, background: '#b89aaa' },
  })
    .png()
    .toBuffer();
  await page.locator('#photo-file').setInputFiles({
    name: 'owned-test.png',
    mimeType: 'image/png',
    buffer: bytes,
  });
  await page.locator('#upload-author').fill('TEST OWNER');
  await page
    .locator('#upload-note')
    .fill(
      'PRIVATE TEST OWNERSHIP: original photo, commercial publication and image resizing permitted',
    );
  await page.locator('#upload-photo').click();
  await expect(page.locator('#status')).toContainText('非公開候補へ追加');
  const card = page
    .locator('.candidate')
    .filter({ hasText: '撮影者 TEST OWNER' })
    .last();
  await card.locator('img').scrollIntoViewIfNeeded();
  await expect(card.locator('img')).toBeVisible();
  await card
    .getByRole('button', { name: 'この写真を選ぶ', exact: true })
    .click();
  await page.locator('#photo-shape').selectOption('sphere');
  await page.locator('#save-candidate').click();
  await expect(page.locator('#status')).toContainText('候補を保存');
  await page.locator('#photo-shape-filter').selectOption('sphere');
  await expect(page.locator('.candidate-group')).toHaveText('丸玉・スフィア');
  await expect(page.locator('#candidates .candidate')).toHaveCount(1);
  await page.locator('#photo-shape-filter').selectOption('rough');
  await expect(page.locator('#candidates .candidate')).toHaveCount(0);
});
