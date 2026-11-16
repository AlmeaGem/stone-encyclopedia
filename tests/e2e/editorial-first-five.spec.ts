import { test, expect } from '@playwright/test';
import drafts from '../../src/content/editorial-first-five.json' with { type: 'json' };

const pages = [
  ['s041', 'bloodstone'],
  ['s060', 'hawks-eye'],
  ['s052', 'blue-topaz'],
  ['s124', 'blue-lace-agate'],
  ['s096', 'prehnite'],
] as const;

test('five additions and their pairing explanations appear without overflow', async ({
  page,
}) => {
  for (const [id, slug] of pages) {
    await page.goto(`/stones/${slug}/`);
    const manuscript = drafts[id];
    await expect(page.locator('#story')).toContainText(
      manuscript.story.split('\n')[0],
    );
    for (const pair of manuscript.pairings) {
      await expect(page.locator('#pairing')).toContainText(pair.description);
      if (pair.name === 'レッドルチルクォーツ') {
        await expect(
          page.locator('#pairing a', { hasText: pair.name }),
        ).toHaveCount(0);
      } else {
        const link = page.locator('#pairing a', { hasText: pair.name });
        await expect(link.first()).toBeVisible();
        const href = await link.first().getAttribute('href');
        expect(href).toMatch(/^\/stones\/[^/]+\/$/);
        const response = await page.request.get(href!);
        expect(response.ok()).toBeTruthy();
      }
    }
    await expect(page.locator('#care')).toContainText(
      manuscript.care.split('\n')[0],
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('blue tiger eye finds the existing hawks eye page', async ({ page }) => {
  await page.goto('/stones/');
  await page
    .getByRole('searchbox', { name: '石名・英語名・別名' })
    .fill('ブルータイガーアイ');
  await expect(
    page.locator('[data-stone] a[href="/stones/hawks-eye/"]').first(),
  ).toBeVisible();
});
