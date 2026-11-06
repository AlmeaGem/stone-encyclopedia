import { expect, test } from '@playwright/test';

test('diagnosis resumes after history navigation and can start over', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('nav[aria-label="メインメニュー"] a[href="/diagnosis/"]')
    .click();
  await page.locator('fieldset[data-step="1"] label').first().click();
  await page.locator('#next').click();
  await page.locator('fieldset[data-step="2"] label').first().click();
  const answer = await page.locator('input[name="main"]:checked').inputValue();
  await page.locator('#next').click();
  await page.locator('[data-history-direction="-1"]').click();
  await page.waitForURL('/');
  await page.goForward();
  await expect(page.locator('#step-label')).toHaveText('STEP 3 / 6');
  await page.getByRole('button', { name: '← 前の質問へ' }).click();
  await expect(page.locator('input[name="main"]:checked')).toHaveValue(answer);
  await page.reload();
  await expect(page.locator('input[name="main"]:checked')).toHaveValue(answer);
  await page
    .getByRole('button', { name: '回答を消して最初からやり直す' })
    .click();
  await expect(page.locator('#step-label')).toHaveText('STEP 1 / 6');
  await page.reload();
  await expect(page.locator('input[name="category"]:checked')).toHaveCount(0);
});

test('diagnosis remains usable if session storage is blocked', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto('/diagnosis/');
  await page.locator('fieldset[data-step="1"] label').first().click();
  await page.locator('#next').click();
  await expect(page.locator('#step-label')).toHaveText('STEP 2 / 6');
  await expect(page.locator('#questionnaire-storage-notice')).toContainText(
    '一時保存',
  );
});

test('search shortcut, breadcrumb targets and catalog headings work at requested widths', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.getByRole('link', { name: 'このページで石を検索 ↓' }).click();
    await expect(page).toHaveURL(/#home-search$/);
    await expect(page.locator('#home-q')).toBeVisible();
    await page.goto('/stones/rose-quartz/');
    const links = page.locator('.breadcrumbs a');
    for (const link of await links.all()) {
      const box = (await link.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto('/stones/');
    await expect(page.locator('.catalog-grid h2').first()).toBeVisible();
  }
});
