import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
const batch = stones.slice(160, 180);
const review = JSON.parse(
  readFileSync('docs/research/entries161-180-review.json', 'utf8'),
);
it('records twenty unresolved identity, mineral and history reviews with no source-confirmation date', () => {
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
it('keeps fragile-material cautions, pairing labels and comparison routes coherent', () => {
  expect(new Set(batch.map((s) => s.introduction)).size).toBe(20);
  expect(new Set(batch.map((s) => s.quality)).size).toBe(20);
  expect(stones[171].handling).toContain('水に容易に溶ける');
  expect(stones[171].handling).toContain('湿気');
  expect(stones[168].handling).toContain('摩擦');
  expect(stones[178].introduction).toContain('プラチナ');
  for (const id of ['s161', 's162', 's163', 's164'])
    expect(stones.find((s) => s.id === id)!.related).toEqual(
      ['s161', 's162', 's163', 's164'].filter((x) => x !== id),
    );
  for (const s of batch) {
    expect(s.handling).not.toContain('移行資料の注意メモ');
    expect(s.related).not.toContain(s.id);
    for (const id of s.related)
      expect(stones.find((x) => x.id === id)).toBeDefined();
    for (const id of s.synergyStoneIds || [])
      expect(s.synergyNote).toContain(stones.find((x) => x.id === id)!.name);
  }
});
