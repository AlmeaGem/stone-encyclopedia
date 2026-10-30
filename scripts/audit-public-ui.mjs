import { chromium } from '@playwright/test';
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
      ),
    )
  ).flat();
}
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4340/';
const paths = (await files('dist'))
  .filter((p) => p.endsWith('/index.html'))
  .map((p) => p.slice(5, -10));
const widths = [375, 390, 430, 768, 1280, 1440];
const screenshots = new Map([
  ['', 'home'],
  ['stones/', 'stones'],
  ['stones/rose-quartz/', 'stone-detail'],
  ['wishes/', 'categories'],
  ['wishes/love/', 'category-detail'],
  ['articles/', 'articles'],
  ['articles/inclusions/', 'article-detail'],
  ['diagnosis/', 'diagnosis'],
  ['sample-report/', 'sample'],
]);
const folder = 'docs/screenshots/report-experience';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const failures = [],
  checked = [],
  links = new Set();
try {
  await Promise.all(
    widths.map(async (width) => {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      for (const path of paths) {
        const errors = [];
        const onError = (e) => errors.push(e.message);
        page.on('pageerror', onError);
        const response = await page.goto(new URL(path, base).href, {
          waitUntil: 'load',
        });
        const issues = await page.evaluate(() => {
          const list = [];
          if (
            document.body.scrollWidth >
            document.documentElement.clientWidth + 1
          )
            list.push('horizontal overflow');
          for (const el of document.querySelectorAll(
            'button,.button,.text-link,.entry-actions a',
          )) {
            const rect = el.getBoundingClientRect();
            if (!rect.width || !rect.height) continue;
            if (el.scrollWidth > el.clientWidth + 2)
              list.push('clipped control: ' + el.textContent.trim());
            if (rect.left < -1 || rect.right > innerWidth + 1)
              list.push('control outside viewport: ' + el.textContent.trim());
            if (rect.height < 43)
              list.push('small primary target: ' + el.textContent.trim());
          }
          return list;
        });
        if (response.status() !== 200 || issues.length || errors.length)
          failures.push({
            width,
            path,
            status: response.status(),
            issues,
            errors,
          });
        if (width === 1440) {
          for (const href of await page
            .locator('a[href]')
            .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')))) {
            if (href?.startsWith('/') || href?.startsWith('#'))
              links.add(new URL(href, page.url()).href);
          }
        }
        if ([390, 1440].includes(width) && screenshots.has(path))
          await page.screenshot({
            path: `${folder}/after-${width}-${screenshots.get(path)}.png`,
            fullPage: true,
          });
        checked.push({ width, path, status: response.status() });
        page.off('pageerror', onError);
      }
      await page.close();
      console.log(`UI audit ${width}px: ${paths.length} routes`);
    }),
  );
  const request = await browser.newContext();
  for (const url of links) {
    const response = await request.request.get(url);
    if (response.status() !== 200)
      failures.push({ link: url, status: response.status() });
    const anchor = new URL(url).hash.slice(1);
    if (
      anchor &&
      !(await response.text()).includes(`id="${decodeURIComponent(anchor)}"`)
    )
      failures.push({ link: url, issue: 'missing anchor' });
  }
  const result = {
    routeCount: paths.length,
    widths,
    checks: checked.length,
    internalLinksChecked: links.size,
    failures,
  };
  await writeFile(
    'docs/ui-audit-report.json',
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(JSON.stringify(result));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
