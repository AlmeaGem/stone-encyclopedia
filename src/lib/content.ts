import rawStones from '../content/stones.json';
import rawCategories from '../content/categories.json';
import rawArticles from '../content/articles.json';
import rawImages from '../content/images.json';
import {
  validateCatalog,
  categorySchema,
  articleSchema,
  candidateSchema,
  type Stone,
  type Candidate,
} from './schema';
import { z } from 'zod';
export const stones = validateCatalog(rawStones).filter(
  (s) => s.status === 'published',
);
export const categories = z
  .array(categorySchema)
  .length(12)
  .parse(rawCategories);
export const articles = z
  .array(articleSchema)
  .parse(rawArticles)
  .filter((a) => a.status === 'published');
export const approvedImages = z
  .array(candidateSchema)
  .parse(rawImages)
  .filter(
    (i) =>
      i.status === 'approved' &&
      i.identityConfirmed &&
      i.rightsConfirmed &&
      i.commercial &&
      i.derivatives &&
      i.license !== 'unknown' &&
      i.reviewedAt &&
      i.localPath,
  );
export function stoneById(id: string) {
  return stones.find((s) => s.id === id);
}
export function photoFor(s: Stone): Candidate | undefined {
  return approvedImages.find((i) => i.stoneId === s.id);
}
export const kindLabels: Record<Stone['kind'], string> = {
  mineral: '鉱物・宝石の名称',
  variety: '変種・色の名称',
  trade: '流通名',
  form: '結晶の形状名',
  organic: '有機物由来',
  rock: '岩石・天然ガラスなど',
};
export const unknown = '未確認・情報整備中';
export function colorClass(s: Stone) {
  const color = s.colors[0];
  return color === 'ピンク'
    ? 'rose'
    : color === '紫'
      ? 'violet'
      : color === '青'
        ? 'blue'
        : color === '緑'
          ? 'green'
          : color === '金' || color === '黄'
            ? 'gold'
            : color === '黒' || color === 'グレー'
              ? 'dark'
              : color === '赤'
                ? 'red'
                : 'neutral';
}
