import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  stoneSchema,
  articleSchema,
  categorySchema,
  candidateSchema,
  type Candidate,
} from '../src/lib/schema';
import {
  downloadCandidate,
  optimizeCandidate,
  validateApproved,
} from './image-policy';
const schemas = {
  stones: stoneSchema,
  articles: articleSchema,
  categories: categorySchema,
};
export type Collection = keyof typeof schemas;
const hash = (x: unknown) =>
  createHash('sha256').update(JSON.stringify(x)).digest('hex');
export class EditorConflict extends Error {}
export class EditorStore {
  constructor(public root: string) {}
  async read(name: string) {
    return JSON.parse(
      await readFile(join(this.root, 'src/content', name + '.json'), 'utf8'),
    );
  }
  async atomic(path: string, value: unknown) {
    await mkdir(join(path, '..'), { recursive: true });
    const temp = path + '.tmp';
    await writeFile(temp, JSON.stringify(value, null, 2) + '\n', {
      mode: 0o600,
    });
    await rename(temp, path);
  }
  validCollection(value: string): Collection {
    if (!Object.hasOwn(schemas, value)) throw new Error('編集対象が不正です');
    return value as Collection;
  }
  key(collection: Collection, entry: any) {
    return collection === 'articles' ? entry.slug : entry.id;
  }
  draftPath(collection: Collection, id: string) {
    if (!/^[a-z0-9-]{1,100}$/.test(id)) throw new Error('IDが不正です');
    return join(this.root, '.editor/drafts', collection + '--' + id + '.json');
  }
  async entry(collection: Collection, id: string) {
    const all = await this.read(collection),
      published = all.find((e: any) => this.key(collection, e) === id);
    let draft: any = null;
    try {
      draft = JSON.parse(
        await readFile(this.draftPath(collection, id), 'utf8'),
      );
    } catch {}
    if (!published && !draft) throw new Error('データが見つかりません');
    return {
      document: draft?.document || published,
      revision: hash(draft || published),
      baseRevision: draft?.baseRevision || hash(published),
      hasDraft: !!draft,
    };
  }
  async draft(
    collection: Collection,
    id: string,
    revision: string,
    document: unknown,
  ) {
    let current;
    try {
      current = await this.entry(collection, id);
    } catch {
      if (collection !== 'articles' || revision !== 'new')
        throw new Error('新規作成は記事のみです');
      current = { revision: 'new', baseRevision: 'new' };
    }
    if (current.revision !== revision)
      throw new EditorConflict(
        '他の画面で更新されています。下書きを再読み込みしてください。',
      );
    const parsed = schemas[collection].parse(document);
    if (this.key(collection, parsed) !== id)
      throw new Error('固定ID・URLは変更できません');
    const value = {
      document: parsed,
      baseRevision: current.baseRevision,
      savedAt: new Date().toISOString(),
    };
    await this.atomic(this.draftPath(collection, id), value);
    return { revision: hash(value) };
  }
  async publish(collection: Collection, id: string, revision: string) {
    const path = this.draftPath(collection, id),
      draft = JSON.parse(await readFile(path, 'utf8'));
    if (hash(draft) !== revision)
      throw new EditorConflict('下書きが更新されています');
    const all = await this.read(collection),
      index = all.findIndex((e: any) => this.key(collection, e) === id);
    if ((index < 0 ? 'new' : hash(all[index])) !== draft.baseRevision)
      throw new EditorConflict(
        '公開用データが更新されています。内容を照合してください。',
      );
    const parsed = schemas[collection].parse(draft.document);
    if (
      collection === 'stones' &&
      (!('status' in parsed) || parsed.status !== 'published')
    )
      throw new Error(
        '初期210項目を維持するため、石は下書きのまま非公開にせず内容を確認してください',
      );
    if (index < 0) all.push(parsed);
    else all[index] = parsed;
    await this.atomic(
      join(this.root, 'src/content', collection + '.json'),
      all,
    );
    await unlink(path);
    return { revision: hash(parsed) };
  }
  async imageBudget() {
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
    }).format(new Date());
    let saved: { date?: string; calls?: number; limit?: number } = {};
    try {
      saved = JSON.parse(
        await readFile(join(this.root, '.editor/image-budget.json'), 'utf8'),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    return {
      date,
      calls: saved.date === date ? saved.calls || 0 : 0,
      limit: saved.limit || 100,
    };
  }
  async candidates(): Promise<Candidate[]> {
    try {
      return z
        .array(candidateSchema)
        .parse(
          JSON.parse(
            await readFile(join(this.root, '.editor/candidates.json'), 'utf8'),
          ),
        );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
  }
  async saveCandidate(document: unknown) {
    const c = candidateSchema.parse(document);
    const stones = await this.read('stones');
    if (!stones.some((s: any) => s.id === c.stoneId))
      throw new Error('石IDが見つかりません');
    if (c.status === 'approved')
      throw new Error('承認は専用の確認操作で行ってください');
    const all = await this.candidates(),
      idx = all.findIndex((x) => x.id === c.id && x.stoneId === c.stoneId);
    if (idx < 0) all.push(c);
    else all[idx] = c;
    await this.atomic(join(this.root, '.editor/candidates.json'), all);
    return c;
  }
  async approve(
    document: unknown,
    fetcher: typeof fetch = fetch,
    stage = false,
  ) {
    const c = candidateSchema.parse(document);
    const stones = await this.read('stones');
    if (!stones.some((s: any) => s.id === c.stoneId))
      throw new Error('石IDが見つかりません');
    if (
      !c.identityConfirmed ||
      !c.rightsConfirmed ||
      !c.commercial ||
      !c.derivatives ||
      c.license === 'unknown' ||
      !c.photographer.trim() ||
      !c.alt.trim()
    )
      throw new Error(
        '石の一致・権利・ライセンス・撮影者・代替テキストを確認してください',
      );
    await this.validateLocalRights(c);
    const downloaded = c.uploadSha256
      ? await readFile(
          join(this.root, '.editor/uploads', c.uploadSha256 + '.webp'),
        )
      : await downloadCandidate(c.imageUrl, fetcher);
    if (
      c.uploadSha256 &&
      createHash('sha256').update(downloaded).digest('hex') !== c.uploadSha256
    )
      throw new Error('アップロード画像が変更されています');
    const optimized = await optimizeCandidate(downloaded);
    const image = validateApproved({
      ...c,
      status: 'approved',
      reviewedAt: new Date().toISOString().slice(0, 10),
      modified: true,
      localPath: `/images/${c.stoneId}/${optimized.hash}.webp`,
      sha256: optimized.hash,
      width: optimized.width,
      height: optimized.height,
    });
    const dir = join(this.root, 'assets/approved-images', c.stoneId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, optimized.hash + '.webp'), optimized.bytes, {
      flag: 'wx',
    }).catch((e) => {
      if (e.code !== 'EEXIST') throw e;
    });
    const images = z
      .array(candidateSchema)
      .parse(await this.read('images'))
      .filter((i) => i.stoneId !== image.stoneId);
    images.push(image);
    if (!stage)
      await this.atomic(join(this.root, 'src/content/images.json'), images);
    const queue = await this.candidates();
    const index = queue.findIndex(
      (i) => i.id === c.id && i.stoneId === c.stoneId,
    );
    if (index >= 0) {
      for (const other of queue)
        if (
          other.stoneId === c.stoneId &&
          other.id !== c.id &&
          other.status === 'approved'
        )
          other.status = 'rejected';
      queue[index] = image;
      await this.atomic(join(this.root, '.editor/candidates.json'), queue);
    }
    return image;
  }
  async validateLocalRights(c: Candidate) {
    if (
      c.uploadSha256 ||
      ['Own photo', 'Commercial permission'].includes(c.license)
    ) {
      if (!c.uploadSha256 || c.provider !== '手動アップロード')
        throw new Error('所有・許諾画像の登録方法を確認してください');
      const record = JSON.parse(
        await readFile(
          join(this.root, '.editor/upload-rights', c.id + '.json'),
          'utf8',
        ),
      );
      if (
        !record.note?.trim() ||
        record.license !== c.license ||
        record.photographer !== c.photographer ||
        record.stoneId !== c.stoneId ||
        (record.sourceUrl !== undefined && record.sourceUrl !== c.pageUrl) ||
        (record.originalUrl !== undefined &&
          record.originalUrl !== (c.originalUrl || '')) ||
        (record.licenseUrl !== undefined &&
          record.licenseUrl !== c.licenseUrl) ||
        (record.uploadSha256 !== undefined &&
          record.uploadSha256 !== c.uploadSha256)
      )
        throw new Error('所有・商用利用許諾の記録を再確認してください');
    }
  }
  async applyApproved() {
    const staged = (await this.candidates())
      .filter((c) => c.status === 'approved')
      .map(validateApproved);
    const ids = new Set(staged.map((c) => c.stoneId));
    if (ids.size !== staged.length)
      throw new Error('同じ石に複数の代表画像があります');
    for (const c of staged) {
      await this.validateLocalRights(c);
      const bytes = await readFile(
        join(
          this.root,
          'assets/approved-images',
          c.stoneId,
          c.sha256 + '.webp',
        ),
      );
      if (createHash('sha256').update(bytes).digest('hex') !== c.sha256)
        throw new Error('承認画像が変更されています。再確認してください');
    }
    const current = z
      .array(candidateSchema)
      .parse(await this.read('images'))
      .map(validateApproved);
    await this.atomic(join(this.root, 'src/content/images.json'), [
      ...current.filter((c) => !ids.has(c.stoneId)),
      ...staged,
    ]);
    return { applied: staged.length };
  }
  async removePhoto(stoneId: string) {
    if (!/^s\d{3}$/.test(stoneId)) throw new Error('石IDが不正です');
    const images = z.array(candidateSchema).parse(await this.read('images'));
    await this.atomic(
      join(this.root, 'src/content/images.json'),
      images.filter((i) => i.stoneId !== stoneId),
    );
    return { ok: true };
  }
}
