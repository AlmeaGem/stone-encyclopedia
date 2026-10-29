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
    '伝説と、スピリチュアルな意味',
    '相性を考えた組み合わせ',
    '浄化と、取り扱いの注意',
  ]);
  await expect(page.getByText('未確認', { exact: true }).first()).toBeVisible();
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
  await expect(
    page.getByText('回答が完了しました', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.free-completion li')).toHaveCount(3);
  await expect(page.locator('#diagnosis-offer')).toBeHidden();
  await expect(page.locator('.report-boundary h2')).toHaveText(
    'ここから先は有料です',
  );
  await expect(page.locator('.report-boundary')).toContainText(
    '790円（税込・買い切り）',
  );
  await expect(page.locator('.report-boundary')).toContainText(
    'PDF保存・購入後の再閲覧',
  );
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
    page.getByRole('heading', { name: '210種類の写真を選ぶ' }),
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
  await expect(page.locator('.report-offer')).toContainText('販売準備中');
  await expect(page.locator('.report-price').first()).toContainText('790');
  await expect(page.locator('.report-offer .button')).toHaveText(
    '質問に無料で答える →',
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

test('wish pills select, intersect, clear, restore and update the actual count without ranking', async ({
  page,
}) => {
  const raw = JSON.parse(readFileSync('src/content/stones.json', 'utf8')) as {
    id: string;
    wishes: string[];
    themes: string[];
  }[];
  const love = raw.filter((s) => s.wishes.includes('love'));
  await page.goto('/wishes/love/');
  await expect(page.locator('.page-intro + .notice')).toHaveCount(0);
  const buttons = page.locator('[data-wish-tag]');
  expect(await buttons.count()).toBeGreaterThan(2);
  const tags = await buttons.evaluateAll((nodes) =>
    nodes.map((n) => (n as HTMLElement).dataset.wishTag!),
  );
  const chosen: string[] = [];
  const verify = async () => {
    const expected = love.filter((s) =>
      chosen.every((tag) => s.themes.includes(tag)),
    );
    await expect(page.locator('#wish-result-count')).toHaveText(
      `${expected.length}種類の天然石`,
    );
    expect(
      await page
        .locator('[data-stone]:visible')
        .evaluateAll((nodes) =>
          nodes.map((n) => (n as HTMLElement).dataset.wishes),
        ),
    ).toHaveLength(expected.length);
    const actual = await page
      .locator('[data-stone]:visible')
      .evaluateAll((nodes) =>
        nodes.map((n) => JSON.parse((n as HTMLElement).dataset.themes!)),
      );
    for (const themes of actual)
      expect(chosen.every((tag) => themes.includes(tag))).toBe(true);
    if (!expected.length)
      await expect(page.locator('#wish-empty')).toBeVisible();
  };
  await verify();
  for (const tag of tags.slice(0, 3)) {
    await buttons.filter({ hasText: tag }).click();
    chosen.push(tag);
    await expect(buttons.filter({ hasText: tag })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await verify();
  }
  await page.reload();
  await verify();
  await buttons.filter({ hasText: chosen[0] }).click();
  chosen.shift();
  await verify();
  await page.getByRole('button', { name: 'すべて表示', exact: true }).click();
  chosen.length = 0;
  await verify();
  await expect(page.locator('#wish-empty')).toBeHidden();
  await page.goto('/wishes/love/?theme=unregistered');
  await verify();
});

test('category numbers remain horizontal and public pages omit production copy at all required widths', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/wishes/');
    for (const n of await page.locator('.wish-number').all()) {
      expect(
        await n.evaluate((el) => {
          const r = document.createRange();
          r.selectNodeContents(el);
          return [...r.getClientRects()].length;
        }),
      ).toBe(1);
    }
    expect(
      await page.evaluate(() => document.body.scrollWidth <= innerWidth),
    ).toBe(true);
    await page.goto('/wishes/love/');
    for (const button of await page
      .locator('.wish-filter-buttons button')
      .all())
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(() => document.body.scrollWidth <= innerWidth),
    ).toBe(true);
  }
  for (const path of [
    '/',
    '/about/',
    '/terms/',
    '/privacy/',
    '/commerce/',
    '/refund/',
    '/contact/',
    '/articles/editorial-policy/',
    '/articles/inclusions/',
    '/stones/rose-quartz/',
    '/wishes/love/',
    '/stones/',
  ]) {
    await page.goto(path);
    expect(await page.locator('body').innerText()).not.toMatch(
      /編集ガイド|表示確認|移行資料|移行元|掲載ID順|公開ビルド|管理者が/,
    );
  }
  await page.goto('/wishes/wellbeing/');
  await expect(page.locator('.health-note')).toContainText(
    '医療や治療の代わり',
  );
});

test('free and planned paid services are explicit before answering, with no purchasable result', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('.entry-actions a')).toHaveCount(3);
  await expect(page.locator('.entry-actions a').nth(2)).toContainText(
    '結果790円',
  );
  await expect(page.locator('.comparison-card')).toHaveCount(2);
  await expect(page.locator('.report-offer')).toContainText(
    '提供予定・販売準備中',
  );
  await expect(page.locator('.report-features li')).toHaveCount(5);
  await page.goto('/diagnosis/');
  await expect(page.locator('.diagnosis-pricing')).toContainText(
    '質問への回答は無料です',
  );
  await expect(page.locator('.diagnosis-pricing')).toContainText(
    '790円（税込）',
  );
  expect(
    (await page.locator('.diagnosis-pricing').boundingBox())!.y,
  ).toBeLessThan((await page.locator('#questionnaire').boundingBox())!.y);
  for (const name of ['ローズクォーツ', 'アメジスト', 'ラブラドライト'])
    expect(await (await request.get('/diagnosis/')).text()).not.toContain(name);
  await expect(page.locator('[role=dialog]')).toHaveCount(0);
});

test('public sample is seven fixed examples and three combinations, not an answer-dependent report', async ({
  page,
  request,
}) => {
  await page.goto('/sample-report/');
  await expect(page.locator('.sample-scope')).toContainText(
    '架空の回答例に基づく固定サンプル',
  );
  await expect(page.locator('.sample-selections > li')).toHaveCount(7);
  await expect(page.locator('.sample-combinations > article')).toHaveCount(3);
  await expect(page.locator('.sample-paper')).toHaveCount(2);
  const names = await page.locator('.sample-item-heading h3').allTextContents();
  await page.goto('/sample-report/?category=prosperity&paid=true');
  expect(
    await page.locator('.sample-item-heading h3').allTextContents(),
  ).toEqual(names);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    /\/sample-report\/$/,
  );
  for (const link of await page.locator('.sample-selections a').all())
    expect(
      (await request.get((await link.getAttribute('href'))!)).status(),
    ).toBe(200);
  expect((await request.get('/api/reports/personal')).status()).toBe(404);
});

test('article, stone and category ends provide real related links and a restrained report route', async ({
  page,
  request,
}) => {
  for (const path of [
    '/stones/rose-quartz/',
    '/wishes/love/',
    '/articles/inclusions/',
  ]) {
    await page.goto(path);
    await expect(page.locator('.report-nudge')).toContainText('販売準備中');
    const link = page.locator('.report-nudge a').first();
    expect(
      (await request.get((await link.getAttribute('href'))!)).status(),
    ).toBe(200);
  }
  await expect(page.locator('.reading-next .related-links a')).not.toHaveCount(
    0,
  );
  for (const link of await page.locator('.reading-next .related-links a').all())
    expect(
      (await request.get((await link.getAttribute('href'))!)).status(),
    ).toBe(200);
});

test('service comparison and sample stay readable at phone, tablet and desktop widths', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const cards = page.locator('.comparison-card');
    const a = (await cards.nth(0).boundingBox())!,
      b = (await cards.nth(1).boundingBox())!;
    if (width <= 640) expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
    else expect(b.x).toBeGreaterThanOrEqual(a.x + a.width);
    for (const path of ['/diagnosis/', '/sample-report/']) {
      await page.goto(path);
      expect(
        await page.evaluate(() => document.body.scrollWidth <= innerWidth),
      ).toBe(true);
      for (const button of await page.locator('.report-actions a').all())
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  }
});
