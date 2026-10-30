import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import master from './fixtures/approved-public-master.json';
import references from './fixtures/approved-reference-urls.json';
import { validateCatalog } from '../src/lib/schema';
import { expectApprovedFields } from './approved-master';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
it('matches every approved public column for all 210 IDs, with P0 revisions taking precedence', () => {
  expect(master).toHaveLength(210);
  for (const stone of stones) {
    expectApprovedFields(
      stone,
      Object.keys(master[0]) as Array<keyof (typeof master)[number]>,
    );
    expect(stone.hardness).toBe('');
  }
});
it('retains every eligible workbook reference and does not present new imports as independently verified', () => {
  for (const row of references)
    expect(
      stones
        .find((s) => s.id === row.id)!
        .sources.some((s) => s.url === row.url),
    ).toBe(true);
});
it('retains specific P0 safety boundaries rather than just checking text length', () => {
  const at = (id: string) => stones.find((s) => s.id === id)!;
  expect(at('s038').handling).toMatch(/水銀/u);
  expect(at('s038').handling).toMatch(/蒸気/u);
  expect(at('s038').handling).toMatch(/加熱/u);
  expect(at('s068').handling).toMatch(/石綿状/u);
  expect(at('s068').handling).toMatch(/吸入/u);
  expect(at('s068').handling).toMatch(/切削・研磨・穴あけ/u);
  expect(at('s079').handling).toMatch(/石綿|繊維/u);
  expect(at('s172').handling).toMatch(/水に容易に溶ける/u);
  expect(at('s172').handling).toMatch(/飲用/u);
  expect(at('s035').handling).toMatch(/粉じん/u);
  expect(at('s145').classification).toMatch(/商標/u);
});
it('protects historic IDs, paths, names, aliases and existing source records from import changes', () => {
  const baseline = JSON.parse(
    readFileSync('tests/fixtures/pre-master-continuity.json', 'utf8'),
  );
  for (const old of baseline) {
    const stone = stones.find((s) => s.id === old.id)!;
    for (const field of [
      'id',
      'slug',
      'name',
      'english',
      'aliases',
      'colors',
      'wishes',
      'themes',
      'related',
    ] as const)
      expect(stone[field]).toEqual(old[field]);
    for (const source of old.sources)
      expect(
        stone.sources.some((s) =>
          Object.entries(source).every(
            ([k, v]) =>
              JSON.stringify(s[k as keyof typeof s]) === JSON.stringify(v),
          ),
        ),
      ).toBe(true);
  }
});
