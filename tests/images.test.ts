import { it, expect } from 'vitest';
import sharp from 'sharp';
import {
  commonsCandidates,
  licenseUrls,
  safeImageUrl,
  downloadCandidate,
  optimizeCandidate,
  validateApproved,
} from '../scripts/image-policy';
import type { Candidate } from '../src/lib/schema';
export function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'test-photo',
    stoneId: 's107',
    stoneName: 'ローズクォーツ',
    searchName: 'Rose Quartz',
    imageUrl: 'https://upload.wikimedia.org/test.png',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Test.png',
    photographer: 'Fixture photographer',
    provider: 'Wikimedia Commons',
    license: 'CC BY 4.0',
    licenseUrl: licenseUrls['CC BY 4.0'],
    commercial: true,
    derivatives: true,
    attribution: true,
    modified: false,
    status: 'pending',
    misidentificationNote: 'テスト専用・公開不可',
    identityConfirmed: false,
    rightsConfirmed: false,
    reviewedAt: null,
    alt: '',
    localPath: null,
    width: null,
    height: null,
    sha256: null,
    ...overrides,
  };
}
it('collects metadata but never approves search results; strips HTML and flags unknown licenses', () => {
  const result = commonsCandidates(
    {
      query: {
        pages: {
          1: {
            pageid: 1,
            imageinfo: [
              {
                url: 'https://upload.wikimedia.org/a.png',
                descriptionurl: 'https://commons.wikimedia.org/wiki/File:A.png',
                extmetadata: {
                  Artist: { value: '<a>Photographer</a>' },
                  LicenseShortName: { value: 'CC BY 4.0' },
                },
              },
            ],
          },
          2: {
            pageid: 2,
            imageinfo: [
              {
                url: 'https://upload.wikimedia.org/b.png',
                descriptionurl: 'https://commons.wikimedia.org/wiki/File:B.png',
                extmetadata: { LicenseShortName: { value: 'CC BY-NC 4.0' } },
              },
            ],
          },
        },
      },
    },
    { id: 's107', name: 'ローズクォーツ', english: 'Rose Quartz' },
  );
  expect(result[0].status).toBe('pending');
  expect(result[0].photographer).toBe('Photographer');
  expect(result[0].identityConfirmed).toBe(false);
  expect(result[1].license).toBe('unknown');
  expect(result[1].commercial).toBe(false);
});
it('blocks private hosts, injected URLs and redirects to unapproved hosts', async () => {
  for (const url of [
    'http://upload.wikimedia.org/a.png',
    'https://127.0.0.1/a',
    'https://localhost/a',
    'https://upload.wikimedia.org.evil.test/a',
    'https://user:pass@upload.wikimedia.org/a',
    'https://upload.wikimedia.org:8443/a',
  ])
    expect(() => safeImageUrl(url)).toThrow();
  await expect(
    downloadCandidate(
      'https://upload.wikimedia.org/a.png',
      async () =>
        new Response(null, {
          status: 302,
          headers: { Location: 'http://169.254.169.254/latest/meta-data' },
        }),
    ),
  ).rejects.toThrow();
});
it('requires every identity, commercial, license, attribution and review confirmation', () => {
  const hash = 'a'.repeat(64),
    good = candidate({
      status: 'approved',
      identityConfirmed: true,
      rightsConfirmed: true,
      alt: 'テスト画像',
      reviewedAt: '2026-10-27',
      localPath: `/images/s107/${hash}.webp`,
      sha256: hash,
      width: 10,
      height: 10,
    });
  expect(validateApproved(good)).toEqual(good);
  for (const patch of [
    { rightsConfirmed: false },
    { identityConfirmed: false },
    { commercial: false },
    { derivatives: false },
    { license: 'unknown' },
    { licenseUrl: 'https://evil.test' },
    { attribution: false },
    { stoneId: 's110' },
    { alt: '' },
    { photographer: '' },
  ])
    expect(() => validateApproved({ ...good, ...patch })).toThrow();
});
it('decodes, shrinks and strips metadata from real image bytes; rejects corrupt inputs', async () => {
  const bytes = await sharp({
    create: { width: 2200, height: 1100, channels: 3, background: '#d3b6bf' },
  })
    .jpeg()
    .withExif({ IFD0: { Artist: 'private EXIF author' } })
    .toBuffer();
  const result = await optimizeCandidate(bytes);
  expect(result.width).toBe(1440);
  expect(result.height).toBe(720);
  expect(result.bytes.length).toBeLessThan(2000000);
  const meta = await sharp(result.bytes).metadata();
  expect(meta.format).toBe('webp');
  expect(meta.exif).toBeUndefined();
  await expect(
    optimizeCandidate(Buffer.from('not an image')),
  ).rejects.toThrow();
});
