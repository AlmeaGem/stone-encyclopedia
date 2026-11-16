import { test, expect } from '@playwright/test';

const targets = [
  ['aquamarine', '.aqua-pairings > article', 5],
  ['moonstone', '.manuscript-pairings > article', 6],
  ['larimar', '.manuscript-pairings > article', 7],
  ['rutilated-quartz', '.manuscript-pairings > article', 5],
  ['rose-quartz', '.manuscript-pairings > article', 6],
  ['rhodochrosite', '.manuscript-pairings > article', 7],
  ['bulls-eye', '.manuscript-pairings > article', 5],
  ['blue-topaz', '.manuscript-pairings > article', 6],
  ['hawks-eye', '.manuscript-pairings > article', 6],
  ['rhodonite', '.manuscript-pairings > article', 5],
  ['peridot', '.manuscript-pairings > article', 5],
  ['bloodstone', '.manuscript-pairings > article', 7],
  ['blue-lace-agate', '.manuscript-pairings > article', 4],
  ['prehnite', '.manuscript-pairings > article', 6],
  ['fluorite', '.manuscript-pairings > article', 7],
  ['hematite', '.manuscript-pairings > article', 5],
  ['mother-of-pearl', '.manuscript-pairings > article', 6],
  ['malachite', '.manuscript-pairings > article', 7],
  ['morganite', '.manuscript-pairings > article', 7],
  ['lapis-lazuli', '.manuscript-pairings > article', 7],
  ['labradorite', '.manuscript-pairings > article', 7],
] as const;

test('pairings have one heading per stone and retain their descriptions', async ({
  page,
}, info) => {
  for (const [slug, selector, expected] of targets) {
    await page.goto(`/stones/${slug}/`);
    const entries = page.locator(`#pairing ${selector}`);
    await expect(entries).toHaveCount(expected);
    const destinations = new Set<string>();
    for (const entry of await entries.all()) {
      const heading = entry.locator('h3, h4');
      await expect(heading).toHaveCount(1);
      const name = heading.locator('.manuscript-pairing-name');
      await expect(name).toHaveCount(1);
      const key = (await name.textContent())!.trim();
      expect(destinations.has(key), `${slug}: duplicate ${key}`).toBe(false);
      destinations.add(key);
      const description = entry.locator('p').last();
      await expect(description).not.toBeEmpty();
      if (info.project.name === 'mobile') {
        const titleBox = (await heading.boundingBox())!;
        const textBox = (await description.boundingBox())!;
        expect(textBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height);
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('blue lace wishes stay under the matching headings', async ({ page }) => {
  await page.goto('/stones/blue-lace-agate/');
  const sections = page.locator('#story .wish-expansion article');
  await expect(sections).toHaveCount(4);
  await expect(sections.nth(0).locator('h3')).toHaveText('愛情・人間関係');
  await expect(sections.nth(0)).toContainText('恋人や友人、家族');
  await expect(sections.nth(1).locator('h3')).toHaveText('仕事・挑戦');
  await expect(sections.nth(1)).toContainText('仕事や新しい環境');
  await expect(sections.nth(2).locator('h3')).toHaveText('豊かさ・暮らし');
  await expect(sections.nth(2)).toContainText('豊かさ');
});

test('second-group articles contain no editorial drafting instructions', async ({
  page,
}) => {
  for (const slug of [
    'bloodstone',
    'blue-lace-agate',
    'prehnite',
    'fluorite',
    'hematite',
  ]) {
    await page.goto(`/stones/${slug}/`);
    await expect(page.locator('.detail-body')).not.toContainText(
      /資料では|資料の「|提案として|として紹介できます|意味を持たせられます/,
    );
    await expect(page.locator('#story .wish-expansion article')).toHaveCount(4);
  }
});

test('third-group wishes and morganite love sections remain available', async ({
  page,
}) => {
  for (const slug of [
    'mother-of-pearl',
    'malachite',
    'morganite',
    'lapis-lazuli',
    'labradorite',
  ]) {
    await page.goto(`/stones/${slug}/`);
    await expect(page.locator('#story .wish-expansion article')).toHaveCount(4);
    await expect(page.locator('.detail-body')).not.toContainText(
      /資料では|資料の「|提案として|として紹介できます|意味を持たせられます/,
    );
  }
  await page.goto('/stones/mother-of-pearl/');
  const wishes = page.locator('#story .wish-expansion article');
  await expect(wishes.nth(0)).toContainText('家族や恋人');
  await expect(wishes.nth(1)).toContainText('仕事では');
  await page.goto('/stones/morganite/');
  for (const heading of ['恋愛の願い①', '恋愛の願い②', '恋愛の願い③'])
    await expect(page.locator('#story')).toContainText(heading);
});
