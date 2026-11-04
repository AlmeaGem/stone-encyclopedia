import { test, expect } from '@playwright/test';

test('library saves, persists, removes and ignores unknown IDs at requested sizes', async ({
  page,
}, testInfo) => {
  await page.goto('/stones/rose-quartz/');
  const save = page.getByRole('button', { name: 'ローズクォーツを書架に保存' });
  await expect(save).toBeVisible();
  await save.click();
  await expect(
    page.getByRole('button', { name: 'ローズクォーツを書架から解除' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'ローズクォーツを書架から解除' }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem(
      'almea-stone-library-v1',
      JSON.stringify(['s107', 's999']),
    ),
  );
  await page.goto('/library/');
  const card = page.locator('[data-library-card="s107"]');
  await expect(card).toBeVisible();
  await expect(page.locator('[data-library-card]:visible')).toHaveCount(1);
  await expect(card.locator('a')).toHaveAttribute(
    'href',
    /stones\/rose-quartz\/$/,
  );
  await expect(card.locator('img')).toHaveAttribute('src', /.+/);
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    const button = card.getByRole('button', {
      name: 'ローズクォーツを書架から解除',
    });
    await button.scrollIntoViewIfNeeded();
    const bounds = await button.boundingBox();
    expect(bounds).not.toBeNull();
    const cardBounds = await card.boundingBox();
    expect(cardBounds).not.toBeNull();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
      cardBounds!.y + cardBounds!.height,
    );
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    if (
      testInfo.project.name === 'desktop' &&
      (width === 390 || width === 1440)
    )
      await page.screenshot({
        path: testInfo.outputPath(`library-${width}.png`),
        fullPage: true,
      });
  }
  await card
    .getByRole('button', { name: 'ローズクォーツを書架から解除' })
    .click();
  await expect(page.locator('[data-library-empty]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-library-empty]')).toBeVisible();
});

test('blocked localStorage keeps the catalog readable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto('/library/');
  await expect(page.locator('[data-library-notice]')).toBeVisible();
  await page.getByRole('link', { name: 'すべての石を探す' }).click();
  await expect(page).toHaveURL(/\/stones\/$/);
  await page.goto('/stones/rose-quartz/');
  await expect(
    page.getByRole('heading', { name: 'ローズクォーツ', level: 1 }),
  ).toBeVisible();
  await expect(page.locator('[data-library-notice]')).toBeVisible();
});
