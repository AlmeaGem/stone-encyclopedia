import { test, expect } from '@playwright/test';

test('editorial headings retain a clear hierarchy and line-level markers at six widths', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/stones/chiastolite/');
    const styles = await page.locator('#story').evaluate((section) => {
      const h2 = section.querySelector('h2')!;
      const h3 = section.querySelector('h3')!;
      const p = section.querySelector('.prose-lines')!;
      const marker = h2.querySelector('.heading-mark')!;
      const h2Style = getComputedStyle(h2);
      const h3Style = getComputedStyle(h3);
      const markerStyle = getComputedStyle(marker);
      const range = document.createRange();
      range.selectNodeContents(marker);
      return {
        h2: parseFloat(h2Style.fontSize),
        h3: parseFloat(h3Style.fontSize),
        body: parseFloat(getComputedStyle(p).fontSize),
        weight: h2Style.fontWeight,
        rule: h3Style.borderLeftWidth,
        padding: h3Style.paddingLeft,
        marker: markerStyle.backgroundImage,
        clone: markerStyle.getPropertyValue('box-decoration-break'),
        inline: markerStyle.display,
        rects: [...range.getClientRects()].map((r) => ({
          left: r.left,
          right: r.right,
        })),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(styles.h2).toBeGreaterThanOrEqual(26);
    expect(styles.h2).toBeLessThanOrEqual(34);
    expect(styles.h3).toBeGreaterThanOrEqual(19);
    expect(styles.h3).toBeLessThanOrEqual(23);
    expect(styles.h2).toBeGreaterThan(styles.h3);
    expect(styles.h3).toBeGreaterThan(styles.body);
    expect(styles.weight).toBe('600');
    expect(styles.rule).toBe('3px');
    expect(styles.padding).toBe('12px');
    expect(styles.marker).toContain('linear-gradient');
    expect(styles.clone).toBe('clone');
    expect(styles.inline).toBe('inline');
    expect(styles.overflow).toBe(false);
    expect(styles.rects.every((r) => r.left >= 0 && r.right <= width)).toBe(
      true,
    );
    for (const link of await page.locator('.detail-toc a').all()) {
      await expect(link).toHaveAttribute('href', /^#/);
      const bounds = await link.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    // Cards and functional headings must not acquire editorial decoration.
    expect(await page.locator('.stone-card .heading-mark').count()).toBe(0);
    await page.goto('/');
    const homeTitles = page.locator('.section-heading h2.section-title');
    await expect(homeTitles).toHaveCount(2);
    for (const heading of await homeTitles.all()) {
      expect(
        await heading.evaluate((el) =>
          parseFloat(getComputedStyle(el).fontSize),
        ),
      ).toBeGreaterThanOrEqual(26);
      expect(
        await heading.evaluate((el) => getComputedStyle(el).fontWeight),
      ).toBe('600');
    }
    expect(await page.locator('.home-search .heading-mark').count()).toBe(0);
  }
});
