import { test, expect } from '@playwright/test';
import themes from '../../src/content/story-themes.json' with { type: 'json' };
import moonstone from '../../src/content/archives/moonstone.json' with { type: 'json' };
import egyptianAmulets from '../../src/content/archives/egyptian-amulets.json' with { type: 'json' };
import loveAndGemstones from '../../src/content/archives/love-and-gemstones.json' with { type: 'json' };
import stonesWithRainbows from '../../src/content/archives/stones-with-rainbows.json' with { type: 'json' };
import travelers from '../../src/content/archives/travelers-and-protective-stones.json' with { type: 'json' };
const archives = [
  moonstone,
  egyptianAmulets,
  loveAndGemstones,
  stonesWithRainbows,
  travelers,
];
import stones from '../../src/content/stones.json' with { type: 'json' };
import { approvedManuscript } from '../../src/lib/approved-manuscripts';

test('story shelf and five free collections lead to the approved stone pages', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto('/');
  const shelf = page.locator('.story-collection');
  await expect(shelf.locator('.story-collection-card')).toHaveCount(3);
  await expect(page.locator('.archive-all a')).toHaveAttribute(
    'href',
    '/archives/',
  );
  // The archive shelf must not orphan the last character of the moonstone title.
  const moonstoneTitle = shelf.locator(
    '.story-collection-card[href="/archives/moonstone-moonlight/"] strong',
  );
  expect((await moonstoneTitle.textContent())?.replace(/\s/g, '')).toBe(
    '月の光に重ねられた宝石の伝承',
  );
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 900 });
    const lines = moonstoneTitle.locator('.archive-title-line');
    await expect(lines).toHaveText(['月の光に重ねられた', '宝石の伝承']);
    const bounds = await lines.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { y: rect.y, right: rect.right };
      }),
    );
    expect(bounds[1].y).toBeGreaterThan(bounds[0].y);
    expect(bounds.every((rect) => rect.right <= width + 1)).toBe(true);
  }
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
    await page.goto(`/stories/${theme.id}/`);
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
