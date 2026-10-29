import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  validateCatalog,
  categorySchema,
  articleSchema,
} from '../src/lib/schema';
import { matches, normalize } from '../src/lib/search';
import { z } from 'zod';
const stones = validateCatalog(
  JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
);
it('migrates exactly the 210 stable IDs, with unique English paths and no inventory fields', () => {
  expect(stones.map((s) => s.id)).toEqual(
    Array.from({ length: 210 }, (_, i) => `s${String(i + 1).padStart(3, '0')}`),
  );
  expect(new Set(stones.map((s) => s.slug)).size).toBe(210);
  expect(stones.find((s) => s.id === 's205')?.slug).toBe('rubellite');
  expect(stones.find((s) => s.id === 's206')?.slug).toBe('morganite');
  const text = JSON.stringify(stones);
  for (const field of [
    'photo_path',
    'purchase_url',
    'current_qty',
    'supplier',
    'owner_id',
    'total_yen',
    'customer',
  ])
    expect(text).not.toContain(`"${field}"`);
});
it('preserves the distinction between mineral identities, forms, unverified facts and symbolism', () => {
  expect(stones.find((s) => s.id === 's193')?.kind).toBe('form');
  for (const s of stones) {
    expect(s.symbolism.trim().length).toBeGreaterThan(0);
    expect(s.cautionStoneIds?.length || 0).toBe(0);
    expect(
      s.sources.every(
        (x) => x.checkedAt === null || /^\d{4}-\d{2}-\d{2}$/.test(x.checkedAt),
      ),
    ).toBe(true);
    expect(s.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.hardness).toBe('');
    expect(s.mineral).toBe('');
  }
});
it('rejects duplicate paths, private-field injections, missing IDs and dangling related links', () => {
  const bad = structuredClone(stones);
  bad[1].slug = bad[0].slug;
  expect(() => validateCatalog(bad)).toThrow();
  expect(() => validateCatalog(stones.slice(1))).toThrow();
  expect(() =>
    validateCatalog(
      stones.map((s, i) => (i ? s : { ...s, owner_id: 'private' })),
    ),
  ).toThrow();
  expect(() =>
    validateCatalog(
      stones.map((s, i) => (i ? s : { ...s, related: ['s999'] })),
    ),
  ).toThrow();
});
it('checks structural completeness of the first twenty enriched entries', () => {
  for (const stone of stones.slice(0, 20)) {
    expect(stone.legend?.length).toBeGreaterThan(70);
    expect(stone.spiritualEffects?.length).toBeGreaterThan(70);
    expect(stone.synergyStoneIds?.length).toBeGreaterThan(0);
    expect(stone.synergyNote?.length).toBeGreaterThan(20);
    expect(stone.sources.length).toBeGreaterThan(1);
    expect(stone.updatedAt).toBe('2026-10-30');
  }
  expect(stones[14].name).toBe('ブラックオニキス');
  expect(stones[18].aliases).not.toContain('ケアンゴーム');
  expect(stones[7].aliases).toContain('ケアンゴーム');
});
it('searches English names, aliases and kana without sending input to an API', () => {
  const rose = stones.find((s) => s.id === 's107')!;
  const terms = [rose.name, rose.english, ...rose.aliases].join(' ');
  for (const q of [
    'ローズ',
    'ろーずくぉーつ',
    'ＲＯＳＥ　ＱＵＡＲＴＺ',
    '紅水晶',
  ])
    expect(matches(q, terms)).toBe(true);
  expect(matches('Emerald', terms)).toBe(false);
  expect(normalize('ガーネット')).toBe('がーねっと');
});
it('has twelve editable categories and six substantial original articles', () => {
  const categories = z
    .array(categorySchema)
    .length(12)
    .parse(JSON.parse(readFileSync('src/content/categories.json', 'utf8')));
  const articles = z
    .array(articleSchema)
    .parse(JSON.parse(readFileSync('src/content/articles.json', 'utf8')));
  expect(articles).toHaveLength(6);
  expect(new Set(categories.map((c) => c.id)).size).toBe(12);
  expect(
    articles.every((a) => a.sections.map((s) => s.body).join('').length > 250),
  ).toBe(true);
});

it('resolves root and project-prefix URLs without broken joins', async () => {
  const { resolvePath } = await import('../src/lib/urls');
  expect(resolvePath('/', 'stones/')).toBe('/stones/');
  expect(resolvePath('/stone-encyclopedia', 'stones/rose-quartz/')).toBe(
    '/stone-encyclopedia/stones/rose-quartz/',
  );
  expect(resolvePath('/stone-encyclopedia/', '/images/s107/a.webp')).toBe(
    '/stone-encyclopedia/images/s107/a.webp',
  );
});

it('indexes general wishes and theme tags without inventing category membership or ranking', async () => {
  const { stoneSearchTerms } = await import('../src/lib/search');
  const categories = JSON.parse(
    readFileSync('src/content/categories.json', 'utf8'),
  );
  const rose = stones.find((s) => s.id === 's107')!;
  const terms = stoneSearchTerms(
    { ...rose, themes: ['調和'], wishes: ['prosperity'] },
    categories,
  );
  expect(matches('仕事運', terms)).toBe(true);
  expect(matches('金運', terms)).toBe(true);
  expect(matches('調和', terms)).toBe(true);
  expect(matches('紅水晶', terms)).toBe(true);
  expect(matches('魔除け', terms)).toBe(false);
});

it('keeps the first twenty story citations aligned and fragile specimens distinct from wearable recipes', () => {
  for (const stone of stones.slice(0, 20)) {
    expect(
      stone.sources.some(
        (source) =>
          source.url === stone.legendSourceUrl &&
          source.label === stone.legendSourceLabel,
      ),
    ).toBe(true);
    expect(new Set(stone.synergyStoneIds).size).toBe(
      stone.synergyStoneIds?.length,
    );
    expect(stone.synergyStoneIds).not.toContain(stone.id);
  }
  const onyx = stones.find((s) => s.id === 's015')!;
  expect(onyx.legendSourceUrl).toContain('thejewelrymagazine.com');
  expect(onyx.legend).toContain('ローマ神話');
  expect(stones.find((s) => s.id === 's006')!.characteristics).not.toContain(
    '単結晶の組み合わせ',
  );
  expect(stones.find((s) => s.id === 's007')!.synergyNote).toContain(
    '鑑賞用標本',
  );
  expect(stones.find((s) => s.id === 's011')!.synergyNote).toContain(
    '重晶石質のものとは区別',
  );
});

it('keeps the second twenty identities and aligns the existing garnet citation without marking it verified', () => {
  expect(stones.slice(20, 40).map((s) => s.id)).toEqual(
    Array.from({ length: 20 }, (_, i) => `s${String(i + 21).padStart(3, '0')}`),
  );
  const grossular = stones[31];
  expect(grossular.aliases).toContain('グロッシュラーライト');
  expect(grossular.characteristics).toContain(grossular.name);
  expect(grossular.characteristics).not.toContain('グロッシュラーライト');
  const garnet = stones[27];
  const source = garnet.sources.find((s) => s.url === garnet.legendSourceUrl);
  expect(source?.label).toBe(garnet.legendSourceLabel);
  expect(source?.checkedAt).toBeNull();
  expect(
    garnet.synergyStoneIds?.map((id) => stones.find((s) => s.id === id)?.name),
  ).toEqual(['ルビー', 'シトリン']);
});
