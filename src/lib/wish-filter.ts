import type { Stone } from './schema';
export function availableWishTags(stones: Pick<Stone, 'themes'>[]) {
  return [...new Set(stones.flatMap((stone) => stone.themes))];
}
/** Free catalog filtering only; preserve source order, no scoring or inference. */
export function matchesWishTags(themes: string[], selected: string[]) {
  return selected.every((tag) => themes.includes(tag));
}
