import { test, expect } from '@playwright/test';
import stones from '../../src/content/stones.json' with { type: 'json' };
import images from '../../src/content/images.json' with { type: 'json' };
import { approvedManuscript } from '../../src/lib/approved-manuscripts';
import { dailyIndex, dailyOrder } from '../../src/lib/daily-discovery';

const order = dailyOrder(stones.map((stone) => stone.id));
test('daily card matches the catalog and changes at Japan midnight', async ({
  page,
}, info) => {
  const before = new Date('2026-11-04T14:59:59.000Z');
  await page.clock.install({ time: before });
  await page.clock.pauseAt(before);
  await page.goto('/');
  const card = page.locator('.daily-discovery');
  const catalog = JSON.parse((await card.getAttribute('data-daily-catalog'))!);
  expect(catalog).toHaveLength(210);
  for (const entry of catalog) {
    const stone = stones.find((item) => item.id === entry.id)!;
    const image = images.find((item) => item.stoneId === entry.id)!;
    expect(entry.name).toBe(stone.name);
    expect(entry.href).toBe(`/stones/${stone.slug}/`);
    expect(entry.image).toBe(image.localPath);
    expect(entry.catchphrase).toBe(approvedManuscript(entry.id).catchphrase);
  }
  const check = async (time: number) => {
    const stone = stones.find((s) => s.id === order[dailyIndex(time, 210)])!;
    await expect(card.locator('[data-daily-name]')).toHaveText(stone.name);
    await expect(card.locator('[data-daily-id]')).toHaveText(
      stone.id.toUpperCase(),
    );
    await expect(card.locator('[data-daily-catchphrase]')).toHaveText(
      approvedManuscript(stone.id).catchphrase,
    );
    await expect(card.locator('[data-daily-link]')).toHaveAttribute(
      'href',
      `/stones/${stone.slug}/`,
    );
    const image = card.locator('img');
    await expect(image).toHaveAttribute('src', /\/images\//);
    await expect
      .poll(() =>
        image.evaluate(
          (i: HTMLImageElement) => i.complete && i.naturalWidth > 0,
        ),
      )
      .toBe(true);
  };
  await check(before.getTime());
  await page.clock.fastForward(1200);
  await check(before.getTime() + 1200);
  for (const width of info.project.name === 'mobile'
    ? [375, 390, 430]
    : [1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const box = (await card.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(width);
    if (width <= 430) {
      const selectors = [
        '.daily-eyebrow',
        '#daily-title',
        '.daily-intro',
        '.daily-image',
        '[data-daily-id]',
        '[data-daily-name]',
        '[data-daily-catchphrase]',
        '[data-daily-link]',
      ];
      const boxes = await Promise.all(
        selectors.map((selector) => card.locator(selector).boundingBox()),
      );
      for (let i = 1; i < boxes.length; i++)
        expect(boxes[i]!.y).toBeGreaterThanOrEqual(
          boxes[i - 1]!.y + boxes[i - 1]!.height - 1,
        );
      expect(boxes[3]!.width).toBeGreaterThan(width * 0.65);
      expect(Math.abs(boxes[3]!.width - boxes[3]!.height)).toBeLessThan(2);
      await expect(page.locator('.history-navigation')).toBeHidden();
      await expect(
        page.getByRole('searchbox', { name: '石名・英語名・別名' }),
      ).toBeVisible();
    }
    if (width === 390 || width === 1440)
      await card.screenshot({
        path: test.info().outputPath(`daily-${width}.png`),
      });
  }
  await card.locator('[data-daily-link]').click();
  await expect(page.locator('h1')).toHaveText(
    stones.find(
      (s) => s.id === order[dailyIndex(before.getTime() + 1200, 210)],
    )!.name,
  );
});

test('a linked approved stone is available without JavaScript', async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport:
      info.project.name === 'mobile'
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto('/');
  const card = page.locator('.daily-discovery');
  const fallback = stones.find((s) => s.id === order[0])!;
  await expect(card.locator('[data-daily-name]')).toHaveText(fallback.name);
  await expect(card.locator('[data-daily-link]')).toHaveAttribute(
    'href',
    `/stones/${fallback.slug}/`,
  );
  await expect(card.locator('.daily-noscript')).toContainText('図鑑から一石');
  await card.locator('[data-daily-link]').click();
  await expect(page.locator('h1')).toHaveText(fallback.name);
  await context.close();
});
