import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const stones = JSON.parse(readFileSync('src/content/stones.json', 'utf8')) as {
  slug: string;
  name: string;
}[];
test('editorial home has immediate content, separate navigation and no mobile overflow', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /本物の石は\s*あなたのパワーになる。/,
  );
  await expect(page.locator('.stone-card')).toHaveCount(6);
  await expect(
    page.getByRole('searchbox', { name: '石名・英語名・別名' }),
  ).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.screenshot({ path: test.info().outputPath('home-viewport.png') });
  await page.screenshot({
    path: test.info().outputPath('home.png'),
    fullPage: true,
  });
});
test('Japanese, English, aliases and kana searches, pagination, theme and color filters work', async ({
  page,
}) => {
  await page.goto('/stones/');
  const input = page.getByRole('searchbox', { name: '石名・英語名・別名' });
  await expect(page.locator('[data-stone]:visible')).toHaveCount(24);
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await expect(page.locator('[data-page]')).toHaveText('2 / 9');
  for (const q of ['Rose Quartz', '紅水晶', 'ろーずくぉーつ']) {
    await input.fill(q);
    await expect(page.locator('[data-stone]:visible').first()).toContainText(
      'ローズクォーツ',
    );
  }
  await input.fill('存在しない石ABCDE');
  await expect(
    page.getByText('一致する石が見つかりません。', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: '条件をクリア' }).click();
  await page
    .getByRole('combobox', { name: '願いのテーマ', exact: true })
    .selectOption('love');
  expect(await page.locator('[data-stone]:visible').count()).toBeGreaterThan(0);
  await page
    .getByRole('combobox', { name: '色のイメージ', exact: true })
    .selectOption('ピンク');
  for (const card of await page.locator('[data-stone]:visible').all())
    expect(await card.getAttribute('data-colors')).toContain('ピンク');
  await page.screenshot({
    path: test.info().outputPath('search.png'),
    fullPage: true,
  });
});
test('detail separates facts, quality and symbolism, with sources, internal links and image placeholders', async ({
  page,
}) => {
  await page.goto('/stones/rose-quartz/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'ローズクォーツ',
  );
  await expect(page.locator('h2')).toContainText([
    '鉱物・物理的な情報',
    '宝石としての見方・選び方',
    '想いを託す、象徴と物語',
    '浄化と、取り扱いの注意',
  ]);
  await expect(
    page.getByText('未確認・情報整備中', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.stone-placeholder.detail')).toHaveAttribute(
    'aria-label',
    '色の抽象イメージ。実物写真ではありません',
  );
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    /\/stones\/rose-quartz\/$/,
  );
  expect(
    JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .first()
        .textContent())!,
    ).headline,
  ).toContain('ローズクォーツ');
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.screenshot({
    path: test.info().outputPath('detail.png'),
    fullPage: true,
  });
});
test('all 210 pages exist and have distinct canonical URLs, titles and sitemap entries', async ({
  request,
}) => {
  const canonicals = new Set<string>(),
    titles = new Set<string>();
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (let offset = 0; offset < stones.length; offset += 15) {
    await Promise.all(
      stones.slice(offset, offset + 15).map(async (stone) => {
        const response = await request.get(`/stones/${stone.slug}/`);
        expect(response.status()).toBe(200);
        const html = await response.text(),
          canonical = /rel="canonical" href="([^"]+)"/.exec(html)?.[1],
          title = /<title>([^<]+)<\/title>/.exec(html)?.[1];
        expect(canonical).toBeTruthy();
        expect(title).toContain(stone.name);
        expect(html).not.toContain('出典・確認状況');
        expect(html).not.toContain('出典確認状況');
        expect(html).not.toContain('移行資料');
        canonicals.add(canonical!);
        titles.add(title!);
        expect(sitemap).toContain(`/stones/${stone.slug}/`);
      }),
    );
  }
  expect(canonicals.size).toBe(210);
  expect(titles.size).toBe(210);
  expect(await (await request.get('/robots.txt')).text()).toContain(
    'Disallow: /',
  );
});
test('questions enforce required choices and two sub-wishes but never reveal or sell personal results', async ({
  page,
}) => {
  let sends = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST') sends++;
  });
  await page.goto('/diagnosis/');
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('選択');
  await page
    .locator('[data-step="1"]')
    .getByLabel('恋愛・結婚', { exact: true })
    .check();
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await page.getByLabel('新しい出会い', { exact: true }).check();
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await page
    .locator('[data-step="3"]')
    .getByLabel('金運・仕事・成功', { exact: true })
    .check();
  await page
    .locator('[data-step="3"]')
    .getByLabel('開運・願望成就・引き寄せ', { exact: true })
    .check();
  await page
    .locator('[data-step="3"]')
    .getByLabel('魔除け・浄化・解放', { exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('2つまで');
  await expect(
    page
      .locator('[data-step="3"]')
      .getByLabel('魔除け・浄化・解放', { exact: true }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await page.getByLabel('新しい一歩を考えている', { exact: true }).check();
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await page
    .getByRole('combobox', { name: '大切にしたいこと', exact: true })
    .selectOption('バランス');
  await page
    .getByRole('combobox', { name: '好きな色や雰囲気', exact: true })
    .selectOption('ピンク・やわらかい');
  await page
    .getByRole('combobox', {
      name: '石を選ぶ際の予算帯（レポート料金ではありません）',
      exact: true,
    })
    .selectOption('未定');
  await page.getByRole('button', { name: '次へ →', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '購入・決済は準備中' }),
  ).toBeDisabled();
  await expect(page.locator('#answers')).toContainText('新しい出会い');
  expect(sends).toBe(0);
  await page.screenshot({
    path: test.info().outputPath('questions.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator('#step-label')).toHaveText('STEP 1 / 6');
});
test('public output has no private editor, paid APIs or report access bypass', async ({
  request,
  page,
}) => {
  for (const path of [
    '/admin/',
    '/api/state',
    '/api/login',
    '/.editor/candidates.json',
    '/reports/anything/',
    '/report/?paid=true',
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain('csrf');
  }
  await page.goto('/wishes/');
  await expect(page.locator('.wish-link')).toHaveCount(12);
  await page.goto('/articles/');
  await expect(page.locator('.article-card')).toHaveCount(6);
});
test('private editor authenticates, edits a draft and keeps public source unchanged until review', async ({
  page,
  request,
}) => {
  const id = test.info().project.name === 'mobile' ? 's134' : 's107';
  const original = id === 's134' ? 'アメジスト' : 'ローズクォーツ';
  const edited = '下書きの' + original;
  expect((await request.get('http://127.0.0.1:4322/api/state')).status()).toBe(
    401,
  );
  await page.goto('http://127.0.0.1:4322/login');
  await page
    .getByLabel('パスフレーズ', { exact: true })
    .fill('browser-fixture-only-passphrase-32');
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '図鑑の編集室' }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: '項目', exact: true })
    .selectOption(id);
  await page.getByRole('button', { name: '開く', exact: true }).click();
  await expect(
    page.getByLabel('石名・カテゴリ名', { exact: true }),
  ).toHaveValue(original);
  await page.getByLabel('石名・カテゴリ名', { exact: true }).fill(edited);
  await page.getByRole('button', { name: '下書きを保存', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    '公開サイトには反映していません',
  );
  await page.reload();
  await page
    .getByRole('combobox', { name: '項目', exact: true })
    .selectOption(id);
  await page.getByRole('button', { name: '開く', exact: true }).click();
  await expect(
    page.getByLabel('石名・カテゴリ名', { exact: true }),
  ).toHaveValue(edited);
  await page
    .getByRole('button', { name: '写真候補・ライセンス', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: '石ごとの画像候補' }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('editor.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'ログアウト', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '編集者ログイン' }),
  ).toBeVisible();
});

test('search works under the exact production Content Security Policy', async ({
  page,
}) => {
  const policy = readFileSync('public/_headers', 'utf8')
    .split('\n')
    .find((line) => line.includes('Content-Security-Policy:'))!
    .split('Content-Security-Policy:')[1]
    .trim();
  await page.route('**/stones/', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': policy },
    });
  });
  await page.goto('/stones/');
  await expect(page.locator('[data-stone]:visible')).toHaveCount(24);
  await page
    .getByRole('searchbox', { name: '石名・英語名・別名' })
    .fill('紅水晶');
  await expect(page.locator('[data-stone]:visible').first()).toContainText(
    'ローズクォーツ',
  );
  await expect(
    page.locator('script:not([src]):not([type="application/ld+json"])'),
  ).toHaveCount(0);
});

test('home offers general wish search, real editorial destinations and an honest premium preview', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('.brand-symbol svg')).toBeVisible();
  await expect(page.locator('.home-hero img')).toHaveCount(0);
  await expect(page.locator('.wish-search-links a')).toHaveCount(12);
  const links = page.locator('.three-views a');
  await expect(links).toHaveCount(3);
  for (const link of await links.all()) {
    const href = await link.getAttribute('href');
    expect((await request.get(href!)).status()).toBe(200);
    await expect(link).toContainText('詳しく見る');
  }
  await expect(page.locator('.report-teaser')).toContainText('販売準備中');
  await expect(page.locator('.premium-price')).toContainText('790');
  await expect(page.locator('.report-teaser a')).toHaveText(
    '質問画面を無料で体験 →',
  );
  await page
    .getByRole('searchbox', { name: '石名・英語名・別名' })
    .fill('仕事運');
  await page.locator('.home-search button').click();
  await expect(page).toHaveURL(/stones\/\?q=/);
  expect(await page.locator('[data-stone]:visible').count()).toBeGreaterThan(0);
  for (const card of await page.locator('[data-stone]:visible').all())
    expect((await card.getAttribute('data-wishes'))!.split(',')).toContain(
      'prosperity',
    );
  await page.goto('/wishes/');
  expect(await page.locator('.wish-number').allTextContents()).toEqual(
    Array.from({ length: 12 }, (_, i) => String(i + 1)),
  );
});

test('375, 390 and 430px keep Japanese title phrases intact and search targets separated', async ({
  page,
}) => {
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    expect(
      await page.evaluate(() => document.body.scrollWidth <= innerWidth),
    ).toBe(true);
    await expect(page.locator('.library-title')).toHaveText(
      'POWER STONE ENCYCLOPEDIA',
    );
    for (const phrase of await page.locator('.library-title > span').all()) {
      expect(
        await phrase.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
    const input = page.locator('#home-q');
    await input.focus();
    const a = await input.boundingBox(),
      b = await page.locator('.home-search button').boundingBox();
    expect(b!.x - a!.x - a!.width).toBeGreaterThanOrEqual(11);
    const phrase = page
      .locator('.article-title span')
      .filter({ hasText: '名前より先に、' });
    await expect(phrase).toHaveCount(1);
    expect(
      await phrase.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set(
          [...range.getClientRects()].map((r) => Math.round(r.top)),
        ).size;
      }),
    ).toBe(1);
    for (const link of await page.locator('.wish-search-links a').all()) {
      const bounds = await link.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    await page.goto('/articles/');
    await expect(page.locator('.article-title').first()).toHaveText(
      'はじめての天然石。名前より先に、見たいこと。',
    );
    expect(
      await page.evaluate(() => document.body.scrollWidth <= innerWidth),
    ).toBe(true);
  }
});

test('card actions share a bottom inset and article detail phrases do not split on phones', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/stones/?q=quartz', '/wishes/love/']) {
      await page.goto(path);
      const gaps = await page
        .locator('.stone-card:visible')
        .evaluateAll((cards) =>
          cards.map((card) => {
            const action = card
              .querySelector('.card-arrow')!
              .getBoundingClientRect();
            const theme = card
              .querySelector('.card-theme')!
              .getBoundingClientRect();
            if (action.top < theme.bottom + 10)
              throw new Error('action overlaps text');
            return card.getBoundingClientRect().bottom - action.bottom;
          }),
        );
      expect(gaps.length).toBeGreaterThan(1);
      expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1);
    }
    await page.goto('/articles/inclusions/');
    await expect(page.locator('h1.article-title')).toHaveText(
      '内包物と模様。完璧ではない、美しさ。',
    );
    for (const phrase of await page.locator('h1.article-title > span').all()) {
      expect(
        await phrase.evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return new Set(
            [...range.getClientRects()].map((r) => Math.round(r.top)),
          ).size;
        }),
      ).toBe(1);
    }
    expect(
      await page.evaluate(() => document.body.scrollWidth <= innerWidth),
    ).toBe(true);
  }
});
