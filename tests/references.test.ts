import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { publicReferences, publicHandling } from '../src/lib/references';
import { validateCatalog } from '../src/lib/schema';

it('keeps migration notes internally while excluding them from all 210 public reference lists', () => {
  const stones = validateCatalog(
    JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
  );
  expect(stones).toHaveLength(210);
  for (const stone of stones) {
    const before = JSON.stringify(stone);
    expect(
      publicReferences(stone.sources).some((s) => s.label.includes('移行資料')),
    ).toBe(false);
    expect(JSON.stringify(stone)).toBe(before);
    expect(stone.mineral.length).toBeGreaterThan(0);
    expect(
      stone.sources.every((s) => !/移行資料|内部管理/u.test(s.label)),
    ).toBe(true);
  }
});
it('preserves real web citations and print bibliography without requiring a URL', () => {
  const web = {
    label: 'GIA Gem Encyclopedia',
    url: 'https://www.gia.edu/gem-encyclopedia',
    checkedAt: '2026-10-27',
    note: '鉱物・宝石の参考資料',
  };
  const book = {
    label: '正式な書名・著者・版を記載した参考文献',
    url: '',
    checkedAt: null,
    note: '書誌情報',
  };
  expect(publicReferences([web, book])).toEqual([web, book]);
});

it('keeps care warnings while removing the migration label only from presentation', () => {
  const note =
    '移行資料の注意メモ：熱注意。素材・処理・仕上げを購入先に確認してください。';
  expect(publicHandling(note)).toBe(
    '取り扱いの注意：熱注意。素材・処理・仕上げを購入先に確認してください。',
  );
  expect(publicHandling('水に注意してください。')).toBe(
    '水に注意してください。',
  );
});
