import { expect } from 'vitest';
import master from './fixtures/approved-public-master.json';
import publicMeaningOverrides from './fixtures/public-spiritual-editorial-overrides.json';
import type { Stone } from '../src/lib/schema';
/** Compare wording to the approved workbook, not an obsolete editorial draft. */
export function expectApprovedFields(
  stone: Stone,
  fields: Array<keyof (typeof master)[number]>,
) {
  const row = master.find((r) => r.id === stone.id)!;
  expect(row, stone.id).toBeDefined();
  for (const field of fields)
    expect(stone[field as keyof Stone], `${stone.id}.${field}`).toBe(
      field === 'spiritualEffects'
        ? (publicMeaningOverrides as Record<string, string>)[stone.id] ?? row[field]
        : row[field],
    );
}
