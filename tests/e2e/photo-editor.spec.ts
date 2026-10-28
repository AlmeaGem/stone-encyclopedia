import { test, expect } from '@playwright/test';
test('private photo editor offers thumbnails, source review and staged adoption without JSON editing', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4322/login');
  await page
    .locator('input[type=password]')
    .fill('browser-fixture-only-passphrase-32');
  await page.locator('button').click();
  await page.locator('[data-tab=images]').click();
  await expect(page.locator('#photo-overview .photo-row')).toHaveCount(210);
  await page.locator('#select-ten').click();
  await expect(page.locator('#collection-plan')).toContainText('対象 10種類');
  const image = page.locator('.photo-preview img').first();
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page.locator('.photo-preview').first().click();
  await expect(page.locator('#photo-dialog')).toBeVisible();
  await expect(page.locator('#photo-dialog-info')).toContainText(
    'TEST FIXTURE',
  );
  if (test.info().project.name === 'desktop')
    await page.locator('#photo-dialog').screenshot({
      path: test.info().outputPath('expanded-fixture.png'),
    });
  await page.locator('#close-photo-dialog').click();
  await page
    .getByRole('button', { name: 'この写真を選ぶ', exact: true })
    .first()
    .click();
  await expect(page.locator('#photo-author')).toHaveValue(
    'TEST FIXTURE — NOT A REAL PHOTO',
  );
  await page.locator('#identity').check();
  await page.locator('#rights').check();
  page.once('dialog', (d) => d.accept());
  await page.locator('#approve').click();
  await expect(page.locator('#status')).toContainText(
    'まだ公開用データへ反映していません',
  );
  await expect(page.locator('#photo-summary')).toContainText(
    '承認済み・反映待ち',
  );
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    if (test.info().project.name === 'desktop' && [390, 1440].includes(width))
      await page.locator('#images').screenshot({
        path: test.info().outputPath(`gallery-fixture-${width}.png`),
      });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
