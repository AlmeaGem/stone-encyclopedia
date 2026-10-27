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
    '出典・確認状況',
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
