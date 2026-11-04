import { describe, expect, it } from 'vitest';
import { archiveArticleSchema } from '../src/lib/archive-schema';

const sample = {
  id: 'example-archive',
  number: 1,
  title: 'Example',
  introduction: 'Introduction',
  coverStoneId: 's063',
  stoneIds: ['s063'],
  sections: [
    {
      heading: 'Example',
      classification: 'mineralogy',
      paragraphs: ['Example text'],
      sourceIds: ['source-1'],
    },
  ],
  sources: [
    {
      id: 'source-1',
      title: 'Example source',
      institution: 'Example institution',
      url: 'https://example.org/source',
    },
  ],
};
describe('free archive article metadata', () => {
  it('requires classified sections linked to listed HTTPS references', () => {
    expect(archiveArticleSchema.safeParse(sample).success).toBe(true);
    expect(
      archiveArticleSchema.safeParse({
        ...sample,
        sections: [{ ...sample.sections[0], sourceIds: ['missing'] }],
      }).success,
    ).toBe(false);
    expect(
      archiveArticleSchema.safeParse({
        ...sample,
        sources: [{ ...sample.sources[0], url: 'http://example.org' }],
      }).success,
    ).toBe(false);
    expect(
      archiveArticleSchema.safeParse({ ...sample, stoneIds: ['s107'] }).success,
    ).toBe(false);
  });
});
