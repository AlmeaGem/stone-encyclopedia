import { describe, it, expect } from 'vitest';
import themes from '../src/content/story-themes.json' with { type: 'json' };
import stones from '../src/content/stones.json' with { type: 'json' };
import images from '../src/content/images.json' with { type: 'json' };
import { approvedManuscript } from '../src/lib/approved-manuscripts';
describe('story collection', () => {
  it('uses stable unique theme IDs and existing approved stones and images', () => {
    expect(themes).toHaveLength(5);
    expect(new Set(themes.map((t) => t.id)).size).toBe(5);
    for (const theme of themes) {
      expect(theme.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(new Set(theme.stones).size).toBe(theme.stones.length);
      expect(theme.stones.length).toBeGreaterThan(1);
      expect(theme.stones).toContain(theme.cover);
      for (const id of theme.stones) {
        expect(stones.find((s) => s.id === id)).toBeDefined();
        expect(
          images.find(
            (i) => i.stoneId === id && i.status === 'approved' && i.localPath,
          ),
        ).toBeDefined();
        expect(approvedManuscript(id).catchphrase).toBeTruthy();
      }
    }
  });
});
