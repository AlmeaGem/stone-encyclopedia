/** Fixed permutation of the published catalog, independent of source order. */
export function dailyOrder(ids: readonly string[]): string[] {
  const result = [...ids].sort();
  let seed = 0x414c4d45;
  for (let i = result.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const DAY_MS = 86400000;
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
// The date epoch is fixed; it must never depend on the build or visitor.
const EPOCH_DAY = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);
export function tokyoDay(now: number): number {
  return Math.floor((now + TOKYO_OFFSET_MS) / DAY_MS);
}
export function dailyIndex(now: number, count: number): number {
  if (!Number.isInteger(count) || count < 1)
    throw new Error('Empty daily catalog');
  return (((tokyoDay(now) - EPOCH_DAY) % count) + count) % count;
}
export function millisecondsUntilTokyoMidnight(now: number): number {
  return DAY_MS - ((((now + TOKYO_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS);
}
