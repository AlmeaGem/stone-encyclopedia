import { stones, articles, categories } from '../lib/content';
import { canonical } from '../lib/urls';
export function GET() {
  const paths = [
    '',
    'stones/',
    'articles/',
    'wishes/',
    'diagnosis/',
    'about/',
    'terms/',
    'privacy/',
    'commerce/',
    'refund/',
    'contact/',
    ...stones.map((s) => `stones/${s.slug}/`),
    ...articles.map((a) => `articles/${a.slug}/`),
    ...categories.map((c) => `wishes/${c.id}/`),
  ];
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths
        .map(
          (path) =>
            `<url><loc>${canonical(path).replace(/&/g, '&amp;')}</loc></url>`,
        )
        .join('') +
      '</urlset>',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
