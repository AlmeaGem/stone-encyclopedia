import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const dist = resolve('dist');
const site = 'https://almeagem.github.io/stone-encyclopedia/';
const xml = readFileSync(resolve(dist, 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.equal(urls.length, 244, 'exactly 244 explicitly approved URLs');
assert.equal(new Set(urls).size, 244, 'sitemap URLs must be unique');
const indexed = new Set(urls);
for (const url of urls) {
  assert.ok(url.startsWith(site), 'canonical URL must be inside the project site: ' + url);
  const path = url.slice(site.length);
  const filename = resolve(dist, path, 'index.html');
  assert.ok(existsSync(filename), 'approved HTML must exist: ' + path);
  const html = readFileSync(filename, 'utf8');
  assert.match(html, /<meta name="robots" content="index,follow"/, 'approved: ' + path);
  assert.ok(html.includes('href="' + url + '"'), 'canonical URL: ' + path);
}
for (const path of [
  'diagnosis/', 'sample-report/', 'library/',
  'terms/', 'privacy/', 'contact/', 'commerce/', 'refund/',
]) {
  const url = site + path;
  assert.ok(!indexed.has(url), 'excluded route must not be in sitemap: ' + path);
  const html = readFileSync(resolve(dist, path, 'index.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex,nofollow"/, 'excluded: ' + path);
}
const missing = readFileSync(resolve(dist, '404.html'), 'utf8');
assert.match(missing, /<meta name="robots" content="noindex,nofollow"/);
assert.ok(!missing.includes('rel="canonical"'), '404 must have no canonical');
assert.ok(!missing.includes('property="og:url"'), '404 must have no og:url');
console.log('SEO release dry-run: 244 approved URLs, 9 excluded/error routes, canonical and robots verified.');
