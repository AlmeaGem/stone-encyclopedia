import { publicStone } from '../src/lib/public-stone';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import {
  validateCatalog,
  categorySchema,
  articleSchema,
  candidateSchema,
} from '../src/lib/schema';
import { z } from 'zod';
import { validateApproved } from './image-policy';
export async function validateContent(root = process.cwd()) {
  const read = async (name: string) =>
    JSON.parse(await readFile(`${root}/src/content/${name}.json`, 'utf8'));
  const stones = validateCatalog(await read('stones'));
  validateCatalog(stones.map(publicStone));
  const categories = z
    .array(categorySchema)
    .length(12)
    .parse(await read('categories'));
  const articles = z.array(articleSchema).parse(await read('articles'));
  if (new Set(categories.map((c) => c.id)).size !== 12)
    throw new Error('カテゴリIDが重複しています');
  if (new Set(articles.map((a) => a.slug)).size !== articles.length)
    throw new Error('記事URLが重複しています');
  for (const stone of stones)
    for (const wish of stone.wishes)
      if (!categories.some((c) => c.id === wish))
        throw new Error('存在しない願いカテゴリです');
  for (const article of articles)
    for (const id of article.stoneIds)
      if (!stones.some((s) => s.id === id))
        throw new Error('記事の石IDが不正です');
  const images = z.array(candidateSchema).parse(await read('images'));
  if (new Set(images.map((i) => i.stoneId)).size !== images.length)
    throw new Error('石ごとの採用写真が重複しています');
  for (const image of images) {
    validateApproved(image);
    if (!stones.some((s) => s.id === image.stoneId))
      throw new Error('写真の石IDがありません');
    const bytes = await readFile(
      root +
        '/assets/approved-images/' +
        image.localPath!.replace(/^\/images\//, ''),
    );
    const metadata = await sharp(bytes).metadata();
    if (
      bytes.length > 2000000 ||
      createHash('sha256').update(bytes).digest('hex') !== image.sha256 ||
      metadata.format !== 'webp' ||
      metadata.width !== image.width ||
      metadata.height !== image.height ||
      metadata.exif ||
      Math.max(metadata.width || 0, metadata.height || 0) > 1440
    )
      throw new Error('承認画像の内容・寸法・ハッシュ・メタデータが不正です');
  }
  return { stones: stones.length, images: images.length };
}
if (process.argv[1]?.endsWith('validate-content.ts'))
  console.log(await validateContent());
