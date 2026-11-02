import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const stones = (
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')) as {
    id: string;
    slug: string;
    status: string;
  }[]
)
  .filter((stone) => stone.status === 'published')
  .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

test('every detail page links to its ID neighbors without wrapping', async ({
  request,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Static HTML is shared');
  for (const [index, stone] of stones.entries()) {
    const response = await request.get(`/stones/${stone.slug}/`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const navigation = html.match(
      /<nav\b[^>]*aria-label="石のページ移動"[^>]*>([\s\S]*?)<\/nav>/,
    )![1];
    expect(navigation).toContain('href="/stones/"');
    for (const [rel, neighbor] of [
      ['prev', stones[index - 1]],
      ['next', stones[index + 1]],
    ] as const) {
      if (neighbor) {
        expect(navigation).toContain(`href="/stones/${neighbor.slug}/"`);
        expect(navigation).toContain(`rel="${rel}"`);
      } else {
        expect(navigation).not.toContain(`rel="${rel}"`);
        expect(navigation).toContain('aria-disabled="true"');
      }
    }
  }
});

test('navigation stays reachable with safe-area clearance on mobile and in page flow on desktop', async ({
  page,
}) => {
  // Navigation needs no image downloads, including related stone photos.
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'image'
      ? route.abort()
      : route.continue(),
  );
  for (const width of [375, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/stones/${stones[1].slug}/`);
    const navigation = page.getByRole('navigation', {
      name: '石のページ移動',
    });
    const mobile = width < 768;
    expect(
      await navigation.evaluate((el) => getComputedStyle(el).position),
    ).toBe(mobile ? 'fixed' : 'static');
    for (const link of await navigation.getByRole('link').all()) {
      if (!mobile) await link.scrollIntoViewIfNeeded();
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await link.focus();
      await expect(link).toBeFocused();
    }
    if (mobile) {
      await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
        'content',
        /viewport-fit=cover/,
      );
      const session = await page.context().newCDPSession(page);
      await session.send('Emulation.setSafeAreaInsetsOverride', {
        insets: { bottom: 34, left: 0, right: 0, top: 0 },
      });
      expect(
        await navigation.evaluate((el) =>
          parseFloat(getComputedStyle(el).paddingBottom),
        ),
      ).toBe(42);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const navBox = (await navigation.boundingBox())!;
      const footerBox = (await page.locator('.site-footer').boundingBox())!;
      expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(navBox.y);
      expect(navBox.y + navBox.height).toBe(844);
      await session.send('Emulation.setSafeAreaInsetsOverride', { insets: {} });
      await session.detach();
    } else {
      expect(
        await navigation.evaluate((el) =>
          Boolean(
            el.previousElementSibling?.classList.contains('report-nudge'),
          ),
        ),
      ).toBe(true);
    }
    await navigation.getByRole('link', { name: /^次の石/ }).click();
    await expect(page).toHaveURL(`/stones/${stones[2].slug}/`);
    await page
      .getByRole('navigation', { name: '石のページ移動' })
      .getByRole('link', { name: /^前の石/ })
      .click();
    await expect(page).toHaveURL(`/stones/${stones[1].slug}/`);
    await page
      .getByRole('navigation', { name: '石のページ移動' })
      .getByRole('link', { name: '一覧', exact: true })
      .click();
    await expect(page).toHaveURL('/stones/');
    await expect(page.locator('.stone-navigation')).toHaveCount(0);
    expect(
      await page
        .locator('body')
        .evaluate((el) => getComputedStyle(el).paddingBottom),
    ).toBe('0px');
  }
});
