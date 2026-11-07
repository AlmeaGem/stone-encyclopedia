import { describe, expect, it } from 'vitest';
import {
  approvedSearchPaths,
  noindexPaths,
  reviewPaths,
  robotsForPath,
  searchCandidatePaths,
  searchPolicy,
  searchSitemapXml,
  sitemapPaths,
  validateApprovedSearchPaths,
} from '../src/lib/seo-policy';
import { stones, articles, categories } from '../src/lib/content';
import { archives } from '../src/lib/archives';
import themes from '../src/content/story-themes.json';

describe('search publication policy', () => {
  it('classifies 244 explicitly approved routes and excludes all other pages', () => {
    expect(stones).toHaveLength(210);
    expect(archives).toHaveLength(5);
    expect(categories).toHaveLength(12);
    expect(articles).toHaveLength(6);
    expect(themes).toHaveLength(5);
    expect(searchCandidatePaths).toHaveLength(244);
    for (const stone of stones)
      expect(searchPolicy(`stones/${stone.slug}/`)).toBe('candidate');
    for (const article of archives)
      expect(searchPolicy(`archives/${article.id}/`)).toBe('candidate');
    for (const category of categories)
      expect(searchPolicy(`wishes/${category.id}/`)).toBe('candidate');
    for (const article of articles)
      expect(searchPolicy(`articles/${article.slug}/`)).toBe('candidate');
    for (const theme of themes)
      expect(searchPolicy(`stories/${theme.id}/`)).toBe('candidate');
    expect(noindexPaths).toHaveLength(4);
    expect(reviewPaths).toHaveLength(5);
    expect(approvedSearchPaths).toHaveLength(244);
    expect(sitemapPaths).toHaveLength(244);
    expect(new Set(approvedSearchPaths).size).toBe(244);
    expect(new Set(approvedSearchPaths)).toEqual(
      new Set(searchCandidatePaths),
    );
    expect(
      new Set([...searchCandidatePaths, ...noindexPaths, ...reviewPaths]).size,
    ).toBe(253);
    for (const path of searchCandidatePaths)
      expect(searchPolicy(path)).toBe('candidate');
    for (const path of noindexPaths) expect(searchPolicy(path)).toBe('noindex');
    for (const path of reviewPaths) expect(searchPolicy(path)).toBe('review');
    expect(searchPolicy('unknown/')).toBe('unknown');
    for (const path of [
      ...searchCandidatePaths,
      ...noindexPaths,
      ...reviewPaths,
      'unknown/',
    ]) {
      expect(robotsForPath(path, false)).toBe('noindex,nofollow');
      expect(robotsForPath(path, true)).toBe(
        searchPolicy(path) === 'candidate'
          ? 'index,follow'
          : 'noindex,nofollow',
      );
    }
  });

  it('requires explicit valid approval and never admits excluded or unknown paths', () => {
    expect(robotsForPath('stones/', false, ['stones/'])).toBe(
      'noindex,nofollow',
    );
    expect(robotsForPath('stones/', true, ['stones/'])).toBe('index,follow');
    expect(robotsForPath('diagnosis/', true, ['stones/'])).toBe(
      'noindex,nofollow',
    );
    expect(robotsForPath('terms/', true)).toBe('noindex,nofollow');
    expect(robotsForPath('unknown/', true)).toBe('noindex,nofollow');
    for (const path of [
      ...noindexPaths,
      ...reviewPaths,
      'unknown/',
      'stones/?q=x',
    ]) {
      expect(() => validateApprovedSearchPaths([path])).toThrow();
    }
    expect(() => validateApprovedSearchPaths(['stones/', 'stones/'])).toThrow();
  });

  it('builds only approved canonical paths, including under a subpath', () => {
    const canonical = (path: string) =>
      new URL(`/stone-encyclopedia/${path}`, 'https://almeagem.github.io').href;
    expect(searchSitemapXml([], canonical)).not.toContain('<loc>');
    const xml = searchSitemapXml(searchCandidatePaths, canonical);
    expect(xml.match(/<loc>/g) || []).toHaveLength(244);
    for (const path of searchCandidatePaths)
      expect(xml).toContain(`<loc>${canonical(path)}</loc>`);
    for (const path of [...noindexPaths, ...reviewPaths])
      expect(xml).not.toContain(`<loc>${canonical(path)}</loc>`);
    expect(() => searchSitemapXml(['diagnosis/'], canonical)).toThrow();
  });
});
