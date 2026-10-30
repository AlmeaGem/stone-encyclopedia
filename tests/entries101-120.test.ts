import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
const batch = stones.slice(100, 120);
const review = JSON.parse(
  readFileSync('docs/research/entries101-120-review.json', 'utf8'),
);
it('records twenty unresolved source reviews without claiming formal mineral or historical verification', () => {
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
it('supports material comparison without treating links as mineral identity or guaranteed synergy', () => {
  expect(new Set(batch.map((s) => s.introduction)).size).toBe(20);
  expect(new Set(batch.map((s) => s.quality)).size).toBe(20);
  for (const id of ['s115', 's116', 's117', 's118']) {
    const s = stones.find((s) => s.id === id)!;
    expect(s.related).toEqual(
      ['s115', 's116', 's117', 's118'].filter((other) => other !== id),
    );
  }
  for (const s of batch) {
    expect(s.handling).not.toContain('移行資料の注意メモ');
    for (const id of [...s.related, ...(s.synergyStoneIds || [])])
      expect(stones.find((x) => x.id === id)).toBeDefined();
  }
  expect((stones[100].synergyNote?.length || 0)).toBeGreaterThan(20);
  expect(stones[109].legendSourceLabel).toContain('個別の伝承記事は未確認');
});
