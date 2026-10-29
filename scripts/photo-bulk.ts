import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { EditorStore } from './admin-store';
import { type Candidate } from '../src/lib/schema';
const digest = (v: unknown) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex');
const itemSchema = z
  .object({
    id: z.string().min(1).max(150),
    stoneId: z.string().regex(/^s\d{3}$/),
    revision: z.string().regex(/^[a-f0-9]{64}$/),
    imageKind: z
      .enum(['real-photo', 'ai-generated', 'illustrative-photo'])
      .optional(),
    alt: z.string().trim().max(300),
    identityConfirmed: z.boolean(),
    rightsConfirmed: z.boolean(),
  })
  .strict();
type Decision = z.infer<typeof itemSchema>;
type Result = {
  id: string;
  stoneId: string;
  name: string;
  status: 'ready' | 'adopted' | 'failed' | 'excluded';
  reason: string;
};
type BulkJob = {
  token: string;
  status: string;
  createdAt: number;
  results: Result[];
  message: string;
};
type Plan = {
  token: string;
  createdAt: number;
  items: Decision[];
  results: Result[];
};
export class PhotoBulk {
  running = false;
  constructor(
    private store: EditorStore,
    private fetcher: typeof fetch = fetch,
  ) {}
  async state() {
    let job: any = null;
    try {
      job = JSON.parse(
        await readFile(
          join(this.store.root, '.editor/bulk-adoption.json'),
          'utf8',
        ),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    if (job?.status === 'running' && !this.running) {
      job.status = 'interrupted';
      job.message =
        '管理サーバーが停止しました。採用済みは保持されています。残りを再選択して確認してください';
      // Recovery is derived for display; GET requests never race to rewrite the journal.
    }
    const published = await this.store.read('images');
    return {
      job,
      candidates: (await this.store.candidates()).map((c) => {
        const current = published.find(
          (p: Candidate) => p.stoneId === c.stoneId,
        );
        const applied =
          !!current && current.id === c.id && current.sha256 === c.sha256;
        const protectedPhoto = !!current && !applied;
        return {
          id: c.id,
          stoneId: c.stoneId,
          revision: digest(c),
          state: applied
            ? '図鑑データへ反映済み'
            : c.status === 'approved'
              ? '承認済み・反映待ち'
              : c.status === 'review'
                ? '確認待ち'
                : c.status === 'rejected'
                  ? '不採用'
                  : '仮保存',
          next: protectedPhoto
            ? '既存の代表写真を保護中。意図的な差し替えは単品画面で確認してください'
            : applied
              ? '公開サイトへ反映待ち（GitHub・Actionsで公開を確認）'
              : c.status === 'approved'
                ? '承認済みを一括反映'
                : '石種・区分・権利を確認して採用',
          protected: protectedPhoto,
        };
      }),
    };
  }
  async check(item: Decision, duplicates: Set<string>): Promise<Result> {
    const c = (await this.store.candidates()).find(
      (c) => c.id === item.id && c.stoneId === item.stoneId,
    );
    const result: Result = {
      id: item.id,
      stoneId: item.stoneId,
      name: c?.stoneName || item.stoneId,
      status: 'ready',
      reason: '',
    };
    try {
      if (!c) throw Error('候補が見つかりません');
      if (digest(c) !== item.revision)
        throw Error('候補が更新されています。一覧を再読込してください');
      if (duplicates.has(c.stoneId))
        throw Error('同じ石の候補を複数選択しています。1枚に絞ってください');
      const published = (await this.store.read('images')).find(
        (p: Candidate) => p.stoneId === c.stoneId,
      );
      if (published && (published.id !== c.id || published.sha256 !== c.sha256))
        throw Error(
          '既存の代表写真を保護しています。一括採用では上書きできません',
        );
      const staged = (await this.store.candidates()).find(
        (p) =>
          p.stoneId === c.stoneId && p.status === 'approved' && p.id !== c.id,
      );
      if (staged) throw Error('この石は別の代表写真が承認済みです');
      if (c.status === 'approved')
        throw Error('すでに承認済みです。一括反映へ進んでください');
      if (c.status === 'rejected')
        throw Error('不採用の候補です。単品画面で再確認してください');
      if (!item.imageKind)
        throw Error('実物写真／イメージ写真の区分を設定してください');
      if (!item.identityConfirmed || !item.rightsConfirmed)
        throw Error('石ID・石種と利用権限の確認が必要です');
      if (
        !item.alt ||
        !c.photographer.trim() ||
        c.license === 'unknown' ||
        !c.commercial ||
        !c.derivatives
      )
        throw Error(
          '撮影者・ライセンス・写真説明・商用利用条件を確認してください',
        );
      if (
        (c.license === 'AI-generated') !==
        (item.imageKind === 'ai-generated')
      )
        throw Error('AI生成区分と権利種別が一致していません');
      if (!c.pageUrl || (!c.licenseUrl && c.license.startsWith('CC')))
        throw Error('出典・ライセンスURLが不足しています');
      await this.store.validateLocalRights(c);
    } catch (e) {
      result.status = 'excluded';
      result.reason =
        (e as NodeJS.ErrnoException).code === 'ENOENT'
          ? '画像または権利記録が見つかりません。元のMacの保存フォルダーを確認してください'
          : (e as Error).message;
    }
    return result;
  }
  async preview(raw: unknown) {
    const items = z.array(itemSchema).min(1).max(210).parse(raw);
    if (new Set(items.map((i) => i.id + ':' + i.stoneId)).size !== items.length)
      throw Error('同じ候補が重複しています');
    const duplicates = new Set(
      items
        .filter((i) => items.filter((x) => x.stoneId === i.stoneId).length > 1)
        .map((i) => i.stoneId),
    );
    const results: Result[] = [];
    for (const item of items) results.push(await this.check(item, duplicates));
    const plan: Plan = {
      token: randomUUID(),
      createdAt: Date.now(),
      items,
      results,
    };
    await this.store.atomic(
      join(this.store.root, '.editor/bulk-previews', plan.token + '.json'),
      plan,
    );
    return plan;
  }
  async adopt(token: string): Promise<BulkJob> {
    if (!/^[a-f0-9-]{36}$/.test(token))
      throw Error('確認画面から実行してください');
    const plan: Plan = JSON.parse(
      await readFile(
        join(this.store.root, '.editor/bulk-previews', token + '.json'),
        'utf8',
      ),
    );
    if (Date.now() - plan.createdAt > 3600000)
      throw Error('確認画面の期限が切れました。もう一度確認してください');
    let previous: BulkJob | undefined;
    try {
      previous = JSON.parse(
        await readFile(
          join(this.store.root, '.editor/bulk-adoption.json'),
          'utf8',
        ),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    if (previous?.token === token) return previous;
    const job = {
      token,
      status: 'running',
      createdAt: plan.createdAt,
      results: [] as Result[],
      message: '',
    };
    const save = () =>
      this.store.atomic(
        join(this.store.root, '.editor/bulk-adoption.json'),
        job,
      );
    this.running = true;
    try {
      await save();
      for (const [index, item] of plan.items.entries()) {
        let result = plan.results[index];
        if (result.status === 'ready') {
          result = await this.check(item, new Set());
          if (result.status === 'ready')
            try {
              const c = (await this.store.candidates()).find(
                (c) => c.id === item.id && c.stoneId === item.stoneId,
              )!;
              await this.store.approve(
                {
                  ...c,
                  imageKind: item.imageKind,
                  alt: item.alt,
                  identityConfirmed: true,
                  rightsConfirmed: true,
                },
                this.fetcher,
                true,
              );
              result = {
                ...result,
                status: 'adopted',
                reason: '承認済み・反映待ち',
              };
            } catch (e) {
              result = {
                ...result,
                status: 'failed',
                reason:
                  (e as NodeJS.ErrnoException).code === 'ENOENT'
                    ? '画像または権利記録が見つかりません。元のMacの保存フォルダーを確認してください'
                    : (e as Error).message,
              };
            }
        }
        if (result.status === 'excluded' || result.status === 'failed') {
          const current = (await this.store.candidates()).find(
            (c) => c.id === item.id && c.stoneId === item.stoneId,
          );
          // Mark only the reviewed snapshot; never replace edits made elsewhere or approved records.
          if (
            current?.status === 'pending' &&
            digest(current) === item.revision
          ) {
            await this.store.saveCandidate({ ...current, status: 'review' });
          }
        }
        job.results.push(result);
        await save();
      }
      job.status = 'completed';
      job.message =
        '採用済みは保持されています。次に承認済みを一括反映してください';
      await save();
      return job;
    } finally {
      this.running = false;
    }
  }
}
