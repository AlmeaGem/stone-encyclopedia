import { publicStone } from '../../src/lib/public-stone';
import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const stones = JSON.parse(await readFile('src/content/stones.json', 'utf8'))
  .map(publicStone)
  .slice(20, 40);
test('entries 21-40 preserve names, source links and responsive detail sections', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const stone of stones) {
      await page.goto('/stones/' + stone.slug + '/');
      await expect(page.locator('h1')).toHaveText(stone.name);
      await expect(page.locator('#nature')).toContainText(
        stone.characteristics,
      );
      await expect(page.locator('#story')).toContainText(
        stone.spiritualEffects || stone.symbolism,
      );
      await expect(page.locator('#pairing')).toBeVisible();
      if (stone.legendSourceUrl) {
        await expect(
          page.locator('#story a').filter({ hasText: '来歴・伝承の参考資料' }),
        ).toHaveAttribute('href', stone.legendSourceUrl);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (
        info.project.name === 'desktop' &&
        [390, 1440].includes(width) &&
        ['s028', 's032', 's038'].includes(stone.id)
      ) {
        await mkdir('docs/screenshots/entries21-40', { recursive: true });
        await page.screenshot({
          path: `docs/screenshots/entries21-40/${stone.id}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
});
