import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const base =
  process.env.PREVIEW_URL || 'https://almeagem.github.io/stone-encyclopedia/';
const browser = await chromium.launch({ headless: true });
const results = [];
await mkdir('test-results/live-preview', { recursive: true });
try {
  for (const [name, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      isMobile: name === 'mobile',
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    if (response.status() !== 200) throw new Error('home ' + response.status());
    if (
      !(await page
        .locator('meta[name=robots]')
        .getAttribute('content')
        .then((v) => v.includes('noindex')))
    )
      throw new Error('noindex missing');
    if (await page.evaluate(() => document.body.scrollWidth > innerWidth))
      throw new Error('horizontal overflow');
    await page.screenshot({
      path: 'test-results/live-preview/home-' + name + '.png',
      fullPage: true,
    });
    await page.goto(base + 'stones/', { waitUntil: 'networkidle' });
    await page
      .getByRole('searchbox', { name: '石名・英語名・別名' })
      .fill('紅水晶');
    await page.waitForTimeout(300);
    if (
      !(await page
        .locator('[data-stone]:visible')
        .first()
        .textContent()
        .then((v) => v.includes('ローズクォーツ')))
    )
      throw new Error('search failed');
    await page.goto(base + 'stones/rose-quartz/', { waitUntil: 'networkidle' });
    if ((await page.locator('h1').textContent()) !== 'ローズクォーツ')
      throw new Error('detail failed');
    if (
      (await page.locator('link[rel=canonical]').getAttribute('href')) !==
      base + 'stones/rose-quartz/'
    )
      throw new Error('canonical failed');
    await page.screenshot({
      path: 'test-results/live-preview/detail-' + name + '.png',
      fullPage: true,
    });
    if (errors.length) throw new Error(errors.join('\n'));
    results.push({
      device: name,
      home: 200,
      search: 'passed',
      detail: 'passed',
      overflow: false,
      errors,
    });
    await page.close();
  }
  const context = await browser.newContext();
  const stones = JSON.parse(await readFile('src/content/stones.json', 'utf8'));
  let index = 0;
  const failed = [];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (index < stones.length) {
        const stone = stones[index++];
        const r = await context.request.get(
          base + 'stones/' + stone.slug + '/',
        );
        const html = await r.text();
        if (r.status() !== 200 || !html.includes(stone.name))
          failed.push({ slug: stone.slug, status: r.status() });
      }
    }),
  );
  if (failed.length) throw new Error(JSON.stringify(failed));
  results.push({
    liveStones: stones.length,
    status: 'all 200',
    robots: (await context.request.get(base + 'robots.txt')).status(),
    sitemap: (await context.request.get(base + 'sitemap.xml')).status(),
  });
  await writeFile(
    'test-results/live-preview/results.json',
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
