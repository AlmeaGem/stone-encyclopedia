import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
const batch = stones.slice(80, 100);
const review = JSON.parse(
  readFileSync('docs/research/entries81-100-review.json', 'utf8'),
);
it('lists all twenty pending source reviews without claiming mineral or historical verification', () => {
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
it('distinguishes buying guidance and checks the existing pairing and jade-material boundaries', () => {
  expect(new Set(batch.map((s) => s.introduction)).size).toBe(20);
  expect(new Set(batch.map((s) => s.quality)).size).toBe(20);
  expect((stones[94].legend?.length || 0)).toBeGreaterThan(20);
  expect(stones[90].synergyStoneIds).toEqual(['s205', 's208']);
  for (const id of stones[90].synergyStoneIds || []) {
    expect(stones[90].synergyNote).toContain(
      stones.find((s) => s.id === id)!.name,
    );
  }
  for (const s of batch) expect(s.handling).not.toContain('移行資料の注意メモ');
});
