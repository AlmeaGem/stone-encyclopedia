import { test, expect } from '@playwright/test';
import drafts from '../../src/content/editorial-second-five.json' with { type: 'json' };
const pages = [
  ['s097', 'fluorite'],
  ['s017', 'hematite'],
  ['s101', 'peridot'],
  ['s175', 'mother-of-pearl'],
  ['s103', 'malachite'],
] as const;

test('five additional manuscripts preserve pairings and mobile bounds', async ({
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
      if (pair.name === 'ブラックスピネル') {
        await expect(link).toHaveCount(0);
      } else {
        await expect(link.first()).toBeVisible();
        const href = await link.first().getAttribute('href');
        expect(href).toMatch(/^\/stones\/[^/]+\/(#orange-moonstone)?$/);
        if (pair.name === 'オレンジムーンストーン')
          expect(href).toContain('#orange-moonstone');
        expect((await page.request.get(href!)).ok()).toBeTruthy();
      }
    }
    await expect(page.locator('#care')).toContainText(item.care.split('\n')[0]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
