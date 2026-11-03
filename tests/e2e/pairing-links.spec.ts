import { test, expect } from '@playwright/test';
import stones from '../../src/content/stones.json' with { type: 'json' };
import reference from '../fixtures/approved-pairings.json' with { type: 'json' };

test('all 210 pages show the approved pairing names and their exact destinations', async ({
  page,
}) => {
  test.setTimeout(300000);
  for (const stone of stones) {
    await page.goto(`/stones/${stone.slug}/`);
    const expected = reference[stone.id as keyof typeof reference];
    const items = page.locator('#pairing .manuscript-pairings > p');
    await expect(items, stone.id).toHaveCount(expected.length);
    for (let i = 0; i < expected.length; i++) {
      const item = items.nth(i),
        target = expected[i];
      await expect(item).toHaveAttribute('data-pairing-name', target.name);
      await expect(item.locator('.pairing-description')).not.toBeEmpty();
      const link = item.locator('.pairing-name a');
      if (target.slug) {
        await expect(link).toHaveText(target.name);
        await expect(link).toHaveAttribute('href', `/stones/${target.slug}/`);
        await expect(item).toHaveAttribute('data-pairing-id', target.id!);
      } else await expect(link).toHaveCount(0);
    }
    const related = await page
      .locator('.related-grid a[href^="/stones/"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(new Set(related).size, stone.id).toBe(related.length);
  }
});

test('pairing cards wrap and link correctly on mobile and desktop', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of ['s001', 's081', 's205', 's206', 's207', 's208', 's210']) {
      const stone = stones.find((s) => s.id === id)!;
      await page.goto(`/stones/${stone.slug}/`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const items = page.locator('#pairing .manuscript-pairings > p');
      const expected = reference[id as keyof typeof reference];
      await expect(items).toHaveCount(expected.length);
      for (const [i, entry] of expected.entries()) {
        const link = items.nth(i).locator('.pairing-name a');
        if (entry.slug)
          await expect(link).toHaveAttribute('href', `/stones/${entry.slug}/`);
      }
    }
  }
});

test('strawberry quartz and rubellite pairing links open the named stones', async ({
  page,
}) => {
  for (const id of ['s081', 's205'] as const) {
    const stone = stones.find((s) => s.id === id)!;
    const target = reference[id][0];
    const targetStone = stones.find((s) => s.id === target.id)!;
    await page.goto(`/stones/${stone.slug}/`);
    const link = page.locator('#pairing .pairing-name a').first();
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/stones/${target.slug}/$`));
    await expect(page.locator('h1')).toHaveText(targetStone.name);
  }
});
