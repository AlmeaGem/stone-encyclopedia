import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { candidateSchema, type Candidate } from '../src/lib/schema';
export const photoKey = (c: Pick<Candidate, 'id' | 'stoneId'>) =>
  JSON.stringify([c.stoneId, c.id]);
export const photoRevision = (c: Candidate) =>
  createHash('sha256').update(JSON.stringify(c)).digest('hex');
const entrySchema = z
  .object({
    trashId: z.uuid(),
    token: z.uuid(),
    candidate: candidateSchema,
    deletedAt: z.number().int().nonnegative(),
    restoreUntil: z.number().int().nonnegative(),
    restoredAt: z.number().int().nonnegative().nullable(),
  })
  .strict();
export const trashSchema = z
  .object({ version: z.literal(1), entries: z.array(entrySchema) })
  .strict();
export type PhotoTrashState = z.infer<typeof trashSchema>;
export async function readPhotoTrash(root: string): Promise<PhotoTrashState> {
  try {
    return trashSchema.parse(
      JSON.parse(
        await readFile(join(root, '.editor/photo-trash.json'), 'utf8'),
      ),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT')
      return { version: 1, entries: [] };
    throw e;
  }
}
