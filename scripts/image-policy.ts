import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { candidateSchema, type Candidate } from '../src/lib/schema';
export const licenseUrls: Record<string, string> = {
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
};
const imageHosts = new Set([
  'upload.wikimedia.org',
  'images.unsplash.com',
  'images.pexels.com',
]);
export function safeImageUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    !imageHosts.has(url.hostname)
  )
    throw new Error('許可された画像配信元のHTTPS URLだけを使用できます');
  return url;
}
export async function downloadCandidate(
  url: string,
  fetcher: typeof fetch = fetch,
) {
  let current = safeImageUrl(url);
  for (let n = 0; n < 4; n++) {
    const response = await fetcher(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'ALMEA-Stone-Encyclopedia/0.1 (image review tool)',
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const to = response.headers.get('location');
      if (!to) throw new Error('画像の転送先が不明です');
      current = safeImageUrl(new URL(to, current).href);
      continue;
    }
    if (!response.ok) throw new Error('画像の取得に失敗しました');
    if (
      !/^image\/(jpeg|png|webp)$/.test(
        response.headers.get('content-type')?.split(';')[0] || '',
      )
    )
      throw new Error('JPEG・PNG・WebPの画像だけ取得できます');
    if (Number(response.headers.get('content-length') || 0) > 10000000)
      throw new Error('画像が10MBを超えています');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('画像データがありません');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10000000) {
        await reader.cancel();
        throw new Error('画像が10MBを超えています');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  throw new Error('画像の転送回数が多すぎます');
}
export async function optimizeCandidate(bytes: Uint8Array) {
  const pipeline = sharp(bytes, {
    limitInputPixels: 40000000,
    animated: false,
  });
  const metadata = await pipeline.metadata();
  if (
    !['jpeg', 'png', 'webp'].includes(metadata.format || '') ||
    (metadata.pages || 1) > 1
  )
    throw new Error('静止画のJPEG・PNG・WebPだけを使用できます');
  const { data, info } = await pipeline
    .rotate()
    .resize({
      width: 1440,
      height: 1440,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  if (data.length > 2000000)
    throw new Error('最適化後も画像が2MBを超えています');
  const hash = createHash('sha256').update(data).digest('hex');
  return { bytes: data, hash, width: info.width, height: info.height };
}
export function validateApproved(raw: unknown) {
  const c = candidateSchema.parse(raw);
  if (
    c.status !== 'approved' ||
    !c.rightsConfirmed ||
    !c.identityConfirmed ||
    !c.commercial ||
    !c.derivatives ||
    !c.reviewedAt ||
    !c.localPath ||
    !c.photographer.trim() ||
    !c.alt.trim() ||
    !c.sha256 ||
    !c.width ||
    !c.height
  )
    throw new Error(
      '石の一致・権利・撮影者・代替テキスト・確認日・画像をすべて確認してください',
    );
  if (licenseUrls[c.license] !== c.licenseUrl)
    throw new Error('ライセンス名と公式URLが一致しません');
  if (c.license !== 'CC0' && !c.attribution)
    throw new Error('帰属表示が必要です');
  if (
    !c.localPath.startsWith(`/images/${c.stoneId}/`) ||
    !c.localPath.endsWith(`/${c.sha256}.webp`)
  )
    throw new Error('石IDと画像パスが一致しません');
  return c;
}
export function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
export function commonsCandidates(
  data: unknown,
  stone: { id: string; name: string; english: string },
): Candidate[] {
  const pages =
    (data as { query?: { pages?: Record<string, any> } })?.query?.pages || {};
  return Object.values(pages).flatMap((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.url || !info.descriptionurl) return [];
    let url: URL;
    try {
      url = safeImageUrl(info.thumburl || info.url);
    } catch {
      return [];
    }
    const meta = info.extmetadata || {};
    const raw = stripHtml(meta.LicenseShortName?.value || '');
    const normalized = raw === 'CC0' || raw === 'CC0 1.0' ? 'CC0' : raw;
    const license = Object.hasOwn(licenseUrls, normalized)
      ? normalized
      : 'unknown';
    return [
      candidateSchema.parse({
        id: `commons-${page.pageid}`,
        stoneId: stone.id,
        stoneName: stone.name,
        searchName: stone.english,
        imageUrl: url.href,
        pageUrl: info.descriptionurl,
        photographer: stripHtml(meta.Artist?.value || '').slice(0, 500),
        provider: 'Wikimedia Commons',
        license,
        licenseUrl: license === 'unknown' ? '' : licenseUrls[license],
        commercial: license !== 'unknown',
        derivatives: license !== 'unknown',
        attribution: license !== 'CC0',
        modified: false,
        status: license === 'unknown' ? 'review' : 'pending',
        misidentificationNote:
          '検索結果の石種・流通名・処理・撮影対象の一致を手動確認してください。',
        identityConfirmed: false,
        rightsConfirmed: false,
        reviewedAt: null,
        alt: '',
        localPath: null,
        width: null,
        height: null,
        sha256: null,
      }),
    ];
  });
}
