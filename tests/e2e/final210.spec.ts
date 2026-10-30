import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const stones = JSON.parse(await readFile('src/content/stones.json', 'utf8'));
const categories = JSON.parse(
  await readFile('src/content/categories.json', 'utf8'),
);
const paths = new Set(stones.map((s: any) => `/stones/${s.slug}/`));
const output = 'test-results/final210';

test('all 210 detail pages have responsive content, valid links, loaded images and distinct SEO', async ({
  page,
}, info) => {
  test.setTimeout(300000);
  const width = info.project.name === 'mobile' ? 375 : 1440;
  await page.setViewportSize({ width, height: 1000 });
  const titles = new Set(),
    canonicals = new Set(),
    imageUrls = new Set<string>();
  const errors: string[] = [],
    badResponses: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.url().startsWith('http://127.0.0.1:4321/') && r.status() >= 400)
      badResponses.push(`${r.status()} ${r.url()}`);
  });
  for (const stone of stones) {
    const response = await page.goto(`/stones/${stone.slug}/`);
    expect(response?.status(), stone.id).toBe(200);
    await expect(page.locator('h1')).toHaveText(stone.name);
    await expect(page.locator('#nature')).toBeVisible();
    await expect(page.locator('#story')).toContainText(
      stone.spiritualEffects || stone.symbolism,
    );
    await expect(page.locator('#care')).toContainText(
      stone.handling.replace(/^移行資料の注意メモ：/, ''),
    );
    const title = await page.title();
    expect(title).toContain(stone.name);
    titles.add(title);
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');
    expect(new URL(canonical!).pathname).toBe(`/stones/${stone.slug}/`);
    canonicals.add(canonical);
    expect(
      (await page.locator('meta[name="description"]').getAttribute('content'))!
        .length,
    ).toBeGreaterThan(20);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex,nofollow',
    );
    const schemas = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).map((text) => JSON.parse(text));
    expect(schemas.length).toBeGreaterThan(0);
    expect(JSON.stringify(schemas)).toContain(stone.name);
    const localStoneLinks = await page
      .locator('a[href^="/stones/"]')
      .evaluateAll((nodes) =>
        nodes
          .map((n) => n.getAttribute('href')!)
          .filter((h) => h !== '/stones/'),
      );
    for (const href of localStoneLinks)
      expect(paths.has(href), `${stone.id}: ${href}`).toBe(true);
    for (const src of await page
      .locator('img[src]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('src')!)))
      imageUrls.add(src);
    const mainPhoto = page.locator('.stone-figure.detail img');
    if (await mainPhoto.count()) {
      await mainPhoto.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          mainPhoto.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      stone.id,
    ).toBe(true);
    const clipped = await page
      .locator(
        'h1, .detail-section p, .detail-section h2, .aliases, .detail-english',
      )
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => n.clientWidth > 0 && n.scrollWidth > n.clientWidth + 2)
          .map((n) => n.textContent?.slice(0, 100)),
      );
    expect(clipped, stone.id).toEqual([]);
    if (stone.id === 's210') {
      await mkdir(output, { recursive: true });
      await page.screenshot({
        path: `${output}/detail-${info.project.name}.png`,
        fullPage: true,
      });
    }
  }
  for (const url of imageUrls) {
    const r = await page.request.get(url);
    expect(r.status(), url).toBe(200);
    const image = await sharp(await r.body()).metadata();
    expect(image.width).toBeGreaterThan(0);
  }
  expect(titles.size).toBe(210);
  expect(canonicals.size).toBe(210);
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
  await mkdir(output, { recursive: true });
  await writeFile(
    `${output}/details-${info.project.name}.json`,
    JSON.stringify(
      {
        project: info.project.name,
        width,
        pages: 210,
        uniqueTitles: titles.size,
        uniqueCanonicals: canonicals.size,
        imageUrls: [...imageUrls],
        pageErrors: errors,
        badResponses,
        passed: true,
      },
      null,
      2,
    ),
  );
});

test('every name and alias is reachable through search and all twelve categories filter correctly', async ({
  page,
}, info) => {
  test.setTimeout(300000);
  await page.goto('/stones/');
  const input = page.getByRole('searchbox', { name: '石名・英語名・別名' });
  let queries = 0;
  for (const stone of stones) {
    for (const query of [stone.name, stone.english, ...stone.aliases]) {
      await input.fill('');
      await input.fill(query);
      const target = page.locator(
        `[data-stone] a[href="/stones/${stone.slug}/"]`,
      );
      for (let i = 0; i < 9 && !(await target.isVisible()); i++) {
        const next = page.locator('[data-next]');
        if (!(await next.isVisible()) || !(await next.isEnabled())) break;
        await next.click();
      }
      await expect(target, `${stone.id}: ${query}`).toBeVisible();
      queries++;
    }
  }
  for (const query of ['恋愛運', '金運', '仕事運', '健康運', '厄除け']) {
    await input.fill(query);
    expect(await page.locator('[data-stone]:visible').count()).toBeGreaterThan(
      0,
    );
  }
  await page.goto('/wishes/');
  await expect(page.locator('.wish-number')).toHaveCount(12);
  for (const category of categories) {
    const selected = stones.filter((s: any) => s.wishes.includes(category.id));
    await page.goto('/stones/');
    await page
      .getByRole('combobox', { name: '願いのテーマ', exact: true })
      .selectOption(category.id);
    const actual: string[] = [];
    for (let i = 0; i < 9; i++) {
      actual.push(
        ...(await page
          .locator('[data-stone]:visible a')
          .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')!))),
      );
      const next = page.locator('[data-next]');
      if (!(await next.isVisible()) || !(await next.isEnabled())) break;
      await next.click();
    }
    expect(actual.sort()).toEqual(
      selected.map((s: any) => `/stones/${s.slug}/`).sort(),
    );
    await page.goto(`/wishes/${category.id}/`);
    await expect(page.locator('#wish-result-count')).toHaveText(
      `${selected.length}種類の天然石`,
    );
    const button = page.locator('[data-wish-tag]').first();
    if (await button.count()) {
      const tag = await button.getAttribute('data-wish-tag');
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#wish-result-count')).toHaveText(
        `${selected.filter((s: any) => s.themes.includes(tag)).length}種類の天然石`,
      );
      await page.locator('[data-clear-wishes]').click();
      await expect(page.locator('#wish-result-count')).toHaveText(
        `${selected.length}種類の天然石`,
      );
    }
  }
  await page.goto('/stones/');
  await mkdir(output, { recursive: true });
  await page.screenshot({
    path: `${output}/catalog-${info.project.name}.png`,
    fullPage: true,
  });
  await writeFile(
    `${output}/search-${info.project.name}.json`,
    JSON.stringify(
      {
        project: info.project.name,
        queries,
        generalWishQueries: 5,
        categories: 12,
        categoryFiltering: true,
        passed: true,
      },
      null,
      2,
    ),
  );
});
