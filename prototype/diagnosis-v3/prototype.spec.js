import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(dir, 'draft-data.json'), 'utf8'));
const groups = {
  '恋愛・人との関係': ['恋愛・結婚', '人間関係', '家庭・住まい'],
  'お金・仕事': ['金運・財運', '仕事・成功'],
  '幸運・お守り・挑戦': [
    '願望成就・幸運',
    '魔除け・浄化',
    '挑戦・試験',
    '旅・新しい環境',
  ],
  '心・自分らしさ': [
    '心の安定・癒やし',
    '直感・精神性',
    '美しさ・魅力・人気',
    '学び・才能',
    '健康・生活',
  ],
};
const legacyIds = [
  'love.meet.new_love',
  'love.meet.good_match',
  'love.meet.ideal',
  'love.meet.opportunities',
  'love.meet.approach',
  'love.meet.marriage',
  'love.person.closer',
  'love.person.contact',
  'love.person.progress',
  'love.person.partnership',
  'love.reunion.ex',
  'love.reunion.meet',
  'love.reunion.contact',
  'love.reunion.repair',
  'love.couple.affection',
  'love.couple.respect',
  'love.couple.marriage_progress',
  'love.couple.communication',
  'love.attraction.attention',
  'love.attraction.charm',
  'love.attraction.confidence',
  'love.attraction.natural',
  'love.values.enduring_love',
  'love.values.deep_love',
  'love.values.equality',
  'love.values.mutual_care',
  'love.values.sincerity',
  'relationships.repair',
  'relationships.bonds',
];
const all = data.branches.flatMap((branch) =>
  branch.items.map((item) => ({ ...branch, item })),
);
async function start(page) {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
}
async function clickValue(page, action, value) {
  await page
    .locator(`button[data-action="${action}"]`)
    .filter({ hasText: value })
    .click();
}
async function choose(page, id) {
  const b = all.find((x) => x.item.id === id);
  const group = Object.entries(groups).find(([, values]) =>
    values.includes(b.category),
  )[0];
  await clickValue(page, 'group', group);
  await clickValue(page, 'category', b.category);
  await clickValue(
    page,
    'situation',
    b.category === '恋愛・結婚' ? b.situation : 'まだ決めていない',
  );
  if (await page.locator('button[data-action="subgroup"]').count())
    await clickValue(page, 'subgroup', b.subgroup);
  await page
    .locator(`button[data-action="detail"][data-value="${id}"]`)
    .click();
  await expect(page.getByText(`選んだ願い：${b.item.label}`)).toBeVisible();
}
for (let offset = 0; offset < all.length; offset += 20) {
  test(`全99分類に到達: ${offset + 1}〜${Math.min(offset + 20, all.length)}`, async ({
    page,
  }) => {
    for (const entry of all.slice(offset, offset + 20)) {
      await start(page);
      await choose(page, entry.item.id);
    }
  });
}
for (let offset = 0; offset < data.cases.length; offset += 8) {
  test(`既存24ケースの4画面遷移: ${offset + 1}〜${Math.min(offset + 8, data.cases.length)}`, async ({
    page,
  }) => {
    for (const c of data.cases.slice(offset, offset + 8)) {
      await start(page);
      await choose(page, c.id);
      await page.getByRole('button', { name: '次へ' }).click();
      await expect(
        page.getByRole('heading', { name: 'ほかにも大切にしたいこと' }),
      ).toBeVisible();
      await page.getByRole('button', { name: '今は選ばない' }).click();
      await expect(page.getByLabel('好きな色')).toBeVisible();
      await page.getByRole('button', { name: '次へ' }).click();
      await expect(
        page.getByRole('heading', { name: '回答内容をご確認ください' }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: '診断内容を確認しました' })
        .click();
      await expect(
        page.getByRole('heading', { name: '診断内容を確認しました' }),
      ).toBeVisible();
    }
  });
}
test('主願いの変更・キャンセルとブラウザ履歴で不要な回答を消さない', async ({
  page,
}) => {
  await start(page);
  await choose(page, 'love.meet.ideal');
  await page.locator('[data-action="edit-category"]').click();
  await page.getByRole('button', { name: '変更をやめる' }).click();
  await expect(page.getByText(/選んだ願い：理想の相手/)).toBeVisible();
  await page.locator('[data-action="edit-category"]').click();
  await clickValue(page, 'category', '人間関係');
  await expect(page.getByText(/選んだ願い：/)).toHaveCount(0);
  await page.goBack();
  await page.goBack();
  await expect(page.getByText(/選んだ願い：理想の相手/)).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole('button', { name: '変更をやめる' }),
  ).toBeVisible();
});
test('副願いの重複禁止、変更・解除、未定で完了', async ({ page }) => {
  await start(page);
  await choose(page, 'love.meet.ideal');
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: '願いを追加する' }).click();
  await choose(page, 'love.meet.ideal');
  await page.getByRole('button', { name: 'この願いを保存' }).click();
  await expect(page.getByRole('alert')).toContainText('同じ願い');
  await page.getByRole('button', { name: '追加をやめる' }).click();
  await page.getByRole('button', { name: '願いを追加する' }).click();
  await choose(page, 'finance.income');
  await page.getByRole('button', { name: 'この願いを保存' }).click();
  await expect(page.getByText('収入を増やしたい')).toBeVisible();
  await page.getByRole('button', { name: '追加した願いを変更' }).click();
  await page.getByRole('button', { name: '選んだ願いを変更' }).click();
  await page
    .locator('button[data-action="detail"][data-value="finance.opportunity"]')
    .click();
  await page.getByRole('button', { name: 'この願いを保存' }).click();
  await expect(page.getByText('新たな収入の機会を探したい')).toBeVisible();
  await page.getByRole('button', { name: '追加した願いを変更' }).click();
  await page.getByRole('button', { name: '追加をやめる' }).click();
  await expect(page.getByText('新たな収入の機会を探したい')).toBeVisible();
  await page.getByRole('button', { name: '解除' }).click();
  await expect(page.getByText('新たな収入の機会を探したい')).toHaveCount(0);
  await page.getByRole('button', { name: '願いを追加する' }).click();
  await page.getByRole('button', { name: 'わからない・その他' }).click();
  await expect(
    page.getByRole('button', { name: '今は選ばない' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '今は選ばない' }).click();
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: '診断内容を確認しました' }).click();
  await expect(
    page.getByText(/石の推薦・採点・購入は行いません/),
  ).toBeVisible();
});
for (const width of [375, 390, 430, 768, 1440]) {
  test(`${width}pxで表示・ラベル・フォーカス`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await start(page);
    await expect(
      page.getByRole('progressbar', { name: '回答の進み具合' }),
    ).toHaveJSProperty('value', 1);
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: '恋愛・人との関係' }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'どのテーマに近いですか？' }),
    ).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const b of await page.locator('button').all())
      expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: `test-results/diagnosis-prototype/${width}.png`,
      fullPage: true,
    });
    await start(page);
    await choose(page, 'love.meet.ideal');
    for (let step = 1; step <= 4; step++) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/diagnosis-prototype/${width}-step-${step}.png`,
        fullPage: true,
      });
      if (step < 4) {
        const next = step === 2 ? '今は選ばない' : '次へ';
        await page.getByRole('button', { name: next }).click();
      }
    }
  });
}

test('第2・第3の願いと好みを保持し、主願いの重複を確認時に検出', async ({
  page,
}) => {
  await start(page);
  await choose(page, 'love.meet.ideal');
  await page.getByRole('button', { name: '次へ' }).click();
  for (const id of ['finance.income', 'finance.windfall']) {
    await page.getByRole('button', { name: '願いを追加する' }).click();
    await choose(page, id);
    await page.getByRole('button', { name: 'この願いを保存' }).click();
  }
  await expect(
    page.getByRole('button', { name: '願いを追加する' }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('収入を増やしたい')).toBeVisible();
  await expect(page.getByText('思いがけない収入を願う')).toBeVisible();
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByLabel('好きな色').selectOption('緑');
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: '主願いを変更' }).click();
  await page.getByRole('button', { name: 'テーマを変更' }).click();
  await choose(page, 'finance.income');
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: '次へ' }).click();
  await expect(page.getByLabel('好きな色')).toHaveValue('緑');
  await page.getByRole('button', { name: '次へ' }).click();
  await expect(page.getByRole('alert')).toContainText('重複');
  await expect(
    page.getByRole('button', { name: '診断内容を確認しました' }),
  ).toHaveCount(0);
});

test('14分類と既存29 IDの互換性を維持', () => {
  expect(new Set(data.branches.map((b) => b.category)).size).toBe(14);
  const ids = all.map((x) => x.item.id);
  expect(ids).toHaveLength(99);
  expect(new Set(ids).size).toBe(99);
  for (const id of legacyIds) expect(ids).toContain(id);
  expect(data.cases).toHaveLength(24);
});

test('sessionStorageが使えなくても回答し外部へ送らない', async ({ page }) => {
  const external = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4177/'))
      external.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
  await expect(
    page.getByText(
      'このブラウザでは回答を保存できません。再読み込みすると消えます。',
    ),
  ).toBeVisible();
  await choose(page, 'love.meet.ideal');
  await page.getByRole('button', { name: '次へ' }).click();
  await expect(
    page.getByRole('heading', { name: 'ほかにも大切にしたいこと' }),
  ).toBeVisible();
  expect(external).toEqual([]);
});
