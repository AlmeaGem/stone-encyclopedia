import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
const stones = JSON.parse(
  await readFile('src/content/stones.json', 'utf8'),
).filter((s) => s.status === 'published');
const index = await readFile('dist/stones/index.html', 'utf8');
if (stones.length !== 210) throw new Error('210項目すべてを公開してください');
const slugs = new Set();
for (const s of stones) {
  if (slugs.has(s.slug)) throw new Error('URLが重複しています');
  slugs.add(s.slug);
  const html = await readFile(`dist/stones/${s.slug}/index.html`, 'utf8');
  for (const token of [
    'rel="canonical"',
    'application/ld+json',
    'og:title',
    s.name,
    '鉱物・物理的な情報',
    '伝承',
  ])
    if (!html.includes(token)) throw new Error(`${s.id} lacks ${token}`);
  for (const internal of [
    '出典・確認状況',
    '出典確認状況',
    '移行資料',
    s.reviewNote,
  ].filter(Boolean))
    if (html.includes(internal))
      throw new Error(`${s.id} exposes internal review notes`);
  if (!index.includes(s.slug)) throw new Error('一覧に含まれない石があります');
}
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir)).map(async (f) => {
        const p = join(dir, f);
        return (await stat(p)).isDirectory() ? files(p) : [p];
      }),
    )
  ).flat();
}
const output = await files('dist');
const restrictedReferenceUrls = new Set(
  stones.flatMap((s) =>
    s.sources
      .filter((r) => r.publication === 'internal' && r.url)
      .map((r) => r.url),
  ),
);
for (const file of output.filter((p) => /\.(html|js|json|xml|txt)$/.test(p))) {
  const text = await readFile(file, 'utf8');
  for (const url of restrictedReferenceUrls)
    if (text.includes(url))
      throw new Error(`${file} exposes a restricted reference URL`);
}

for (const p of output) {
  if (p.endsWith('.html')) {
    const html = await readFile(p, 'utf8');
    if (
      /編集ガイド|表示確認|移行資料|移行元|掲載ID順|公開ビルド|管理者が/.test(
        html,
      )
    )
      throw new Error(`${p} contains production-only copy`);
  }
  if (
    /(?:admin-server|candidates|\.editor|password|stone_catalog\.json)/.test(p)
  )
    throw new Error('非公開ファイルが出力されています');
  if (p.endsWith('.html')) {
    const html = await readFile(p, 'utf8');
    if (
      /supabase|amule-private|api\.openai|stripe\.com\/v3|data-report-result/i.test(
        html,
      )
    )
      throw new Error('管理システム・有料結果への依存が検出されました');
  }
}
console.log(
  `Build audit: ${stones.length} static stone pages, unique URLs, SEO and private-file isolation OK (${output.length} files)`,
);

const prefix = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
if (prefix !== '/') {
  for (const file of output.filter((p) => p.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"\s]*)"/g)) {
      if (!url.startsWith(prefix))
        throw new Error(`Subpath deployment has a broken URL: ${url}`);
    }
  }
  console.log('Subpath URL audit OK: ' + prefix);
}

for (const file of output.filter((p) => p.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  for (const [, attrs] of html.matchAll(
    /<script([^>]*)>([\s\S]*?)<\/script>/g,
  )) {
    if (!attrs.includes('application/ld+json') && !attrs.includes('src='))
      throw new Error(`Inline executable script violates public CSP: ${file}`);
  }
}
console.log(
  'CSP audit: all executable scripts are external first-party assets',
);

const allowedImages = new Set(
  JSON.parse(await readFile('src/content/images.json', 'utf8')).map(
    (image) => 'dist' + image.localPath,
  ),
);
for (const file of output.filter((p) => p.startsWith('dist/images/')))
  if (!allowedImages.has(file))
    throw new Error('Unselected image entered public output: ' + file);

// App icons must stay inside the deployment base on GitHub Pages.
const manifest = JSON.parse(await readFile('dist/site.webmanifest', 'utf8'));
for (const field of ['id', 'scope', 'start_url']) {
  if (manifest[field] !== prefix)
    throw new Error(`Manifest ${field} escapes deployment base`);
}
for (const size of [192, 512]) {
  if (
    !manifest.icons.some(
      (icon) =>
        icon.src === `${prefix}icon-${size}.png` &&
        icon.sizes === `${size}x${size}` &&
        icon.purpose === 'any',
    )
  )
    throw new Error(`Manifest lacks supplied ${size}px icon`);
}
for (const file of output.filter((p) => p.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  for (const asset of [
    'apple-touch-icon.png',
    'favicon.ico',
    'site.webmanifest',
  ]) {
    if (!html.includes(`href="${prefix}${asset}"`))
      throw new Error(`${file} lacks app icon link ${asset}`);
  }
  if (html.includes('favicon.svg'))
    throw new Error(`${file} references the retired text icon`);
}
console.log('App icon and manifest subpath audit OK: ' + prefix);
