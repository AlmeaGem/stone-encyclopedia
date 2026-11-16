import { test, expect } from '@playwright/test';
import drafts from '../../src/content/editorial-third-five.json' with { type: 'json' };
const pages = [
  ['s206', 'morganite'],
  ['s132', 'lapis-lazuli'],
  ['s133', 'labradorite'],
  ['s063', 'moonstone'],
  ['s126', 'larimar'],
] as const;
test('third group preserves all pairing explanations and readable bounds', async ({
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
      const link = page.locator('#pairing a', { hasText: pair.name }).first();
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^\/stones\/[^/]+\/$/);
      expect((await page.request.get(href!)).ok()).toBeTruthy();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test('morganite sections and orange moonstone supplement stay available', async ({
  page,
}) => {
  await page.goto('/stones/morganite/');
  for (const word of ['恋愛の願い①', '恋愛の願い②', '恋愛の願い③'])
    await expect(page.locator('#story')).toContainText(word);
  await page.goto('/stones/moonstone/');
  await expect(page.locator('#orange-moonstone')).toBeVisible();
  await expect(page.locator('body')).toContainText(
    '新しい恋も、新しい未来も、あなたの心が動いた瞬間から始まります。',
  );
});
