import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { auditVisibleText } from './text-audit';

test('image labels overlay the bottom-right of photos at all requested widths and surfaces', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  test.skip(
    info.project.name !== 'desktop',
    'All seven widths are exercised here',
  );
  for (const width of [320, 375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      '/',
      '/stones/',
      '/stones/rose-quartz/',
      '/wishes/love/',
    ]) {
      await page.goto(path);
      for (const label of await page
        .locator('.image-impression-label:visible')
        .all()) {
        await expect(label).toHaveText('※ イメージ画像');
        const layout = await label.evaluate((el) => {
          const image = el.previousElementSibling!;
          const labelBox = el.getBoundingClientRect();
          const imageBox = image.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            gap: imageBox.bottom - labelBox.bottom,
            right: imageBox.right - labelBox.right,
            position: style.position,
            font: parseFloat(style.fontSize),
            whiteSpace: style.whiteSpace,
            background: style.backgroundColor,
          };
        });
        expect(layout.gap).toBeGreaterThanOrEqual(8);
        expect(layout.gap).toBeLessThanOrEqual(10);
        expect(layout.right).toBe(9);
        expect(layout.position).toBe('absolute');
        expect(layout.font).toBe(width < 768 ? 10 : 11);
        expect(layout.whiteSpace).toBe('nowrap');
        expect(layout.background).toBe('rgba(250, 247, 243, 0.9)');
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width} ${path}`,
      ).toBe(true);
      const audit = await page.evaluate(auditVisibleText);
      expect(audit.issues, `${width} ${path}`).toEqual([]);
      if (width === 390 && (path === '/' || path === '/stones/rose-quartz/')) {
        await mkdir('test-results/image-overlay', { recursive: true });
        const figure = page
          .locator(path === '/' ? '.stone-figure' : '.stone-figure.detail')
          .first();
        await figure.scrollIntoViewIfNeeded();
        await figure
          .locator('img')
          .evaluate((el: HTMLImageElement) => el.decode());
        await figure.screenshot({
          path: `test-results/image-overlay/after-${path === '/' ? 'card' : 'detail'}.png`,
        });
      }
    }
  }
});

test('only image saving gestures are suppressed while links and text remain native', async ({
  page,
}) => {
  await page.goto('/');
  const image = page.locator('.stone-figure img').first();
  await expect(image).toHaveAttribute('draggable', 'false');
  for (const type of ['contextmenu', 'dragstart']) {
    expect(
      await image.evaluate(
        (el, eventType) =>
          el.dispatchEvent(
            new Event(eventType, { bubbles: true, cancelable: true }),
          ),
        type,
      ),
    ).toBe(false);
    expect(
      await page
        .locator('h1')
        .evaluate(
          (el, eventType) =>
            el.dispatchEvent(
              new Event(eventType, { bubbles: true, cancelable: true }),
            ),
          type,
        ),
    ).toBe(true);
  }
  const link = page.locator('.stone-card > a').first();
  expect(
    await link.evaluate((el) =>
      el.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      ),
    ),
  ).toBe(true);
  const href = await link.getAttribute('href');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(href!);
  await expect(page.locator('.stone-figure.detail figcaption')).toHaveCount(0);
  await page.goto('/terms/');
  await expect(page.locator('main')).toContainText('法令上認められる引用');
  await expect(page.locator('main')).toContainText(
    '一律に主張するものではなく',
  );
  await expect(page.locator('.footer-note')).toContainText(
    '© 2026 ALMÉA GEM. All Rights Reserved.',
  );
});
