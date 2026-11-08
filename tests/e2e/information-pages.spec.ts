import { test, expect } from '@playwright/test';

const pages = [
  ['about', 'この図鑑について', '210種類の天然石や宝石'],
  ['terms', '利用規約', '法令で認められる引用'],
  ['privacy', 'プライバシーポリシー', '同じブラウザ・端末内'],
  ['commerce', '特定商取引法に基づく表記', '鈴木セイラ'],
  ['refund', '返金・キャンセルポリシー', '法令上認められるお客様の権利'],
  ['contact', 'お問い合わせ', '公式LINEは現在準備中'],
] as const;

test('information pages preserve layout, approved copy and contact links', async ({
  page,
}) => {
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, title, copy] of pages) {
      await page.goto(`/${path}/`);
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page.locator('main')).toContainText(copy);
      await expect(page.getByText('詳しい編集方針')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex,nofollow',
      );
    }
    await page.goto('/contact/');
    await expect(
      page.getByRole('link', { name: 'almeagem@gmail.com' }),
    ).toHaveAttribute('href', 'mailto:almeagem@gmail.com');
    await expect(page.getByRole('link', { name: /LINE/ })).toHaveCount(0);
  }
  await page.goto('/articles/editorial-policy/');
  await expect(page.locator('h1')).toBeVisible();
});
