import { test, expect } from '@playwright/test';

test('public headings and text use the intended fonts and weights', async ({
  page,
}) => {
  for (const path of ['/', '/stones/', '/stones/star-rose-quartz/']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const styles = await page.locator('h1, h2, h3').evaluateAll((nodes) =>
      nodes.map((node) => ({
        family: getComputedStyle(node).fontFamily,
        weight: getComputedStyle(node).fontWeight,
      })),
    );
    expect(styles.length).toBeGreaterThan(0);
    for (const style of styles) {
      expect(style.family).toContain('Shippori Mincho');
      expect(style.weight).toBe('500');
    }
    expect(
      await page
        .locator('body')
        .evaluate((node) => getComputedStyle(node).fontFamily),
    ).toContain('Noto Serif JP');
    // `ready` covers only subsets needed for the current layout. Explicitly
    // request each Japanese glyph so an unused unicode-range isn't mistaken
    // for a failed font on a different page or runner.
    const fonts = await page.evaluate(async () => {
      const results = [];
      for (const [family, weight] of [
        ['Shippori Mincho', '400'],
        ['Shippori Mincho', '500'],
        ['Noto Serif JP', '400'],
        ['Noto Serif JP', '500'],
        ['Noto Serif JP', '600'],
      ]) {
        const descriptor = `${weight} 20px "${family}"`;
        for (const glyph of '天然石') {
          const faces = await document.fonts.load(descriptor, glyph);
          results.push({
            family,
            weight,
            glyph,
            faces: faces.map((face) => ({
              family: face.family.replace(/["']/g, ''),
              weight: face.weight,
              status: face.status,
            })),
            ready: document.fonts.check(descriptor, glyph),
          });
        }
      }
      return results;
    });
    for (const result of fonts) {
      expect(
        result.faces.length,
        `${path}: ${result.family} ${result.weight} ${result.glyph}`,
      ).toBeGreaterThan(0);
      expect(result.ready).toBe(true);
      for (const face of result.faces) {
        expect(face.family).toBe(result.family);
        expect(face.weight).toBe(result.weight);
        expect(face.status).toBe('loaded');
      }
    }
  }
  await page.goto('/stones/star-rose-quartz/');
  await expect(page.locator('.manuscript-catchphrase')).toHaveCSS(
    'font-weight',
    '400',
  );
  await expect(page.locator('.manuscript-paragraph').first()).toHaveCSS(
    'font-weight',
    '400',
  );
});

test('a failed Japanese font download is detected', async ({ page }) => {
  await page.route(/shippori-mincho-.*\.woff2?(?:\?.*)?$/, (route) =>
    route.abort(),
  );
  await page.goto('/');
  const failure = await page.evaluate(async () => {
    try {
      await document.fonts.load('500 20px "Shippori Mincho"', '天然石');
      return false;
    } catch {
      return true;
    }
  });
  expect(failure).toBe(true);
});
