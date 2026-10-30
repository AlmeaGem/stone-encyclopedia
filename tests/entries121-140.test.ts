import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
const batch = stones.slice(120, 140);
const review = JSON.parse(
  readFileSync('docs/research/entries121-140-review.json', 'utf8'),
);
it('records twenty pending source reviews without claiming mineral values or original folklore were verified', () => {
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
it('keeps pairing labels and comparison routes coherent while distinguishing the amethyst etymology and story', () => {
  expect(new Set(batch.map((s) => s.introduction)).size).toBe(20);
  expect(new Set(batch.map((s) => s.quality)).size).toBe(20);
  expect(stones[133].legend).toContain('ギリシャ語');
  expect(stones[133].legend).toContain('後世');
  expect(stones[131].synergyNote).toContain('ロッククリスタル');
  for (const s of batch) {
    expect(s.handling).not.toContain('移行資料の注意メモ');
    expect(s.related).not.toContain(s.id);
    for (const id of s.related)
      expect(stones.find((x) => x.id === id)).toBeDefined();
    for (const id of s.synergyStoneIds || [])
      expect(s.synergyNote).toContain(stones.find((x) => x.id === id)!.name);
  }
});
