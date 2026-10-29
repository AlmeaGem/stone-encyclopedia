import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const firstTwenty = JSON.parse(
  await readFile('src/content/stones.json', 'utf8'),
).slice(0, 20);
test('all twenty detail pages separate scientific facts, stories and editorial pairings', async ({
  page,
}, info) => {
  for (const stone of firstTwenty) {
    await page.goto('/stones/' + stone.slug + '/');
    await expect(page.locator('h1')).toHaveText(stone.name);
    await expect(page.locator('#nature')).toContainText(stone.characteristics);
    await expect(page.locator('#story')).toContainText(
      '鉱物の性質とは分けてお読みください',
    );
    await expect(page.locator('#story')).toContainText(stone.legend);
    await expect(page.locator('#story')).toContainText(stone.spiritualEffects);
    const link = page
      .locator('#story a')
      .filter({ hasText: '来歴・伝承の参考資料' });
    await expect(link).toHaveAttribute('href', stone.legendSourceUrl);
    await expect(page.locator('#pairing')).toContainText('ALMÉA GEMの提案');
    await expect(page.locator('#pairing .tag-list a')).toHaveCount(
      stone.synergyStoneIds.length,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of ['s006', 's007', 's011', 's015']) {
      const stone = firstTwenty.find((s: any) => s.id === id);
      await page.goto('/stones/' + stone.slug + '/');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (
        info.project.name === 'desktop' &&
        [390, 1440].includes(width) &&
        id === 's015'
      ) {
        await mkdir('docs/screenshots/first20-audit', { recursive: true });
        await page.locator('#story').screenshot({
          path: 'docs/screenshots/first20-audit/onyx-story-' + width + '.png',
        });
        await page.locator('#pairing').screenshot({
          path: 'docs/screenshots/first20-audit/onyx-pairing-' + width + '.png',
        });
      }
    }
  }
});
