import { test, expect } from '@playwright/test';

for (const fallback of [false, true]) {
  test(`history controls use actual browsing order and reject external entries (${fallback ? 'portable fallback' : 'native'})`, async ({
    page,
  }) => {
    if (fallback)
      await page.addInitScript(() =>
        Object.defineProperty(window, 'navigation', { value: undefined }),
      );
    await page.goto('/');
    const nav = page.locator('.history-navigation');
    const back = nav.locator('button[data-history-direction="-1"]');
    const forward = nav.locator('button[data-history-direction="1"]');
    await expect(back).toBeDisabled();
    await expect(forward).toBeDisabled();
    await page
      .getByRole('navigation', { name: 'メインメニュー' })
      .getByRole('link', { name: '読みもの', exact: true })
      .click();
    await expect(page).toHaveURL('/articles/');
    await expect(back).toBeEnabled();
    await back.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/');
    await expect(forward).toBeEnabled();
    if ((page.viewportSize()?.width ?? 0) < 768) {
      await expect(nav).toBeHidden();
      await page.goForward();
    } else await forward.click();
    await expect(page).toHaveURL('/articles/');
    // A different origin, served locally by the isolated test editor.
    await page.evaluate(() => location.assign('http://127.0.0.1:4322/login'));
    await page.waitForURL('http://127.0.0.1:4322/login');
    await page.goBack();
    await expect(page).toHaveURL('/articles/');
    await expect(forward).toBeDisabled();
    await back.click();
    await expect(page).toHaveURL('/');
    if ((page.viewportSize()?.width ?? 0) < 768) {
      await expect(nav).toBeHidden();
      await page.goForward();
    } else await forward.click();
    await expect(page).toHaveURL('/articles/');
    await back.click();
    await expect(page).toHaveURL('/');
    await page
      .getByRole('navigation', { name: 'メインメニュー' })
      .getByRole('link', { name: '石を探す', exact: true })
      .click();
    await expect(page).toHaveURL('/stones/');
    await expect(forward).toBeDisabled();
    await page.goto('http://127.0.0.1:4322/login');
    await page.goto('/');
    await expect(back).toBeDisabled();
    await page
      .getByRole('navigation', { name: 'メインメニュー' })
      .getByRole('link', { name: '読みもの', exact: true })
      .click();
    await expect(back).toBeEnabled();
    // Count dispatches without navigating inside evaluate: a real navigation
    // would destroy this execution context before the assertion can complete.
    const calls = await back.evaluate((element) => {
      let count = 0;
      const original = history.go;
      history.go = (_delta: number) => {
        count++;
      };
      try {
        (element as HTMLButtonElement).click();
        (element as HTMLButtonElement).click();
      } finally {
        history.go = original;
      }
      return count;
    });
    expect(calls).toBe(1);
    await page.goBack();
    await expect(page).toHaveURL('/');
    await expect(back).toBeDisabled();
  });
}

test('global controls clear the footer, respect safe areas and support touch', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90000);
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    for (const width of [320, 375, 390, 430, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of [
        '/',
        '/stones/',
        '/stones/rose-quartz/',
        '/wishes/love/',
        '/articles/',
        '/terms/',
      ]) {
        await page.goto(path);
        const nav = page.locator('.history-navigation');
        if (path === '/' && width < 768) {
          await expect(nav).toBeHidden();
          await expect(
            page.getByRole('searchbox', { name: '石名・英語名・別名' }),
          ).toBeVisible();
        } else {
          expect(
            await nav.evaluate((el) => getComputedStyle(el).position),
          ).toBe(width < 768 ? 'fixed' : 'static');
          for (const button of await nav.getByRole('button').all()) {
            const box = (await button.boundingBox())!;
            expect(box.height).toBeGreaterThanOrEqual(44);
            if (width < 768) expect(box.width).toBeLessThanOrEqual(180);
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
          }
          await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight),
          );
          if (width < 768) {
            const footer = (await page.locator('.site-footer').boundingBox())!;
            const bar = (await nav.boundingBox())!;
            expect(footer.y + footer.height).toBeLessThanOrEqual(bar.y);
          }
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(page.locator('main')).not.toContainText(
          'AI生成による参考イメージです。',
        );
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'メインメニュー' })
      .getByRole('link', { name: '読みもの', exact: true })
      .tap();
    await page
      .getByRole('button', { name: '← 前のページへ戻る', exact: true })
      .tap();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.history-navigation')).toBeHidden();
    await page.goForward();
    await expect(page).toHaveURL('/articles/');
  } finally {
    await context.close();
  }
});
