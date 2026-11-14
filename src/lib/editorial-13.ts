import manuscripts from '../content/editorial-13.json';
import { stones } from './content';

const ids: Record<string, keyof typeof manuscripts> = {
  s047: 'sunstone',
  s116: 'sea-blue-chalcedony',
  s080: 'jadeite',
  s048: 'citrine',
  s037: 'jasper',
  s139: 'sugilite',
  s008: 'smoky-quartz',
  s084: 'seraphinite',
  s121: 'sodalite',
  s122: 'turquoise',
  s057: 'tiger-eye',
  s140: 'charoite',
};
export type EditorialPart =
  | 'story'
  | 'spirit'
  | 'fortunes'
  | 'wishes'
  | 'pairings'
  | 'caution'
  | 'nature'
  | 'history'
  | 'use'
  | 'care'
  | 'choice'
  | 'message';
export interface EditorialManuscript {
  title: string;
  english: string;
  catchphrase: string;
  keywords: string;
  parts: Record<EditorialPart, string[]>;
}

export function editorialManuscript(
  id: string,
): EditorialManuscript | undefined {
  const slug = ids[id];
  if (!slug) return undefined;
  const lines = manuscripts[slug]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const locate = (test: (line: string) => boolean) => {
    const i = lines.findIndex(test);
    if (i < 0) throw new Error(`Missing manuscript section: ${slug}`);
    return i;
  };
  const positions = [
    locate((x) => x.endsWith('の物語')),
    locate((x) => x === 'スピリチュアルな意味・象徴｜5つの力'),
    locate((x) => x === '恋愛・仕事・金運・人間関係との関係'),
    locate((x) => x === '願い別｜こんな方におすすめ'),
    locate((x) => x === '相性のよい天然石｜おすすめの組み合わせ'),
    locate(
      (x) => x === '組み合わせについて' || x === '組み合わせで気をつけたい石',
    ),
    locate((x) => x === '鉱物・物理的な情報'),
    locate((x) => x.endsWith('の歴史と伝承')),
    locate((x) => x === 'おすすめの取り入れ方'),
    locate((x) => x === '浄化・お手入れ'),
    locate((x) => x.endsWith('の選び方')),
    locate((x) => x.endsWith('を選ぶあなたへ')),
    locate((x) => x.startsWith('ALMÉA GEM')),
  ];
  if (positions.some((n, i) => i > 0 && n <= positions[i - 1]))
    throw new Error(`Unexpected section order: ${slug}`);
  const keys: EditorialPart[] = [
    'story',
    'spirit',
    'fortunes',
    'wishes',
    'pairings',
    'caution',
    'nature',
    'history',
    'use',
    'care',
    'choice',
    'message',
  ];
  const parts = Object.fromEntries(
    keys.map((key, i) => [
      key,
      lines.slice(positions[i] + 1, positions[i + 1]),
    ]),
  ) as Record<EditorialPart, string[]>;
  if (
    parts.pairings.filter((x) => x.includes(' × ')).length !== 4 ||
    parts.spirit.filter((x) => /^0[1-5]｜/.test(x)).length !== 5 ||
    parts.fortunes.filter((x) => /^(恋愛運|仕事運|金運|人間関係)｜/.test(x))
      .length !== 4
  )
    throw new Error(`Invalid manuscript structure: ${slug}`);
  return {
    title: lines[0],
    english: lines[1],
    catchphrase: lines[2],
    keywords: lines[4],
    parts,
  };
}

export function editorialPairTarget(name: string) {
  return stones.find((s) => s.name === name || s.aliases.includes(name));
}
