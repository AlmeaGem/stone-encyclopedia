import { stones, articles, categories } from './content';
import themes from '../content/story-themes.json';
import { archives } from './archives';

/** Search eligibility is not publication approval or access control. */
export type SearchPolicy = 'candidate' | 'noindex' | 'review' | 'unknown';

/** These routes are candidates for a future review, not approved for indexing. */
export const searchCandidatePaths: readonly string[] = [
  '',
  'stones/',
  ...stones.map((stone) => `stones/${stone.slug}/`),
  'wishes/',
  ...categories.map((category) => `wishes/${category.id}/`),
  'archives/',
  ...archives.map((article) => `archives/${article.id}/`),
  'articles/',
  ...articles.map((article) => `articles/${article.slug}/`),
  ...themes.map((theme) => `stories/${theme.id}/`),
  'about/',
];

/** Always keep user-specific, unfinished and error pages out of search. */
export const noindexPaths: readonly string[] = [
  'diagnosis/',
  'sample-report/',
  'library/',
  '404/',
];

/** Publicly accessible information pages require a separate indexing decision. */
export const reviewPaths: readonly string[] = [
  'terms/',
  'privacy/',
  'contact/',
  'commerce/',
  'refund/',
];

/** No URL has yet been approved for search publication. */
export const approvedSearchPaths: readonly string[] = [];

const candidates = new Set(searchCandidatePaths);
const excluded = new Set(noindexPaths);
const review = new Set(reviewPaths);
if (
  candidates.size !== searchCandidatePaths.length ||
  excluded.size !== noindexPaths.length ||
  review.size !== reviewPaths.length ||
  [...candidates].some((path) => excluded.has(path) || review.has(path)) ||
  [...excluded].some((path) => review.has(path))
)
  throw new Error('Overlapping or duplicate SEO route policy');

export function searchPolicy(path: string): SearchPolicy {
  if (candidates.has(path)) return 'candidate';
  if (excluded.has(path)) return 'noindex';
  if (review.has(path)) return 'review';
  return 'unknown';
}

/** Validate an explicit approval list before using it for robots or sitemap. */
export function validateApprovedSearchPaths(
  paths: readonly string[],
): string[] {
  const unique = new Set(paths);
  if (
    unique.size !== paths.length ||
    paths.some((path) => searchPolicy(path) !== 'candidate')
  )
    throw new Error('Only unique, reviewed candidate paths can be approved');
  return [...paths];
}

export const sitemapPaths = validateApprovedSearchPaths(approvedSearchPaths);
/** The release switch alone cannot authorize unapproved routes. */
export function robotsForPath(
  path: string,
  released: boolean,
  approvals: readonly string[] = sitemapPaths,
): string {
  const approved = validateApprovedSearchPaths(approvals);
  return released && approved.includes(path)
    ? 'index,follow'
    : 'noindex,nofollow';
}

/** Only explicitly approved candidates can enter a generated sitemap. */
export function searchSitemapXml(
  paths: readonly string[],
  toCanonical: (path: string) => string,
): string {
  const urls = validateApprovedSearchPaths(paths);
  return (
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls
      .map(
        (path) =>
          `<url><loc>${toCanonical(path).replace(/&/g, '&amp;')}</loc></url>`,
      )
      .join('') +
    '</urlset>'
  );
}
