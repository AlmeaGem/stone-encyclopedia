import { z } from 'zod';

/** Public, free archive articles only. Editorial notes and future paid content live elsewhere. */
export const archiveSourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  institution: z.string().trim().min(1),
  url: z
    .url()
    .refine((url) => new URL(url).protocol === 'https:', 'HTTPS required'),
});

export const archiveSectionSchema = z.object({
  heading: z.string().trim().min(1),
  classification: z.enum([
    'history',
    'tradition',
    'modern-interpretation',
    'mineralogy',
  ]),
  paragraphs: z.array(z.string().trim().min(1)).min(1),
  sourceIds: z.array(z.string()).min(1),
});

export const archiveArticleSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    number: z.number().int().positive(),
    title: z.string().trim().min(1),
    introduction: z.string().trim().min(1),
    coverStoneId: z.string().regex(/^s\d{3}$/),
    stoneIds: z.array(z.string().regex(/^s\d{3}$/)).min(1),
    sections: z.array(archiveSectionSchema).min(1),
    sources: z.array(archiveSourceSchema).min(1),
  })
  .superRefine((article, context) => {
    const sources = new Set(article.sources.map((source) => source.id));
    if (sources.size !== article.sources.length)
      context.addIssue({
        code: 'custom',
        message: 'Duplicate source ID',
        path: ['sources'],
      });
    if (
      new Set(article.stoneIds).size !== article.stoneIds.length ||
      !article.stoneIds.includes(article.coverStoneId)
    )
      context.addIssue({
        code: 'custom',
        message: 'Stone IDs must be unique and include the cover',
        path: ['stoneIds'],
      });
    article.sections.forEach((section, index) => {
      if (section.sourceIds.some((id) => !sources.has(id)))
        context.addIssue({
          code: 'custom',
          message: 'Unknown source ID',
          path: ['sections', index, 'sourceIds'],
        });
    });
  });

/** Validate a free collection against the current catalog and reserved routes. */
export function validateArchiveCatalog(
  input: unknown,
  stoneIds: readonly string[],
  reservedIds: readonly string[],
) {
  const articles = z.array(archiveArticleSchema).parse(input);
  const knownStones = new Set(stoneIds);
  const reserved = new Set(reservedIds);
  const ids = new Set<string>();
  const numbers = new Set<number>();
  for (const article of articles) {
    if (ids.has(article.id) || reserved.has(article.id))
      throw new Error(`Duplicate or reserved archive ID: ${article.id}`);
    if (numbers.has(article.number))
      throw new Error(`Duplicate archive number: ${article.number}`);
    const missing = article.stoneIds.find((id) => !knownStones.has(id));
    if (missing) throw new Error(`Unknown stone ID: ${missing}`);
    ids.add(article.id);
    numbers.add(article.number);
  }
  return articles;
}
