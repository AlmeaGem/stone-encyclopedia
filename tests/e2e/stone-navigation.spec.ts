import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const stones = (
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')) as {
    id: string;
    slug: string;
    name: string;
  }[]
).sort((a, b) => a.id.localeCompare(b.id));
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const url = (slug: string) => `${base}stones/${slug}/`;

test('all 210 pages expose correct fixed-ID links without wrapping at either end', async ({
  request,
}) => {
  test.setTimeout(90000);
  for (const [index, stone] of stones.entries()) {
    const response = await request.get(url(stone.slug));
    expect(response.status()).toBe(200);
    const html = await response.text();
    const nav = /<nav\b[^>]*data-stone-navigation[^>]*>([\s\S]*?)<\/nav>/.exec(
      html,
    )?.[1];
    expect(nav, stone.id).toBeTruthy();
    const previous = /<(?:a|span)\b[^>]*data-stone-prev[^>]*>/.exec(nav!)![0];
    const next = /<(?:a|span)\b[^>]*data-stone-next[^>]*>/.exec(nav!)![0];
    if (index === 0) {
      expect(previous).toContain('aria-disabled="true"');
      expect(previous).not.toContain('href=');
    } else expect(previous).toContain(`href="${url(stones[index - 1].slug)}"`);
    if (index === stones.length - 1) {
      expect(next).toContain('aria-disabled="true"');
      expect(next).not.toContain('href=');
    } else expect(next).toContain(`href="${url(stones[index + 1].slug)}"`);
    expect(nav).toContain(`href="${base}stones/"`);
  }
});

test('seven widths keep navigation usable, keyboard-accessible and clear of the footer', async ({
  page,
}, info) => {
  const middle = stones.find((s) => s.id === 's047')!;
  for (const width of [320, 375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url(middle.slug));
    const nav = page.locator('[data-stone-navigation]');
    expect(await nav.evaluate((el) => getComputedStyle(el).position)).toBe(
      width < 768 ? 'fixed' : 'static',
    );
    await expect(nav.locator('[data-stone-prev]')).toHaveAttribute(
      'aria-label',
      '前の石：' + stones[45].name,
    );
    await expect(nav.locator('[data-stone-next]')).toHaveAttribute(
      'aria-label',
      '次の石：' + stones[47].name,
    );
    for (const link of await nav.locator('a').all())
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 768) {
      const top = (await nav.boundingBox())!.y;
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      expect(Math.abs((await nav.boundingBox())!.y - top)).toBeLessThan(1);
      const footer = (await page.locator('.site-footer').boundingBox())!;
      expect(footer.y + footer.height).toBeLessThanOrEqual(top);
      expect(
        await page
          .locator('body')
          .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)),
      ).toBeGreaterThanOrEqual((await nav.boundingBox())!.height);
    }
    if (
      (info.project.name === 'mobile' && width === 390) ||
      (info.project.name === 'desktop' && width === 1440)
    ) {
      await nav.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(`navigation-${width}.png`),
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(url(stones[0].slug));
  await page.locator('[data-stone-next]').focus();
  expect(
    await page
      .locator('[data-stone-next]')
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    stones[1].name,
  );
  await page.locator('[data-stone-list]').click();
  await expect(page).toHaveURL(new RegExp(base + 'stones/$'));
});

test('real page links still work with JavaScript disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4321' + url(stones[0].slug));
    await expect(page.locator('[data-stone-prev]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await page.locator('[data-stone-next]').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      stones[1].name,
    );
  } finally {
    await context.close();
  }
});
