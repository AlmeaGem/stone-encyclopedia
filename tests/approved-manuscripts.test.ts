import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  approvedManuscript,
  manuscriptItems,
  manuscriptPairings,
} from '../src/lib/approved-manuscripts';
import stones from '../src/content/stones.json' with { type: 'json' };

describe('approved manuscripts', () => {
  for (const stone of stones) {
    it(`${stone.id}: all source paragraphs and extended sections survive presentation`, () => {
      const manuscript = approvedManuscript(stone.id);
      const batch = Math.ceil(Number(stone.id.slice(1)) / 20);
      const record = JSON.parse(
        readFileSync(
          `editorial/manuscripts/approved-chatgpt/batch-${String(batch).padStart(2, '0')}/${stone.id}.json`,
          'utf8',
        ),
      );
      expect(record.catalogName).toBe(stone.name);
      expect(manuscript.sections.map((s) => s.heading)).toEqual(
        [...record.sectionMarkdown.matchAll(/^### (.+)$/gm)].map(
          (match) => match[1],
        ),
      );
      const normalize = (text: string) => text.replace(/[\s／]/g, '');
      for (const section of manuscript.sections) {
        expect(normalize(manuscriptItems(section).join(''))).toBe(
          normalize(section.paragraphs.join('')),
        );
        expect(section.paragraphs.join('')).not.toMatch(/Codex|編集メモ/);
      }
      const pairSections = manuscript.sections.filter(
        (s) => s.kind === 'pairings',
      );
      expect(pairSections).toHaveLength(1);
      const pairs = manuscriptPairings(pairSections[0]);
      expect(pairs.length, stone.id).toBeGreaterThan(1);
      const source = pairSections[0].paragraphs.join('').replace(/\s/g, '');
      expect(pairs.map((p) => p.sourceText).join('').replace(/\s/g, '')).toBe(
        source,
      );
      for (const pair of pairs) {
        const target = stones.find((s) => s.id === pair.stoneId);
        expect(target, `${stone.id} → ${pair.name}`).toBeDefined();
        expect([target!.name, ...target!.aliases]).toContain(pair.name);
        expect(pair.description.trim()).not.toBe('');
      }
      if (['s205', 's206', 's207', 's208', 's210'].includes(stone.id))
        expect(manuscript.sections).toHaveLength(9);
    });
  }
  it('resolves every approved pairing to its named stone without editing source text', () => {
    const byId = new Map(stones.map((stone) => [stone.id, stone]));
    let total = 0;
    let unbolded = 0;
    for (const stone of stones) {
      const sections = approvedManuscript(stone.id).sections.filter(
        (section) => section.kind === 'pairings',
      );
      expect(sections.length, stone.id).toBeGreaterThan(0);
      for (const section of sections) {
        const entries = manuscriptPairings(section);
        expect(entries.length, stone.id).toBeGreaterThan(0);
        for (const entry of entries) {
          total++;
          if (!entry.sourceText.startsWith('**')) unbolded++;
          expect(entry.description.length, stone.id).toBeGreaterThan(0);
          const target = byId.get(entry.stoneId);
          expect(target, stone.id).toBeDefined();
          expect(
            entry.name === target!.name || target!.aliases.includes(entry.name),
            stone.id,
          ).toBe(true);
        }
        const normalize = (value: string) => value.replace(/\s/g, '');
        expect(
          normalize(entries.map((entry) => entry.sourceText).join('')),
          stone.id,
        ).toBe(normalize(section.paragraphs.join('')));
      }
    }
    expect(total).toBeGreaterThan(210);
    expect(unbolded).toBeGreaterThan(0);
  });
  it('rejects missing IDs instead of silently displaying old copy', () => {
    expect(() => approvedManuscript('s999')).toThrow();
  });
});
