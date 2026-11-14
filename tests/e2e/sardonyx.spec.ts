import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const sources = ['editorial/manuscripts/s211/SARDONYX-ADDITIONAL.md'];
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
test('sardonyx integrates approved texts, image, pairings and responsive layout', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto(`${base}stones/sardonyx/`);
  await expect(page.locator('h1')).toHaveText('サードオニキス');
  await expect(page.locator('.stone-figure.detail img')).toHaveAttribute(
    'src',
    /\/images\/s211\//,
  );
  await expect(page.locator('.image-impression-label').first()).toHaveText(
    '※ イメージ画像',
  );
  const text = (await page.locator('main').innerText()).replace(/\s/g, '');
  for (const file of sources) {
    const lines = readFileSync(file, 'utf8')
      .split('\n')
      .map((line) =>
        line
          .trim()
          .replace(/^#+\s*/, '')
          .replace(/^-\s*/, '')
          .replace(/\*/g, ''),
      )
      .filter((line) => line && line !== '--' && !line.startsWith('|'));
    for (const line of lines) {
      if (
        line === 'サードオニキス｜追加原稿' ||
        line === 'サードオニキス｜赤縞瑪瑙'
      )
        continue;
      if (
        line ===
        'ともに笑った時間も、困難を乗り越えた日々も、そのすべてが大切なつながりを育てていきます。'
      ) {
        expect(text).toContain(
          'ともに笑った時間も、意見がすれ違った日も、困難を乗り越えた日々も、そのすべてが大切なつながりを育てていきます。',
        );
        continue;
      }
      expect(text, line).toContain(line.replace(/\s/g, ''));
    }
  }
  const pairs = page.locator('.supplement a.stone-name');
  expect(await pairs.count()).toBe(4);
  for (const line of [
    '女性の幸せや家庭の安定を願う石としても紹介されています。',
    '結婚生活を大切にしたいときや、家族の幸せを願うときにおすすめです。',
    '何気ない会話や、そばにいてくれる安心感。',
  ])
    expect(text).toContain(line);
  for (const link of await pairs.all()) {
    const target = await link.getAttribute('href');
    expect((await page.request.get(target!)).ok(), target!).toBe(true);
  }
  await expect(page.locator('a[rel="prev"]')).toHaveAttribute(
    'href',
    `${base}stones/star-rose-quartz/`,
  );
  await expect(
    page.getByRole('heading', { name: '鉱物・物理的な情報', exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: '浄化・お手入れ', exact: true }),
  ).toHaveCount(1);
  for (const name of [
    '形状の違い',
    '模造品・処理石を確認する',
    '浄化と、取り扱いの注意',
  ])
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(
      0,
    );
  await expect(page.locator('.english-title')).toContainText('SARDONYX');
  const message = page
    .locator('section')
    .filter({
      has: page.getByRole('heading', {
        name: 'サードオニキスを選ぶあなたへ',
        exact: true,
      }),
    })
    .last();
  await expect(message.locator('p').last()).toHaveText(
    'ALMÉA GEM｜天然石の意味と物語',
  );
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const split = await page.locator('.stone-name').evaluateAll((nodes) =>
      nodes.some((node) => {
        const text = [...node.childNodes].find(
          (child) => child.nodeType === Node.TEXT_NODE,
        );
        if (!text) return false;
        const range = document.createRange();
        range.selectNodeContents(text);
        return range.getClientRects().length > 1;
      }),
    );
    expect(split, `${width}px`).toBe(false);
  }
  await page.goto(`${base}stones/`);
  await page
    .getByRole('searchbox', { name: '石名・英語名・別名' })
    .fill('Sardonyx');
  await expect(
    page.locator('[data-stone]:visible').filter({ hasText: 'サードオニキス' }),
  ).toHaveCount(1);
});
