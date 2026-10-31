import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { auditVisibleText } from './text-audit';
const raw = JSON.parse(await readFile('src/content/stones.json', 'utf8'));
const categories = JSON.parse(
  await readFile('src/content/categories.json', 'utf8'),
);
const articles = JSON.parse(
  await readFile('src/content/articles.json', 'utf8'),
);
const paths = [
  '/',
  '/stones/',
  '/wishes/',
  '/articles/',
  '/diagnosis/',
  '/sample-report/',
  '/about/',
  '/terms/',
  '/privacy/',
  '/commerce/',
  '/refund/',
  '/contact/',
  '/404.html',
  ...raw.map((s: any) => `/stones/${s.slug}/`),
  ...categories.map((c: any) => `/wishes/${c.id}/`),
  ...articles.map((a: any) => `/articles/${a.slug}/`),
];
test('all public pages keep text contrast, reader copy and responsive bounds', async ({
  page,
}, info) => {
  test.setTimeout(360000);
  const widths =
    info.project.name === 'mobile' ? [375, 390, 430] : [768, 1280, 1440];
  const reports = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of paths) {
      const response = await page.goto(path);
      if (path === '/404.html')
        expect([200, 404]).toContain(response?.status());
      else expect(response?.status()).toBe(200);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
      const audit = await page.evaluate(auditVisibleText);
      expect(audit.checked, path).toBeGreaterThan(5);
      const smallLabels = await page
        .locator('.visual-caption, .card-eyebrow, .image-impression-label')
        .evaluateAll((nodes) =>
          nodes
            .filter((n) => n.getBoundingClientRect().width > 0)
            .map((n) => parseFloat(getComputedStyle(n).fontSize)),
        );
      for (const size of smallLabels)
        expect(size, path).toBeGreaterThanOrEqual(10);
      expect(
        audit.issues,
        `${path}: ${JSON.stringify(audit.issues.slice(0, 4))}`,
      ).toEqual([]);
      if (path.startsWith('/stones/') && path !== '/stones/') {
        const body = page.locator('.detail-body');
        await expect(body).not.toContainText(
          /という表現が適切|編集提案|編集上の提案|書籍では|今回の調査|紹介します|説明できます|掲載テーマ|既存の象徴/,
        );
        await expect(page.locator('#quality')).toContainText(
          '形だけで運勢や効果の強さは決まりません。波動も大切です。',
        );
        await expect(
          page.locator('#nature dd').filter({ hasText: /^未確認$/ }),
        ).toHaveCount(0);
      }
      reports.push({ width, path, ...audit });
    }
  }
  await mkdir('test-results/readability', { recursive: true });
  await writeFile(
    `test-results/readability/contrast-${info.project.name}.json`,
    JSON.stringify({ widths, pages: paths.length, reports }, null, 2),
  );
});
