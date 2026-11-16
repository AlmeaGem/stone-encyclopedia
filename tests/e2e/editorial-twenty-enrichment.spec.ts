import { test, expect } from '@playwright/test';
import stones from '../../src/content/stones.json' with { type: 'json' };
import additions from '../../src/content/editorial-wish-expansion.json' with { type: 'json' };
import insights from '../../src/content/editorial-pairing-insights.json' with { type: 'json' };
import first from '../../src/content/editorial-first-five.json' with { type: 'json' };
import second from '../../src/content/editorial-second-five.json' with { type: 'json' };
import third from '../../src/content/editorial-third-five.json' with { type: 'json' };
import fourth from '../../src/content/editorial-fourth-five.json' with { type: 'json' };
const supplements = { ...first, ...second, ...third, ...fourth };

test('fifteen approved pages retain their additions and compact readable pairings', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  expect(Object.keys(additions)).toHaveLength(15);
  for (const id of ['s063', 's126', 's064', 's107', 's108'])
    expect(additions).not.toHaveProperty(id);
  for (const [id, paragraphs] of Object.entries(additions)) {
    const stone = stones.find((item) => item.id === id)!;
    await page.goto(`/stones/${stone.slug}/`);
    if (paragraphs[0])
      await expect(page.locator('#story')).toContainText(paragraphs[0]);
    for (const text of paragraphs.slice(1))
      await expect(page.locator('#story')).toContainText(text);
    for (const text of insights[id as keyof typeof insights].filter(Boolean))
      await expect(page.locator('#pairing')).toContainText(text);
    for (const pair of supplements[id as keyof typeof supplements].pairings) {
      const entry = page.locator('#pairing .manuscript-paragraph').filter({
        has: page.locator('.manuscript-pairing-name').filter({
          hasText: new RegExp(
            `^${pair.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          ),
        }),
      });
      await expect(entry).toHaveCount(1);
      await expect(entry).toContainText(pair.description);
    }
    const first = page
      .locator('#pairing .manuscript-pairings > :is(p, article)')
      .first();
    const label = first.locator('.manuscript-pairing-name');
    const description = first.locator('.manuscript-pairing-description');
    const labelBox = await label.boundingBox();
    const descriptionBox = await description.boundingBox();
    expect(labelBox).toBeTruthy();
    expect(descriptionBox).toBeTruthy();
    expect(labelBox!.height).toBeLessThan(40);
    if (info.project.name === 'mobile')
      expect(descriptionBox!.y).toBeGreaterThanOrEqual(
        labelBox!.y + labelBox!.height,
      );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
