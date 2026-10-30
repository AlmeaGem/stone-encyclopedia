import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const categories = JSON.parse(
  readFileSync('src/content/categories.json', 'utf8'),
) as { id: string }[];

test('all category pills center labels without reserving unchecked marker space', async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const category of categories) {
      await page.goto(`/wishes/${category.id}/`);
      const pills = page.locator('[data-wish-tag]');
      const errors = await pills.evaluateAll((buttons) =>
        buttons.flatMap((button) => {
          const rect = button.getBoundingClientRect();
          const label = button
            .querySelector('.wish-label')!
            .getBoundingClientRect();
          const marker = button.querySelector('.wish-check')!;
          return [
            ...(Math.abs(
              (label.left + label.right - rect.left - rect.right) / 2,
            ) > 1
              ? ['label off center']
              : []),
            ...(getComputedStyle(marker).display !== 'none'
              ? ['unchecked marker occupies space']
              : []),
            ...(rect.right > innerWidth || rect.left < 0
              ? ['pill overflows']
              : []),
          ];
        }),
      );
      expect(errors, `${category.id} ${width}`).toEqual([]);
      if (await pills.count()) {
        const first = pills.first();
        const before = await first.boundingBox();
        await first.click();
        await expect(first).toHaveAttribute('aria-pressed', 'true');
        const after = await first.boundingBox();
        expect(after!.width).toBeCloseTo(before!.width, 1);
        const offset = await first.evaluate((button) => {
          const b = button.getBoundingClientRect(),
            l = button.querySelector('.wish-label')!.getBoundingClientRect();
          return Math.abs((l.left + l.right - b.left - b.right) / 2);
        });
        expect(offset).toBeLessThanOrEqual(1);
        await first.click();
        await expect(first).toHaveAttribute('aria-pressed', 'false');
      }
    }
  }
});
