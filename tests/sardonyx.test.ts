import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { validateCatalog } from '../src/lib/schema';
import { matches, stoneSearchTerms } from '../src/lib/search';
import { approvedSearchPaths } from '../src/lib/approved-search-paths';
import categories from '../src/content/categories.json';
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
it('adds s211 without changing the 210 historic identities and keeps it searchable', () => {
  const stones = validateCatalog(
    JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
  );
  expect(stones).toHaveLength(211);
  expect(stones[210]).toMatchObject({
    id: 's211',
    slug: 'sardonyx',
    name: 'サードオニキス',
    english: 'Sardonyx',
  });
  for (const query of ['サードオニキス', 'Sardonyx'])
    expect(matches(query, stoneSearchTerms(stones[210], categories))).toBe(
      true,
    );
  expect(stones[210].related).toEqual(['s063', 's028', 's046', 's107']);
  expect(approvedSearchPaths).toContain('stones/sardonyx/');
});
it('retains the approved original and bounded public derivative', async () => {
  const original = readFileSync('editorial/assets/sardonyx/s211-sardonyx.png');
  const publicImage = readFileSync(
    'editorial/assets/sardonyx/s211-public.webp',
  );
  expect(hash(original)).toBe(
    '2fd399b320165c53fda5588a5afc5c44e7478442150bd521798020ce4c4fba11',
  );
  expect(hash(publicImage)).toBe(
    '2c39ddf4c4ebcd2023ae42a8625cfe0675627fe2a88d2db4695ef31ee217eb67',
  );
  const info = await sharp(publicImage).metadata();
  expect([info.width, info.height]).toEqual([960, 960]);
});
it('contains every approved section and pairing in the authoritative source', () => {
  const source = readFileSync('editorial/manuscripts/s211/SARDONYX.md', 'utf8');
  for (const title of [
    'スピリチュアルな意味・象徴',
    '恋愛・仕事・金運・人間関係との関係',
    'おすすめの天然石の組み合わせ4選',
    'サードオニキスの鉱物としての特徴',
    'サードオニキスのおすすめの取り入れ方',
    'サードオニキスを選ぶあなたへ',
    'オレンジムーンストーン',
    'ガーネット',
    'カーネリアン',
    'ローズクォーツ',
  ])
    expect(source).toContain(title);
});
