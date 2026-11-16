import { test, expect } from '@playwright/test';
import drafts from '../../src/content/editorial-fourth-five.json' with { type: 'json' };
const pages = [
  ['s064', 'rutilated-quartz'],
  ['s107', 'rose-quartz'],
  ['s108', 'rhodochrosite'],
  ['s109', 'rhodonite'],
  ['s059', 'bulls-eye'],
] as const;
test('fourth group keeps pairings, links and readable bounds', async ({
  page,
}) => {
  for (const [id, slug] of pages) {
    await page.goto(`/stones/${slug}/`);
    const item = drafts[id];
    await expect(page.locator('#story')).toContainText(
      item.story.split('\n')[0],
    );
    for (const pair of item.pairings) {
      await expect(page.locator('#pairing')).toContainText(pair.description);
      const link = page.locator('#pairing a', { hasText: pair.name });
      if (pair.name === 'レッドルチルクォーツ')
        await expect(link).toHaveCount(0);
      else {
        await expect(link.first()).toBeVisible();
        const href = await link.first().getAttribute('href');
        expect(href).toMatch(/^\/stones\/[^/]+\/$/);
        expect((await page.request.get(href!)).ok()).toBeTruthy();
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test('red and blue tiger eye aliases find their existing pages', async ({
  page,
}) => {
  for (const [alias, slug] of [
    ['レッドタイガーアイ', 'bulls-eye'],
    ['ブルータイガーアイ', 'hawks-eye'],
  ]) {
    await page.goto('/stones/');
    await page
      .getByRole('searchbox', { name: '石名・英語名・別名' })
      .fill(alias);
    await expect(
      page.locator(`[data-stone] a[href="/stones/${slug}/"]`).first(),
    ).toBeVisible();
  }
});
