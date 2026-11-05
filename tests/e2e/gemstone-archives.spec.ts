import { test, expect } from '@playwright/test';
import moonstone from '../../src/content/archives/moonstone.json' with { type: 'json' };
import egyptianAmulets from '../../src/content/archives/egyptian-amulets.json' with { type: 'json' };
import loveAndGemstones from '../../src/content/archives/love-and-gemstones.json' with { type: 'json' };
import stonesWithRainbows from '../../src/content/archives/stones-with-rainbows.json' with { type: 'json' };
import stones from '../../src/content/stones.json' with { type: 'json' };
const archives = [
  moonstone,
  egyptianAmulets,
  loveAndGemstones,
  stonesWithRainbows,
];

test('archive articles and original themes remain reachable and readable', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto('/');
  const shelf = page.locator('.story-collection');
  await expect(
    shelf.getByRole('heading', { name: '石の伝承図書館' }),
  ).toBeVisible();
  for (const article of archives) {
    await expect(
      shelf.getByRole('link', { name: new RegExp(article.title) }),
    ).toHaveAttribute('href', `/archives/${article.id}/`);
    await page.goto(`/archives/${article.id}/`);
    await expect(page.locator('h1')).toHaveText(article.title);
    await expect(page.locator('.archive-motif')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    for (const [index, section] of article.sections.entries()) {
      const paragraphs = page
        .locator('.archive-chapter')
        .nth(index)
        .locator('p:not(.archive-citations)');
      await expect(paragraphs).toHaveText(section.paragraphs);
    }
    await expect(
      page.locator('.archive-chapter').first().locator('p').first(),
    ).toHaveText(article.sections[0].paragraphs[0]);
    for (const source of article.sources)
      await expect(
        page.locator(`#archive-source-${source.id} a`),
      ).toHaveAttribute('href', source.url);
    for (const id of article.stoneIds) {
      const stone = stones.find((item) => item.id === id)!;
      await expect(
        page.locator('.story-stone-card a').filter({ hasText: stone.name }),
      ).toHaveAttribute('href', `/stones/${stone.slug}/`);
    }
    for (const width of [375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (info.project.name === 'desktop' && [390, 1440].includes(width))
        await page.screenshot({
          path: info.outputPath(`${article.id}-${width}.png`),
          fullPage: true,
        });
    }
    await page.goto('/');
  }
  await page.goto('/archives/');
  await expect(
    page.getByRole('heading', { level: 1, name: '石の伝承図書館' }),
  ).toBeVisible();
  await expect(page.locator('.story-collection-card')).toHaveCount(
    archives.length,
  );
});
