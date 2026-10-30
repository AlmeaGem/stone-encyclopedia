import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
const batch = stones.slice(140, 160);
const review = JSON.parse(
  readFileSync('docs/research/entries141-160-review.json', 'utf8'),
);
it('preserves twenty pending evidence reviews without assigning source confirmation dates', () => {
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
it('keeps coatings, trade names and comparison links distinct from mineral identity and guaranteed effects', () => {
  expect(new Set(batch.map((s) => s.introduction)).size).toBe(20);
  expect(new Set(batch.map((s) => s.quality)).size).toBe(20);
  expect(stones[146].handling).toMatch(/膜|コーティング/u);
  expect(stones[144].introduction).toContain('名称');
  expect(stones[147].legend).toContain('地域・時代');
  expect(stones[147].synergyStoneIds).toEqual(['s133', 's047']);
  for (const s of batch) {
    expect(s.handling).not.toContain('移行資料の注意メモ');
    expect(s.related).not.toContain(s.id);
    for (const id of s.related)
      expect(stones.find((x) => x.id === id)).toBeDefined();
    for (const id of s.synergyStoneIds || [])
      expect(s.synergyNote).toContain(stones.find((x) => x.id === id)!.name);
  }
});
