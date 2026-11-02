import sharp from 'sharp';
import { createHash } from 'node:crypto';

export const publicImageMaxSize = 960;
export const sha256 = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

// No crop, enlargement, rotation, color adjustment or flattening of alpha.
export async function publicImage(bytes: Buffer) {
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) throw Error('画像サイズが不明です');
  if (Math.max(metadata.width, metadata.height) <= publicImageMaxSize)
    return { bytes, width: metadata.width, height: metadata.height };
  const { data, info } = await sharp(bytes)
    .resize({
      width: publicImageMaxSize,
      height: publicImageMaxSize,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .keepIccProfile()
    .webp({ quality: 88, alphaQuality: 100, effort: 5 })
    .toBuffer({ resolveWithObject: true });
  return { bytes: data, width: info.width, height: info.height };
}
