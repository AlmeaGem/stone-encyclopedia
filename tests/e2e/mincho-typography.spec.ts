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
    expect(
      await page.evaluate(
        () =>
          document.fonts.check('500 20px "Shippori Mincho"', '天然石') &&
          document.fonts.check('400 15px "Noto Serif JP"', '天然石'),
      ),
    ).toBe(true);
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
