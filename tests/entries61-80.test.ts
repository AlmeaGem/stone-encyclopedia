import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
import { matches } from '../src/lib/search';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
const batch = stones.slice(60, 80);
const review = JSON.parse(
  readFileSync('docs/research/entries61-80-review.json', 'utf8'),
);
it('records all twenty pending reviews without converting a source candidate into verified evidence', () => {
  expect(review.map((r: { id: string }) => r.id)).toEqual(
    batch.map((s) => s.id),
  );
  for (const r of review) {
    expect(r.externalStatus).toBe('unverified');
    expect(r.checkedAt).toBeNull();
    expect(r.referenceUrl).toMatch(/^https:\/\//);
    expect(r.checks.length).toBeGreaterThan(30);
  }
});
it('keeps optical trade names searchable and separates unverified lore from physical use', () => {
  expect(new Set(batch.map((s) => s.introduction)).size).toBe(20);
  expect(new Set(batch.map((s) => s.quality)).size).toBe(20);
  const cat = stones[64];
  expect(
    matches(
      'Cats Eye Orange Rutilated Quartz',
      [cat.english, ...cat.aliases].join(' '),
    ),
  ).toBe(true);
  expect(stones[62].legend).not.toContain('口に含む');
  expect(stones[71].legendSourceLabel).toContain('個別の歴史記事は未特定');
  expect(stones[79].legend).toContain('ネフライト');
  expect(stones[67].handling).toContain('粉を出す');
  for (const s of batch) {
    expect(s.handling).not.toContain('移行資料の注意メモ');
    for (const id of s.synergyStoneIds || [])
      expect(stones.find((x) => x.id === id)).toBeDefined();
  }
});
