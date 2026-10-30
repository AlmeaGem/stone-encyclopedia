import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
import { matches } from '../src/lib/search';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
const batch = stones.slice(40, 60);
const review = JSON.parse(
  readFileSync('docs/research/entries41-60-review.json', 'utf8'),
);
it('records all twenty unresolved evidence reviews without claiming source verification', () => {
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
it('uses distinct buying guidance and preserves the existing pairing identities and searchable spellings', () => {
  expect(new Set(batch.map((s) => s.introduction)).size).toBe(20);
  expect(new Set(batch.map((s) => s.quality)).size).toBe(20);
  for (const s of batch) {
    expect(s.handling).not.toContain('移行資料の注意メモ');
    for (const id of s.synergyStoneIds || [])
      expect(stones.find((x) => x.id === id)).toBeDefined();
  }
  for (const [id, old] of [
    ['s057', 'Tiger Eye'],
    ['s059', 'Bulls Eye'],
    ['s060', 'Hawks Eye'],
  ]) {
    const s = stones.find((s) => s.id === id)!;
    expect(matches(old, [s.english, ...s.aliases].join(' '))).toBe(true);
  }
  expect((stones[44].synergyNote?.length || 0)).toBeGreaterThan(20);
  expect(stones[47].synergyNote).toContain(stones[208].name);
  expect(stones[55].selection).toContain('ブレスレットの材料');
});
