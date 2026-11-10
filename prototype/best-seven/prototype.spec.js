import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recommend } from './engine.js';
const dir = dirname(fileURLToPath(import.meta.url));
const review = JSON.parse(readFileSync(join(dir, 'review-data.json'), 'utf8'));
const wishes = JSON.parse(
  readFileSync(join(dir, '../diagnosis-v3/draft-data.json'), 'utf8'),
);
for (let offset = 0; offset < wishes.cases.length; offset += 8) {
  test(`24ケースの候補と不足案内 ${offset + 1}〜${Math.min(offset + 8, wishes.cases.length)}`, async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('select[name="primary"] option')).toHaveCount(
      100,
    );
    for (const entry of wishes.cases.slice(offset, offset + 8)) {
      await page.locator('select[name="primary"]').selectOption(entry.id);
      await page.getByRole('button', { name: '試作結果を確認' }).click();
      const expected = recommend({ primary: entry.id }, review);
      await expect(page.locator('#results')).toContainText(
        `候補：${expected.count}件`,
      );
      await expect(page.locator('#results article')).toHaveCount(
        Math.min(expected.count, 7),
      );
      await expect(page.locator('#results')).toContainText(
        '正式推薦ではありません',
      );
      for (const r of expected.results)
        await expect(page.locator('#results')).toContainText(r.stoneName);
    }
  });
}
test('根拠・同じ原稿の加点抑制・未確認の好みと回避条件', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('select[name="primary"] option')).toHaveCount(100);
  await page
    .locator('select[name="primary"]')
    .selectOption('love.person.progress');
  await page
    .locator('select[name="secondary1"]')
    .selectOption('love.attraction.charm');
  await page.locator('select[name="color"]').selectOption('ピンク');
  await page.getByRole('button', { name: '試作結果を確認' }).click();
  await expect(page.locator('#results')).toContainText('原稿の根拠：');
  await expect(page.locator('#results')).toContainText(
    '副願いへの重複加点は行いません',
  );
  await expect(page.locator('#results')).toContainText('採点していません');
  await page.locator('select[name="avoid"]').selectOption('濃い色');
  await page.getByRole('button', { name: '試作結果を確認' }).click();
  await expect(page.locator('#results')).toContainText('候補：0件');
  await expect(page.locator('#results')).toContainText(
    '確認できない石も候補から外しました',
  );
});
for (const width of [375, 390, 430, 768, 1440]) {
  test(`${width}pxで表示・操作可能`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('select[name="primary"] option')).toHaveCount(
      100,
    );
    await page
      .locator('select[name="primary"]')
      .selectOption('love.meet.ideal');
    await page.getByRole('button', { name: '試作結果を確認' }).click();
    await expect(page.locator('#results')).toContainText('候補：6件');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/best-seven/${width}.png`,
      fullPage: true,
    });
  });
}
