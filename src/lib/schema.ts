import { z } from 'zod';
const text = z.string().trim().max(3000);
export const sourceSchema = z
  .object({
    label: z.string().min(1).max(250),
    url: z
      .url()
      .regex(/^https:\/\//)
      .or(z.literal('')),
    checkedAt: z.iso.date().nullable(),
    note: text,
  })
  .strict();
export const stoneSchema = z
  .object({
    id: z.string().regex(/^s(00[1-9]|0[1-9][0-9]|1\d\d|20\d|210)$/),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(150),
    english: z.string().trim().min(1).max(150),
    aliases: z.array(z.string().max(150)).max(30),
    kind: z.enum(['mineral', 'variety', 'trade', 'form', 'organic', 'rock']),
    colors: z.array(z.string().max(30)).max(10),
    wishes: z.array(z.string().max(40)).max(12),
    themes: z.array(z.string().max(50)).max(10),
    introduction: text,
    mineral: text,
    hardness: text,
    characteristics: text,
    inclusions: text,
    quality: text,
    symbolism: text,
    selection: text,
    shapes: text,
    cleansing: text,
    handling: text,
    treatments: text,
    related: z.array(z.string().regex(/^s\d{3}$/)).max(12),
    sources: z.array(sourceSchema).max(20),
    updatedAt: z.iso.date(),
    status: z.enum(['published', 'draft']),
    reviewNote: text,
  })
  .strict();
export type Stone = z.infer<typeof stoneSchema>;
export const categorySchema = z
  .object({
    id: z.string().regex(/^[a-z-]+$/),
    name: z.string().min(1).max(80),
    description: z.string().max(300),
    subcategories: z.array(z.string().min(1).max(100)).min(1).max(25),
  })
  .strict();
export const articleSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1).max(150),
    category: z.string().max(80),
    description: z.string().max(250),
    sections: z
      .array(z.object({ heading: z.string().min(1).max(150), body: text }))
      .min(1)
      .max(30),
    stoneIds: z.array(z.string()),
    updatedAt: z.iso.date(),
    status: z.enum(['published', 'draft']),
  })
  .strict();
export const candidateSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    stoneId: z.string().regex(/^s\d{3}$/),
    stoneName: z.string().max(150),
    searchName: z.string().max(200),
    imageUrl: z.url().regex(/^https:\/\//),
    pageUrl: z.url().regex(/^https:\/\//),
    photographer: z.string().max(500),
    provider: z.string().max(100),
    license: z.enum([
      'CC0',
      'CC BY 4.0',
      'CC BY-SA 4.0',
      'CC BY 3.0',
      'CC BY-SA 3.0',
      'unknown',
    ]),
    licenseUrl: z.string().max(300),
    commercial: z.boolean(),
    derivatives: z.boolean(),
    attribution: z.boolean(),
    modified: z.boolean(),
    status: z.enum(['pending', 'approved', 'rejected', 'review']),
    misidentificationNote: text,
    identityConfirmed: z.boolean(),
    rightsConfirmed: z.boolean(),
    reviewedAt: z.iso.date().nullable(),
    alt: z.string().max(300),
    localPath: z
      .string()
      .regex(/^\/images\/s\d{3}\/[a-f0-9]{64}\.webp$/)
      .nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
  })
  .strict();
export type Candidate = z.infer<typeof candidateSchema>;
export function validateCatalog(input: unknown) {
  const stones = z.array(stoneSchema).length(210).parse(input);
  if (
    new Set(stones.map((s) => s.id)).size !== 210 ||
    new Set(stones.map((s) => s.slug)).size !== 210
  )
    throw new Error('図鑑ID・URLが重複しています');
  for (const s of stones)
    for (const id of s.related)
      if (!stones.some((x) => x.id === id) || id === s.id)
        throw new Error('関連する石のIDが不正です');
  return stones;
}
