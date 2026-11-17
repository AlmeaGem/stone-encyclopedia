import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const base = process.env.PREVIEW_URL || 'https://almeagem.github.io/stone-encyclopedia/';
const stones = JSON.parse(await readFile('src/content/stones.json', 'utf8'));
const copy = JSON.parse(await readFile('src/content/editorial-priority-a.json', 'utf8'));
const entries = Object.entries(copy).map(([id, text]) => ({ stone: stones.find((x) => x.id === id), text }));
if (entries.length !== 10 || entries.some((x) => !x.stone)) throw new Error('10 target stones required');
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const results = [];
await mkdir('test-results/live-preview', { recursive: true });
try {
  for (const [device, width, height] of [['desktop',1440,1000],['mobile',390,844]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: device === 'mobile' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const {stone,text} of entries) {
      const response = await page.goto(base + 'stones/' + stone.slug + '/', {waitUntil:'networkidle'});
      if (!response || response.status() !== 200) throw new Error(`${device} ${stone.id}: detail status ${response?.status()}`);
      const heading = (await page.locator('h1').innerText()).trim();
      if (heading !== stone.name) throw new Error(`${device} ${stone.id}: title ${heading}`);
      const normal = s => s.replace(/\s/g,'');
      const body = normal(await page.locator('#story').innerText());
      for (const paragraph of [text.story,text.meaning,text.wishes]) if (!body.includes(normal(paragraph))) throw new Error(`${device} ${stone.id}: missing approved prose`);
      const entriesLocator = page.locator('#pairing .manuscript-pairings > p');
      if (await entriesLocator.count() !== Object.keys(text.pairings).length) throw new Error(`${device} ${stone.id}: pairing count`);
      for (const [name,description] of Object.entries(text.pairings)) {
        const entry = entriesLocator.filter({has:page.locator('a').filter({hasText:name})});
        if (await entry.count() !== 1 || !normal(await entry.innerText()).includes(normal(description))) throw new Error(`${device} ${stone.id}: pairing ${name}`);
        const href = await entry.locator('a').getAttribute('href');
        const link = await page.request.get(new URL(href,base).href);
        if (!link.ok()) throw new Error(`${device} ${stone.id}: pairing link ${href} ${link.status()}`);
      }
      const img = page.locator('main img').first();
      if (!await img.count()) throw new Error(`${device} ${stone.id}: missing image`);
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
      if (!await img.evaluate(el => el.naturalWidth>0)) throw new Error(`${device} ${stone.id}: failed image`);
      for (const rel of ['prev','next']) {
        const link = page.locator(`.stone-navigation a[rel="${rel}"]`);
        if (await link.count() !== 1) throw new Error(`${device} ${stone.id}: missing ${rel} navigation`);
        const href = await link.getAttribute('href');
        const nav = await page.request.get(new URL(href,base).href);
        if (!nav.ok()) throw new Error(`${device} ${stone.id}: navigation ${href}`);
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${device} ${stone.id}: horizontal overflow`);
      await page.locator('#pairing').scrollIntoViewIfNeeded();
      await page.screenshot({path:`test-results/live-preview/${stone.id}-${device}.png`});
      results.push({device,id:stone.id,detail:200,prose:'ok',pairings:Object.keys(text.pairings).length,image:'ok',navigation:'ok',overflow:false});
    }
    await page.goto(base+'stones/',{waitUntil:'networkidle'});
    const search=page.getByRole('searchbox',{name:'石名・英語名・別名'});
    for(const {stone} of entries) {
      await search.fill(stone.name);
      await page.waitForTimeout(300);
      const visible=page.locator('[data-stone]:visible');
      if (!await visible.count() || !(await visible.first().innerText()).includes(stone.name)) throw new Error(`${device} ${stone.id}: search`);
    }
    if(errors.length) throw new Error(`${device}: browser errors ${errors.join('; ')}`);
    results.push({device,search:'all 10 ok'});
    await page.close();
  }
  await writeFile('test-results/live-preview/results.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
