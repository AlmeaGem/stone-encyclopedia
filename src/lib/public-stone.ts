import rawCopy from '../content/public-stone-copy.json' with { type: 'json' };
import type { Stone } from './schema';
export const publicCopyFields = [
  'introduction',
  'classification',
  'characteristics',
  'quality',
  'legend',
  'spiritualEffects',
  'synergyNote',
  'selection',
  'symbolism',
] as const;
export type PublicCopyField = (typeof publicCopyFields)[number];
export type CopyEdit = { before: string; text: string };
export const publicStoneCopy = rawCopy as Record<
  string,
  Partial<Record<PublicCopyField, CopyEdit>>
>;
/** Exact, reviewed per-stone copy. Keep the approved source and evidence records intact. */
export function publicStone(stone: Stone): Stone {
  const copy = { ...stone };
  for (const [field, edit] of Object.entries(publicStoneCopy[stone.id] || {})) {
    if (
      !publicCopyFields.includes(field as PublicCopyField) ||
      !edit ||
      typeof edit.text !== 'string' ||
      !edit.text.trim() ||
      stone[field as PublicCopyField] !== edit.before
    )
      throw new Error(
        `${stone.id}.${field}: 公開文の比較元が変わっています。原稿と公開文を再確認してください`,
      );
    copy[field as PublicCopyField] = edit.text;
  }
  return copy;
}
