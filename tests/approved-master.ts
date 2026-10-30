import { expect } from 'vitest';
import master from './fixtures/approved-public-master.json';
import publicMeaningOverrides from './fixtures/public-spiritual-editorial-overrides.json';
import type { Stone } from '../src/lib/schema';

/** Compare approved workbook fields and intentional public editorial overrides. */
export function expectApprovedFields(
  stone: Stone,
  fields: Array<keyof (typeof master)[number]>,
) {
  const row = master.find((r) => r.id === stone.id)!;
  expect(row, stone.id).toBeDefined();
  for (const field of fields) {
    const override = (publicMeaningOverrides as Record<string, string>)[stone.id];
    const expected =
      field === 'spiritualEffects' && override !== undefined
        ? override
        : row[field];
    expect(stone[field as keyof Stone], `${stone.id}.${field}`).toBe(expected);
  }
}
