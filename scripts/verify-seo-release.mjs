import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { approvedSearchPaths } from '../src/lib/approved-search-paths.ts';

const dist = resolve('dist');
const site = 'https://almeagem.github.io/stone-encyclopedia/';
const xml = readFileSync(resolve(dist, 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.equal(urls.length, 244, 'exactly 244 explicitly approved URLs');
assert.equal(new Set(urls).size, 244, 'sitemap URLs must be unique');
const indexed = new Set(urls);
assert.deepEqual(
  [...indexed].sort(),
  approvedSearchPaths.map((path) => site + path).sort(),
  'sitemap must exactly match the approved paths',
);
for (const url of urls) {
  assert.ok(
    url.startsWith(site),
    'canonical URL must be inside the project site: ' + url,
  );
  const path = url.slice(site.length);
  const filename = resolve(dist, path, 'index.html');
  assert.ok(existsSync(filename), 'approved HTML must exist: ' + path);
  const html = readFileSync(filename, 'utf8');
  assert.match(
    html,
    /<meta name="robots" content="index,follow"/,
    'approved: ' + path,
  );
  assert.ok(
    html.includes('rel="canonical" href="' + url + '"'),
    'canonical URL: ' + path,
  );
}
for (const entry of readdirSync(dist, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const filename = resolve(entry.parentPath, entry.name);
  const html = readFileSync(filename, 'utf8');
  if (!html.includes('content="index,follow"')) continue;
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  assert.ok(indexed.has(canonical), 'unexpected indexed HTML: ' + filename);
}
for (const path of approvedSearchPaths.filter(
  (path) => path.startsWith('archives/') && path !== 'archives/',
)) {
  const html = readFileSync(resolve(dist, path, 'index.html'), 'utf8');
  const schemas = [
    ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs),
  ].map((match) => JSON.parse(match[1]));
  const article = schemas.find((schema) => schema['@type'] === 'Article');
  assert.ok(article, 'Article structured data: ' + path);
  assert.equal(
    article.mainEntityOfPage,
    site + path,
    'Article canonical: ' + path,
  );
  assert.ok(article.headline && article.description, 'Article fields: ' + path);
}
for (const path of [
  'diagnosis/',
  'sample-report/',
  'library/',
  'terms/',
  'privacy/',
  'contact/',
  'commerce/',
  'refund/',
]) {
  const url = site + path;
  assert.ok(
    !indexed.has(url),
    'excluded route must not be in sitemap: ' + path,
  );
  const html = readFileSync(resolve(dist, path, 'index.html'), 'utf8');
  assert.match(
    html,
    /<meta name="robots" content="noindex,nofollow"/,
    'excluded: ' + path,
  );
}
const missing = readFileSync(resolve(dist, '404.html'), 'utf8');
assert.match(missing, /<meta name="robots" content="noindex,nofollow"/);
assert.ok(!missing.includes('rel="canonical"'), '404 must have no canonical');
assert.ok(!missing.includes('property="og:url"'), '404 must have no og:url');
console.log(
  'SEO release dry-run: 244 approved URLs, 9 excluded/error routes, canonical and robots verified.',
);
