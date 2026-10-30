import type { Stone } from './schema';

/** Public citations exclude production notes; the original records stay intact. */
export function publicReferences(sources: Stone['sources']) {
  return sources.filter(
    (source) =>
      source.publication !== 'internal' &&
      !/^移行資料|出典確認状況|内部管理/u.test(source.label),
  );
}

/** Keep useful care warnings without displaying their migration-work label. */
export function publicHandling(handling: string) {
  return handling.replace(/^移行資料の注意メモ[：:]/u, '取り扱いの注意：');
}
