import { canonical, launched } from '../lib/urls';
export function GET() {
  return new Response(
    `User-agent: *\n${launched ? 'Allow: /' : 'Disallow: /'}\nSitemap: ${canonical('sitemap.xml')}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
