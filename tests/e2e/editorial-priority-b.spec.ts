import { test, expect } from '@playwright/test';
import stones from '../../src/content/stones.json' with { type: 'json' };
import copy from '../../src/content/editorial-priority-b.json' with { type: 'json' };
import {
  approvedManuscript,
  manuscriptPairings,
} from '../../src/lib/approved-manuscripts';

test('priority B articles retain approved pairings and display their additions', async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const [id, article] of Object.entries(copy)) {
    const stone = stones.find((item) => item.id === id)!;
    await page.goto(`/stones/${stone.slug}/`);
    const story = page.locator('#story');
    for (const text of [article.story, article.meaning, article.wishes])
      await expect(story).toContainText(text);
    const approved =
      approvedManuscript(id).sections.flatMap(manuscriptPairings);
    const entries = page.locator('#pairing .manuscript-pairings > p');
    await expect(entries).toHaveCount(approved.length);
    for (const pair of approved) {
      const entry = entries.filter({
        has: page.locator('a').filter({ hasText: pair.name }),
      });
      const target = stones.find((item) => item.id === pair.stoneId)!;
      await expect(entry).toHaveCount(1);
      await expect(entry.locator('a')).toHaveAttribute(
        'href',
        `/stones/${target.slug}/`,
      );
      await expect(entry).toContainText(pair.description.replace(/\*\*/g, ''));
      await expect(entry).toContainText(
        article.pairings[pair.name as keyof typeof article.pairings],
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
