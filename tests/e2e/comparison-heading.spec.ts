import { expect, test } from '@playwright/test';

test('report comparison phrase stays together at the requested widths', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/diagnosis/');
    const heading = page.locator('#service-comparison-title');
    await expect(heading).toHaveText(
      '無料でできること・790円で受け取れること',
      { useInnerText: true },
    );
    const phrase = heading.locator('.comparison-phrase');
    await expect(phrase).toHaveText('790円で受け取れること');
    const bounds = await phrase.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = [...range.getClientRects()];
      const box = element.getBoundingClientRect();
      return {
        lines: new Set(rects.map((rect) => Math.round(rect.top))).size,
        left: box.left,
        right: box.right,
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      };
    });
    expect(bounds.lines).toBe(1);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.width);
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
  }
});
