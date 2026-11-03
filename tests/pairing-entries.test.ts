import { describe, expect, it } from 'vitest';
import {
  approvedManuscript,
  pairingEntries,
} from '../src/lib/approved-manuscripts';
import expected from './fixtures/approved-pairings.json' with { type: 'json' };

describe('approved pairing names and links', () => {
  it.each(Object.entries(expected))(
    '%s preserves every pairing and resolves the correct stone',
    (id, reference) => {
      const section = approvedManuscript(id).sections.find(
        (s) => s.kind === 'pairings',
      )!;
      const entries = pairingEntries(section);
      expect(
        entries.map((entry) => ({
          name: entry.name,
          id: entry.stoneId,
          slug: entry.slug,
        })),
      ).toEqual(reference);
      expect(entries.map((entry) => entry.source).join('')).toBe(
        section.paragraphs.join(''),
      );
      for (const entry of entries) {
        expect(entry.description.trim().length).toBeGreaterThan(0);
        expect(entry.resolution).not.toBe('ambiguous');
        expect(entry.resolution).not.toBe('unmatched');
      }
    },
  );
  it('prefers an exact official name when the same text is another stone’s alias', () => {
    const section = approvedManuscript('s196').sections.find(
      (s) => s.kind === 'pairings',
    )!;
    expect(
      pairingEntries(section).find((e) => e.name === 'レインボークォーツ')
        ?.stoneId,
    ).toBe('s185');
  });
  it('does not invent links for unregistered or ambiguous names', () => {
    const section = {
      heading: '相性のよい石',
      kind: 'pairings' as const,
      subordinate: false,
      paragraphs: ['未登録の石：説明。'],
    };
    expect(pairingEntries(section)[0]).toMatchObject({
      stoneId: null,
      slug: null,
      resolution: 'unmatched',
    });
  });
});
