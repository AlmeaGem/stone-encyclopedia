import { test, expect } from '@playwright/test';
import themes from '../../src/content/story-themes.json' with { type: 'json' };
import stones from '../../src/content/stones.json' with { type: 'json' };
import { approvedManuscript } from '../../src/lib/approved-manuscripts';

test('story shelf and five free collections lead to the approved stone pages', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto('/');
  const shelf = page.locator('.story-collection');
  await expect(shelf.locator('.story-collection-card')).toHaveCount(5);
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const card of await shelf.locator('.story-collection-card').all()) {
      const box = (await card.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    const cards = await shelf.locator('.story-collection-card').all();
    const a = (await cards[0].boundingBox())!,
      b = (await cards[1].boundingBox())!;
    if (width <= 430) expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
    if (width === 1440) expect(b.x).toBeGreaterThan(a.x);
    if (info.project.name === 'desktop' && [390, 1440].includes(width))
      await shelf.screenshot({
        path: test.info().outputPath(`shelf-${width}.png`),
      });
  }
  for (const theme of themes) {
    const link = shelf.getByRole('link', { name: new RegExp(theme.title) });
    await expect(link).toHaveAttribute('href', `/stories/${theme.id}/`);
    await link.click();
    await expect(page.locator('h1')).toHaveText(theme.title);
    const cards = page.locator('.story-stone-card');
    await expect(cards).toHaveCount(theme.stones.length);
    for (const width of [375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${theme.id} ${width}`,
      ).toBe(true);
      for (const card of await cards.all()) {
        const box = (await card.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      }
      if (
        theme.id === 'love-and-fate' &&
        info.project.name === 'desktop' &&
        [390, 1440].includes(width)
      )
        await page.screenshot({
          path: test.info().outputPath(`theme-${width}.png`),
          fullPage: true,
        });
    }
    for (const [index, id] of theme.stones.entries()) {
      const stone = stones.find((s) => s.id === id)!;
      const card = cards.nth(index);
      await expect(card.locator('h2')).toHaveText(stone.name);
      await expect(card.locator('p')).toHaveText(
        approvedManuscript(id).catchphrase,
      );
      await expect(card.locator('a')).toHaveAttribute(
        'href',
        `/stones/${stone.slug}/`,
      );
      await expect
        .poll(() =>
          card
            .locator('img')
            .evaluate(
              (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
            ),
        )
        .toBe(true);
    }
    await cards.first().locator('a').click();
    await expect(page.locator('h1')).toHaveText(
      stones.find((s) => s.id === theme.stones[0])!.name,
    );
    await page.goBack();
    await expect(page.locator('h1')).toHaveText(theme.title);
    await page.goto('/');
  }
});
