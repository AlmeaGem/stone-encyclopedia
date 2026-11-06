import { test, expect } from '@playwright/test';

test('archive labels and responsive homepage cards remain consistent', async ({ page }) => {
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.story-collection-heading h2')).toHaveText(
      '宝石の歴史と物語',
    );
    const cards = page.locator('.story-collection .story-collection-card');
    await expect(cards).toHaveCount(3);
    const first = (await cards.nth(0).boundingBox())!;
    const third = (await cards.nth(2).boundingBox())!;
    if (width >= 960) expect(Math.abs(first.y - third.y)).toBeLessThan(2);
    if (width <= 640) expect(third.y).toBeGreaterThan(first.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }

  await page.goto('/archives/moonstone-moonlight/');
  await expect(
    page.getByRole('navigation', { name: 'パンくず' }),
  ).toContainText('宝石の歴史と物語');
  await expect(
    page.getByRole('navigation', { name: '宝石の歴史と物語の他の記事' }),
  ).toBeVisible();
});

test('mobile history buttons remain compact, tappable and clear of the footer', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/archives/egyptian-amulets/');
    const nav = page.locator('.history-navigation');
    const style = await nav.evaluate((element) => ({
      position: getComputedStyle(element).position,
      background: getComputedStyle(element).backgroundColor,
    }));
    expect(style.position).toBe(width < 768 ? 'fixed' : 'static');
    const buttons = await nav.getByRole('button').all();
    for (const button of buttons) {
      const bounds = (await button.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      if (width < 768) expect(bounds.width).toBeLessThanOrEqual(180);
    }
    if (width < 768) {
      expect(style.background).toBe('rgba(0, 0, 0, 0)');
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight),
      );
      const footer = (await page.locator('.site-footer').boundingBox())!;
      const bar = (await nav.boundingBox())!;
      expect(footer.y + footer.height).toBeLessThanOrEqual(bar.y);
    }
  }
});
