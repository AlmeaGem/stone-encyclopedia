import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { availableWishTags, matchesWishTags } from '../src/lib/wish-filter';
import { publicArticle } from '../src/lib/public-copy';
import { articleSchema, validateCatalog } from '../src/lib/schema';

it('filters by the intersection of explicit existing tags without changing order or assignments', () => {
  const stones = [
    { themes: ['恋愛・出会い'] },
    { themes: ['恋愛・出会い', '愛情・絆'] },
    { themes: ['愛情・絆'] },
  ];
  expect(availableWishTags(stones)).toEqual(['恋愛・出会い', '愛情・絆']);
  expect(stones.filter((s) => matchesWishTags(s.themes, []))).toEqual(stones);
  expect(
    stones.filter((s) =>
      matchesWishTags(s.themes, ['恋愛・出会い', '愛情・絆']),
    ),
  ).toEqual([stones[1]]);
  expect(
    stones.filter((s) => matchesWishTags(s.themes, ['新しい出会い'])),
  ).toEqual([]);
});
it('derives only existing tags from all 210 stones and does not invent detailed wish links', () => {
  const stones = validateCatalog(
    JSON.parse(readFileSync('src/content/stones.json', 'utf8')),
  );
  const before = JSON.stringify(stones);
  const love = stones.filter((s) => s.wishes.includes('love'));
  for (const tag of availableWishTags(love))
    expect(love.some((s) => s.themes.includes(tag))).toBe(true);
  expect(availableWishTags(love)).not.toContain('新しい出会い');
  expect(JSON.stringify(stones)).toBe(before);
});
it('preserves original internal article records while publishing reader-facing copy', () => {
  const raw = JSON.parse(
    readFileSync('src/content/articles.json', 'utf8'),
  ) as unknown[];
  const before = JSON.stringify(raw);
  const output = raw.map((article: unknown) =>
    publicArticle(articleSchema.parse(article)),
  );
  expect(output.map((a) => a.slug)).toEqual(
    raw.map((a) => articleSchema.parse(a).slug),
  );
  expect(JSON.stringify(output)).not.toMatch(
    /移行元|公開ビルド|管理者が|次の開発段階/,
  );
  expect(JSON.stringify(raw)).toBe(before);
  expect(before).toContain('移行元');
});

it('does not replace new reader-facing article edits with fixed legacy copy', () => {
  const raw = JSON.parse(readFileSync('src/content/articles.json', 'utf8')) as {
    slug: string;
  }[];
  const article = articleSchema.parse(
    raw.find((a) => a.slug === 'editorial-policy'),
  );
  const updated = {
    ...article,
    sections: [
      {
        heading: '写真の利用条件',
        body: '撮影者とライセンスは各写真をご確認ください。',
      },
    ],
  };
  expect(publicArticle(updated).sections).toEqual(updated.sections);
});
