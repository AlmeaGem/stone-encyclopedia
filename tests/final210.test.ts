import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
import { matches, stoneSearchTerms } from '../src/lib/search';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
const categories = JSON.parse(
  readFileSync('src/content/categories.json', 'utf8'),
);
const register = JSON.parse(
  readFileSync('docs/research/final210-external-review-register.json', 'utf8'),
);
it('preserves all 210 identities, searchable names and aliases, valid wishes and related/pairing routes', () => {
  expect(stones.map((s) => s.id)).toEqual(
    Array.from({ length: 210 }, (_, i) => `s${String(i + 1).padStart(3, '0')}`),
  );
  expect(new Set(stones.map((s) => s.slug)).size).toBe(210);
  expect(categories).toHaveLength(12);
  for (const s of stones) {
    expect(s.aliases.some((alias) => /注意|要確認|未確認/.test(alias))).toBe(
      false,
    );
    for (const q of [s.name, s.english, ...s.aliases])
      expect(matches(q, stoneSearchTerms(s, categories))).toBe(true);
    for (const id of s.wishes)
      expect(categories.some((c: { id: string }) => c.id === id)).toBe(true);
    for (const id of [...s.related, ...(s.synergyStoneIds || [])]) {
      expect(id).not.toBe(s.id);
      expect(stones.find((x) => x.id === id)).toBeDefined();
    }
  }
});
it('covers every stone in the external follow-up register without overwriting legacy source dates', () => {
  expect(register.map((r: { id: string }) => r.id)).toEqual(
    stones.map((s) => s.id),
  );
  for (const r of register) {
    expect(r.externalStatus).toBe('unverified');
    expect(r.checkedAt).toBeNull();
    expect(
      [...r.existingReferenceUrls, ...r.candidateUrls].length,
    ).toBeGreaterThan(0);
    expect(['P1', 'P2']).toContain(r.priority);
  }
});
it('keeps last thirty shape/trade names distinct from guaranteed effects and links to the named pairing stones', () => {
  const last = stones.slice(180);
  expect(new Set(last.map((s) => s.introduction)).size).toBe(30);
  expect(new Set(last.map((s) => s.quality)).size).toBe(30);
  expect(stones[203].quality).toContain('古代文明');
  expect(stones[195].selection).toContain('治療作用');
  expect(stones[209].handling).toContain('星の見え方');
  for (const s of last) {
    expect(s.handling).not.toContain('移行資料の注意メモ');
    for (const id of s.synergyStoneIds || [])
      expect(s.synergyNote).toContain(stones.find((x) => x.id === id)!.name);
  }
});
