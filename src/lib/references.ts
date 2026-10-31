import type { Stone } from './schema';

/** Public citations exclude production notes; the original records stay intact. */
export function publicReferences(sources: Stone['sources']) {
  return sources
    .filter(
      (source) =>
        source.publication !== 'internal' &&
        !/^移行資料|出典確認状況|内部管理/u.test(source.label),
    )
    .map((source) => ({
      ...source,
      note: source.note.replace(
        '組み合わせの提案はALMÉA GEMによる編集上の提案。',
        '組み合わせは、伝承の意味や色・質感を重ねたALMÉA GEMの提案です。',
      ),
    }));
}

/** Keep useful care warnings without displaying their migration-work label. */
export function publicHandling(handling: string) {
  return handling.replace(/^移行資料の注意メモ[：:]/u, '取り扱いの注意：');
}
