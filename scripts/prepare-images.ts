import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { candidateSchema } from '../src/lib/schema';
import { validateApproved } from './image-policy';
import { publicImage, sha256 } from './public-image';
export async function prepareImages(root: string) {
  const images = z
    .array(candidateSchema)
    .parse(
      JSON.parse(await readFile(join(root, 'src/content/images.json'), 'utf8')),
    )
    .map(validateApproved);
  const output = join(root, 'public/images');
  const manifest = [];
  await rm(output, { recursive: true, force: true });
  for (const image of images) {
    const path = image.localPath!.replace(/^\/images\//, '');
    const to = join(output, path);
    await mkdir(join(to, '..'), { recursive: true });
    const source = await readFile(join(root, 'assets/approved-images', path));
    if (sha256(source) !== image.sha256)
      throw Error(`承認済み画像のSHA256不一致: ${image.stoneId}`);
    const optimized = await publicImage(source);
    await writeFile(to, optimized.bytes);
    manifest.push({
      stoneId: image.stoneId,
      localPath: image.localPath,
      sourceSha256: image.sha256,
      publicSha256: sha256(optimized.bytes),
      width: optimized.width,
      height: optimized.height,
    });
  }
  // Build-only provenance: never copied into public/ or dist/.
  await mkdir(join(root, '.astro'), { recursive: true });
  await writeFile(
    join(root, '.astro/public-images.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  return images.length;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    `Prepared ${await prepareImages(fileURLToPath(new URL('../', import.meta.url)))} approved images only`,
  );
