import { canonical, launched } from '../lib/urls';
import { searchSitemapXml, sitemapPaths } from '../lib/seo-policy';
export function GET() {
  return new Response(
    searchSitemapXml(launched ? sitemapPaths : [], canonical),
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
