import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { EditorStore } from './admin-store';
import { commonsRequest, imageSearchLock } from './collect-images';
import {
  commonsCandidates,
  licenseUrls,
  downloadCandidate,
  optimizeCandidate,
} from './image-policy';
import { candidateSchema, type Candidate } from '../src/lib/schema';
export type Health = {
  status: 'ok' | 'error';
  error: string;
  checkedAt: string;
  version?: string;
};
export class PhotoMedia {
  private changes: Promise<unknown> = Promise.resolve();
  private fetchQueue: Promise<unknown> = Promise.resolve();
  private lastDownload = 0;
  private inflight = new Map<string, Promise<Buffer>>();
  private queuedBytes(c: Candidate) {
    if (c.uploadSha256) return this.bytes(c);
    const task = this.fetchQueue
      .catch(() => {})
      .then(async () => {
        const delay = Math.max(0, 1050 - (Date.now() - this.lastDownload));
        if (delay) await new Promise((r) => setTimeout(r, delay));
        this.lastDownload = Date.now();
        return this.bytes(c);
      });
    this.fetchQueue = task.catch(() => {});
    return task;
  }
  constructor(
    private store: EditorStore,
    private fetcher: typeof fetch = fetch,
  ) {}
  async health(): Promise<Record<string, Health>> {
    try {
      return JSON.parse(
        await readFile(
          join(this.store.root, '.editor/image-health.json'),
          'utf8',
        ),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      return {};
    }
  }
  private async record(c: Candidate, value: Health, replaceVersion = false) {
    this.changes = this.changes
      .catch(() => {})
      .then(async () => {
        const all = await this.health();
        const current = all[c.stoneId + ':' + c.id];
        if (
          !replaceVersion &&
          current?.version &&
          current.version !== value.version
        )
          return;
        all[c.stoneId + ':' + c.id] = value;
        await this.store.atomic(
          join(this.store.root, '.editor/image-health.json'),
          all,
        );
      });
    await this.changes;
  }
  async bytes(c: Candidate) {
    if (!c.uploadSha256) return downloadCandidate(c.imageUrl, this.fetcher);
    const bytes = await readFile(
      join(this.store.root, '.editor/uploads', c.uploadSha256 + '.webp'),
    );
    if (createHash('sha256').update(bytes).digest('hex') !== c.uploadSha256)
      throw new Error('アップロード画像の整合性を確認してください');
    return bytes;
  }
  async thumbnail(c: Candidate, large: boolean) {
    const previous = (await this.health())[c.stoneId + ':' + c.id];
    const hash = createHash('sha256')
      .update(
        c.imageUrl +
          ':' +
          c.uploadSha256 +
          ':' +
          large +
          ':' +
          (previous?.version || ''),
      )
      .digest('hex');
    const dir = join(this.store.root, '.editor/thumbnails'),
      path = join(dir, hash + '.webp');
    try {
      let bytes: Buffer;
      try {
        bytes = await readFile(path);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        let pending = this.inflight.get(path);
        if (!pending) {
          pending = (async () => {
            const result = (
              await optimizeCandidate(
                await this.queuedBytes(c),
                large ? 1440 : 480,
              )
            ).bytes;
            await mkdir(dir, { recursive: true });
            const temp = path + '.' + randomUUID() + '.tmp';
            await writeFile(temp, result, { mode: 0o600 });
            await rename(temp, path);
            return result;
          })();
          this.inflight.set(path, pending);
        }
        try {
          bytes = await pending;
        } finally {
          if (this.inflight.get(path) === pending) this.inflight.delete(path);
        }
      }
      await this.record(c, {
        status: 'ok',
        error: '',
        checkedAt: new Date().toISOString(),
        version: previous?.version,
      });
      return bytes;
    } catch (e) {
      const message = e instanceof Error ? e.message : '画像取得に失敗しました';
      await this.record(c, {
        status: 'error',
        error: message,
        checkedAt: new Date().toISOString(),
        version: previous?.version,
      });
      throw new Error(message);
    }
  }
  async retry(id: string, stoneId: string) {
    const c = (await this.store.candidates()).find(
      (c) => c.id === id && c.stoneId === stoneId,
    );
    if (!c) throw new Error('候補が見つかりません');
    try {
      if (c.provider === 'Wikimedia Commons' && /^commons-\d+$/.test(c.id)) {
        await imageSearchLock(this.store.root, async () => {
          const data = await commonsRequest(
            this.store.root,
            {
              pageids: c.id.slice(8),
              prop: 'imageinfo',
              iiprop: 'url|extmetadata|mime|size',
              iiurlwidth: '1400',
            },
            this.fetcher,
          );
          const fresh = commonsCandidates(data, {
            id: c.stoneId,
            name: c.stoneName,
            english: c.searchName,
          })[0];
          if (!fresh)
            throw new Error(
              'Commonsで有効なJPEG・PNG・WebPの候補を確認できません（削除・形式変更等）。',
            );
          const changed =
            fresh.imageUrl !== c.imageUrl ||
            fresh.originalUrl !== c.originalUrl ||
            fresh.license !== c.license ||
            fresh.photographer !== c.photographer;
          const next = {
            ...c,
            imageUrl: fresh.imageUrl,
            originalUrl: fresh.originalUrl,
            sourceWidth: fresh.sourceWidth,
            sourceHeight: fresh.sourceHeight,
            license: fresh.license,
            licenseUrl: fresh.licenseUrl,
            commercial: fresh.commercial,
            derivatives: fresh.derivatives,
            attribution: fresh.attribution,
            photographer: fresh.photographer,
            ...(changed
              ? {
                  status: 'review' as const,
                  shape: 'unknown' as const,
                  shapeConfirmed: false,
                  identityConfirmed: false,
                  rightsConfirmed: false,
                }
              : {}),
          };
          // Refresh only the private queue; existing published manifests are retained.
          const all = await this.store.candidates();
          all[all.findIndex((x) => x.id === id && x.stoneId === stoneId)] =
            next;
          await this.store.atomic(
            join(this.store.root, '.editor/candidates.json'),
            all,
          );
        });
      }
      await this.record(
        c,
        {
          status: 'ok',
          error: '',
          checkedAt: new Date().toISOString(),
          version: randomUUID(),
        },
        true,
      );
      const updated = (await this.store.candidates()).find(
        (x) => x.id === id && x.stoneId === stoneId,
      )!;
      await this.thumbnail(updated, false);
      return { ok: true };
    } catch (e) {
      await this.record(c, {
        status: 'error',
        error: e instanceof Error ? e.message : '再取得失敗',
        checkedAt: new Date().toISOString(),
        version: (await this.health())[c.stoneId + ':' + c.id]?.version,
      });
      throw e;
    }
  }
  async upload(input: {
    stoneId: string;
    data: string;
    photographer: string;
    license: string;
    note: string;
    shape?: string;
    sourceUrl?: string;
    creditText?: string;
    originalImageUrl?: string;
  }) {
    const stone = (await this.store.read('stones')).find(
      (s: any) => s.id === input.stoneId,
    );
    if (!stone) throw new Error('石IDが不正です');
    const cc =
      input.license?.startsWith('CC') &&
      Object.hasOwn(licenseUrls, input.license);
    if (!cc && !['Own photo', 'Commercial permission', 'AI-generated'].includes(input.license))
      throw new Error('対応するライセンスを選択してください');
    if (!input.photographer?.trim())
      throw new Error('撮影者を入力してください');
    if (
      input.license === 'Commercial permission' &&
      (!input.note?.trim() || input.note.trim().length < 10)
    )
      throw new Error(
        '個別許諾の内容・商用利用と加工の許可を10文字以上で記録してください',
      );
    if (typeof input.note !== 'string' || input.note.length > 3000)
      throw new Error('確認記録は3000文字以内です');
    if (
      typeof input.data !== 'string' ||
      input.data.length > 14000000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.data)
    )
      throw new Error(
        '10MB以下のJPEG・PNG・WebPを選択してください。HEICはJPEGに変換してください。',
      );
    const raw = Buffer.from(
      input.data.slice(input.data.indexOf(',') + 1),
      'base64',
    );
    if (raw.length > 10000000) throw new Error('画像が10MBを超えています');
    const optimized = await optimizeCandidate(raw);
    const dir = join(this.store.root, '.editor/uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, optimized.hash + '.webp'), optimized.bytes, {
      mode: 0o600,
    });
    let sourceUrl = 'https://almeagem.github.io/stone-encyclopedia/';
    if (input.sourceUrl?.trim()) {
      const parsed = new URL(input.sourceUrl.trim());
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
        throw new Error('公開用出典URLはHTTPSで入力してください');
      sourceUrl = parsed.href;
    }
    if (cc) {
      const page = new URL(sourceUrl);
      if (
        page.hostname !== 'commons.wikimedia.org' ||
        page.port ||
        (!decodeURIComponent(page.pathname).startsWith('/wiki/File:') &&
          !/^\d+$/.test(page.searchParams.get('curid') || ''))
      )
        throw new Error(
          'Commons画像は、ライセンスが確認できるFileページのURLを入力してください',
        );
    }
    let originalUrl: string | undefined;
    if (input.originalImageUrl?.trim()) {
      const original = new URL(input.originalImageUrl.trim());
      if (
        original.protocol !== 'https:' ||
        original.username ||
        original.password
      )
        throw new Error('元画像URLはHTTPSで入力してください');
      originalUrl = original.href;
    }
    const c = candidateSchema.parse({
      id: 'upload-' + randomUUID(),
      stoneId: stone.id,
      stoneName: stone.name,
      searchName: '手動アップロード',
      imageUrl: 'https://almeagem.github.io/stone-encyclopedia/',
      pageUrl: sourceUrl,
      creditText: input.creditText || '',
      ...(originalUrl ? { originalUrl } : {}),
      photographer: input.photographer,
      provider: '手動アップロード',
      license: input.license,
      imageKind: input.license === 'AI-generated' ? 'ai-generated' : 'real-photo',
      licenseUrl: licenseUrls[input.license],
      commercial: true,
      derivatives: true,
      attribution: input.license !== 'CC0',
      modified: true,
      status: 'pending',
      identityConfirmed: false,
      rightsConfirmed: false,
      reviewedAt: null,
      alt: '',
      localPath: null,
      width: null,
      height: null,
      sha256: null,
      uploadSha256: optimized.hash,
      sourceWidth: optimized.width,
      sourceHeight: optimized.height,
      shape: input.shape || 'unknown',
      shapeConfirmed: !!input.shape && input.shape !== 'unknown',
      misidentificationNote:
        input.license === 'AI-generated'
          ? 'AI生成のイメージ写真。実物撮影や鉱物鑑別を示すものではありません。'
          : '所有・許諾記録は非公開で保持。石種・実物写真・商用利用条件の再確認が必要です。',
    });
    await this.store.atomic(
      join(this.store.root, '.editor/upload-rights', c.id + '.json'),
      {
        stoneId: c.stoneId,
        note:
          input.note.trim() ||
          (cc
            ? 'Commonsの原ページでライセンスを確認し、採用時に石種・利用条件を確認する'
            : input.license === 'AI-generated'
              ? 'AI生成イメージ。生成サービスの利用条件・利用権を確認済み。実物写真ではない。'
              : '本人・自社の撮影と権利保有を採用時に確認する'),
        sourceUrl: c.pageUrl,
        originalUrl: c.originalUrl || '',
        licenseUrl: c.licenseUrl,
        uploadSha256: c.uploadSha256,
        creditText: c.creditText || '',
        photographer: c.photographer,
        license: c.license,
        savedAt: new Date().toISOString(),
      },
    );
    await this.store.saveCandidate(c);
    return c;
  }
}
