import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  approvedManuscript,
  manuscriptItems,
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
      if (['s205', 's206', 's207', 's208', 's210'].includes(stone.id))
        expect(manuscript.sections).toHaveLength(9);
    });
  }
  it('rejects missing IDs instead of silently displaying old copy', () => {
    expect(() => approvedManuscript('s999')).toThrow();
  });
});
