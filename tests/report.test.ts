import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/schema';
import {
  sampleSelections,
  sampleCombinations,
  fictionalAnswers,
} from '../src/lib/sample-report';

it('keeps a substantial fixed fictional sample separate from the questionnaire and its answers', () => {
  const stones = validateCatalog(
    JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
  );
  expect(sampleSelections).toHaveLength(7);
  expect(new Set(sampleSelections.map((s) => s.id)).size).toBe(7);
  expect(
    sampleSelections.every(
      (s) =>
        stones.some((stone) => stone.id === s.id) &&
        s.reason.length > 60 &&
        s.quality.length > 50,
    ),
  ).toBe(true);
  expect(sampleCombinations).toHaveLength(3);
  for (const combination of sampleCombinations)
    expect(
      combination.ids.every((id) => sampleSelections.some((s) => s.id === id)),
    ).toBe(true);
  expect(fictionalAnswers.length).toBeGreaterThanOrEqual(5);
  expect(readFileSync('src/lib/questionnaire.ts', 'utf8')).not.toMatch(
    /sample-report|sampleSelections|sampleCombinations|stoneById/,
  );
});
