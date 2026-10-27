export function normalize(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・･\-‐]/g, '');
}
export function matches(query: string, terms: string) {
  return normalize(query)
    .split(/[、,]+/)
    .filter(Boolean)
    .every((q) => normalize(terms).includes(q));
}

import type { Stone } from './schema';
const wishAliases: Record<string, string[]> = {
  love: ['恋愛運', '出会い', '結婚運'],
  prosperity: ['仕事運', '財運', '商売繁盛'],
  fortune: ['願望実現', '願望成就'],
  protection: ['厄除け', 'お守り'],
  wellbeing: ['健康運', '美容運'],
  relationships: ['対人運'],
};
/** Derived public search index only: no change to catalog records or ranking. */
export function stoneSearchTerms(
  stone: Pick<Stone, 'name' | 'english' | 'aliases' | 'themes' | 'wishes'>,
  categories: { id: string; name: string }[],
) {
  return [
    stone.name,
    stone.english,
    ...stone.aliases,
    ...stone.themes,
    ...categories
      .filter((c) => stone.wishes.includes(c.id))
      .flatMap((c) => [c.name, ...(wishAliases[c.id] || [])]),
  ].join(' ');
}
