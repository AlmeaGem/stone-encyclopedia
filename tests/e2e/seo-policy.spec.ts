import { test, expect } from '@playwright/test';
import stones from '../../src/content/stones.json' with { type: 'json' };
import categories from '../../src/content/categories.json' with { type: 'json' };
import articles from '../../src/content/articles.json' with { type: 'json' };
import themes from '../../src/content/story-themes.json' with { type: 'json' };
import moonstone from '../../src/content/archives/moonstone.json' with { type: 'json' };
import egypt from '../../src/content/archives/egyptian-amulets.json' with { type: 'json' };
import love from '../../src/content/archives/love-and-gemstones.json' with { type: 'json' };
import rainbow from '../../src/content/archives/stones-with-rainbows.json' with { type: 'json' };
import travelers from '../../src/content/archives/travelers-and-protective-stones.json' with { type: 'json' };
const archives = [moonstone, egypt, love, rainbow, travelers];
const searchCandidatePaths = [
  '',
  'stones/',
  ...stones
    .filter((stone) => stone.status === 'published')
    .map((stone) => `stones/${stone.slug}/`),
  'wishes/',
  ...categories.map((category) => `wishes/${category.id}/`),
  'archives/',
  ...archives.map((article) => `archives/${article.id}/`),
  'articles/',
  ...articles
    .filter((article) => article.status === 'published')
    .map((article) => `articles/${article.slug}/`),
  ...themes.map((theme) => `stories/${theme.id}/`),
  'about/',
];
const noindexPaths = ['diagnosis/', 'sample-report/', 'library/', '404/'];
const reviewPaths = ['terms/', 'privacy/', 'contact/', 'commerce/', 'refund/'];

test('all classified pages remain noindex with correct canonicals and an empty unapproved sitemap', async ({
  request,
}) => {
  test.setTimeout(120000);
  const paths = [
    ...searchCandidatePaths,
    ...noindexPaths.filter((path) => path !== '404/'),
    ...reviewPaths,
  ];
  expect(paths).toHaveLength(252);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain('<urlset');
  expect(xml).not.toContain('<loc>');
  for (let offset = 0; offset < paths.length; offset += 12) {
    await Promise.all(
      paths.slice(offset, offset + 12).map(async (path) => {
        const response = await request.get(`/${path}`);
        expect(response.status(), path).toBe(200);
        const html = await response.text();
        expect(html, path).toMatch(
          /<meta name="robots" content="noindex,nofollow"/,
        );
        const canonical = /<link rel="canonical" href="([^"]+)"/.exec(
          html,
        )?.[1];
        expect(canonical, path).toBeTruthy();
        expect(new URL(canonical!).pathname, path).toBe(`/${path}`);
      }),
    );
  }
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /');
  const missing = await request.get('/404.html');
  expect(missing.status()).toBe(200);
  const errorPage = await missing.text();
  expect(errorPage).toMatch(/<meta name="robots" content="noindex,nofollow"/);
  expect(errorPage).not.toContain('rel="canonical"');
  expect(errorPage).not.toContain('property="og:url"');
});

test('all five archive articles use only verified article metadata', async ({
  page,
}) => {
  for (const article of archives) {
    await page.goto(`/archives/${article.id}/`);
    await expect(page.locator('h1')).toHaveText(article.title);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'article',
    );
    const schemas = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).map((text) => JSON.parse(text));
    const structured = schemas.find((schema) => schema['@type'] === 'Article');
    expect(structured).toBeTruthy();
    expect(structured.headline).toBe(article.title);
    expect(structured.description).toBe(article.introduction);
    expect(new URL(structured.mainEntityOfPage).pathname).toBe(
      `/archives/${article.id}/`,
    );
    expect(structured.isAccessibleForFree).toBe(true);
    expect(structured.author).toBeUndefined();
    expect(structured.datePublished).toBeUndefined();
    expect(structured.dateModified).toBeUndefined();
    expect(structured.image).toBeUndefined();
  }
});
