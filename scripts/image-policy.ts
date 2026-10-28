import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { candidateSchema, type Candidate } from '../src/lib/schema';
export const licenseUrls: Record<string, string> = {
  'Own photo': '',
  'Commercial permission': '',
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY 2.5': 'https://creativecommons.org/licenses/by/2.5/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 2.5': 'https://creativecommons.org/licenses/by-sa/2.5/',
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
    let response: Response;
    try {
      response = await fetcher(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'ALMEA-Stone-Encyclopedia/0.1 (image review tool)',
        },
      });
    } catch {
      throw new Error(
        '画像配信元へ接続できませんでした（通信制限・タイムアウトの可能性）。制限を回避せず再取得または出典を確認してください。',
      );
    }
    if (response.status >= 300 && response.status < 400) {
      const to = response.headers.get('location');
      if (!to) throw new Error('画像の転送先が不明です');
      current = safeImageUrl(new URL(to, current).href);
      continue;
    }
    if (!response.ok)
      throw new Error(
        `画像取得HTTP ${response.status}：削除・取得制限・一時的な障害の可能性があります。再取得または原ページを確認してください。`,
      );
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
export async function optimizeCandidate(bytes: Uint8Array, maxSize = 1440) {
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
      width: maxSize,
      height: maxSize,
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
  if (
    ['Own photo', 'Commercial permission'].includes(c.license) &&
    (!c.uploadSha256 || c.provider !== '手動アップロード')
  )
    throw new Error('所有・許諾写真の記録が必要です');
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
    if (info.mime && !/^image\/(jpeg|png|webp)$/.test(info.mime)) return [];
    try {
      const source = new URL(info.descriptionurl);
      if (
        source.protocol !== 'https:' ||
        source.hostname !== 'commons.wikimedia.org' ||
        source.username ||
        source.password ||
        source.port
      )
        return [];
    } catch {
      return [];
    }
    let url: URL;
    try {
      url = safeImageUrl(info.thumburl || info.url);
    } catch {
      return [];
    }
    const meta = info.extmetadata || {};
    const raw = stripHtml(meta.LicenseShortName?.value || '');
    const normalized = raw === 'CC0' || raw === 'CC0 1.0' ? 'CC0' : raw;
    const license =
      !['Own photo', 'Commercial permission'].includes(normalized) &&
      Object.hasOwn(licenseUrls, normalized)
        ? normalized
        : 'unknown';
    return [
      candidateSchema.parse({
        id: `commons-${page.pageid}`,
        stoneId: stone.id,
        stoneName: stone.name,
        searchName: stone.english,
        imageUrl: url.href,
        originalUrl: safeImageUrl(info.url).href,
        shape: 'unknown',
        shapeConfirmed: false,
        ...(Number.isInteger(info.width) && info.width > 0
          ? { sourceWidth: info.width }
          : {}),
        ...(Number.isInteger(info.height) && info.height > 0
          ? { sourceHeight: info.height }
          : {}),
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
