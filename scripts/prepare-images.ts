import { readFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { candidateSchema } from '../src/lib/schema';
import { validateApproved } from './image-policy';
export async function prepareImages(root: string) {
  const images = z
    .array(candidateSchema)
    .parse(
      JSON.parse(await readFile(join(root, 'src/content/images.json'), 'utf8')),
    )
    .map(validateApproved);
  const output = join(root, 'public/images');
  await rm(output, { recursive: true, force: true });
  for (const image of images) {
    const path = image.localPath!.replace(/^\/images\//, '');
    const to = join(output, path);
    await mkdir(join(to, '..'), { recursive: true });
    await copyFile(join(root, 'assets/approved-images', path), to);
  }
  return images.length;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    `Prepared ${await prepareImages(fileURLToPath(new URL('../', import.meta.url)))} approved images only`,
  );
