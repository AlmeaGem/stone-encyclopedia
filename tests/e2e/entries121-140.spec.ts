import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const all = JSON.parse(await readFile('src/content/stones.json', 'utf8'));
const batch = all.slice(120, 140);
test('all details 121-140 support search, category and related navigation without overflow', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const stone of batch) {
      await page.goto(`/stones/${stone.slug}/`);
      await expect(page.locator('h1')).toHaveText(stone.name);
      await expect(page.locator('#quality')).toContainText(stone.quality);
      await expect(page.locator('#story')).toContainText(
        stone.spiritualEffects || stone.symbolism,
      );
      await expect(page.locator('#care')).toContainText(stone.handling);
      await expect(
        page.locator('link[rel="apple-touch-icon"]'),
      ).toHaveAttribute('href', '/apple-touch-icon.png');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      // Check text bounds as well as page overflow, including long names/English text.
      const h1 = await page.locator('h1').boundingBox();
      expect(h1!.x + h1!.width).toBeLessThanOrEqual(width);
      if (
        info.project.name === 'desktop' &&
        [390, 1440].includes(width) &&
        ['s131', 's134', 's135'].includes(stone.id)
      ) {
        await mkdir('docs/screenshots/entries121-140', { recursive: true });
        await page.screenshot({
          path: `docs/screenshots/entries121-140/${stone.id}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  for (const stone of batch) {
    await page.goto('/stones/');
    await page
      .getByRole('searchbox', { name: '石名・英語名・別名' })
      .fill(stone.english);
    const card = page
      .locator(`[data-stone] a[href="/stones/${stone.slug}/"]`)
      .first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('h1')).toHaveText(stone.name);
    const related = all.find((s: { id: string }) => s.id === stone.related[0]);
    await page.locator(`a[href="/stones/${related.slug}/"]`).first().click();
    await expect(page.locator('h1')).toHaveText(related.name);
    await page.goto(`/wishes/${stone.wishes[0]}/`);
    await expect(
      page.locator(`a[href="/stones/${stone.slug}/"]`).first(),
    ).toBeVisible();
  }
});
