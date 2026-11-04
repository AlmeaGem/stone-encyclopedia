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
