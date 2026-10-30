import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { EditorStore } from './admin-store';
import { candidateSchema, type Candidate } from '../src/lib/schema';
import { photoKey, photoRevision, readPhotoTrash } from './photo-trash-state';
const selectionSchema = z
  .object({
    id: z.string().min(1).max(150),
    stoneId: z.string().regex(/^s\d{3}$/),
    revision: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const selectionList = z.array(selectionSchema).min(1).max(210);
const planSchema = z.object({
  token: z.uuid(),
  createdAt: z.number(),
  items: z.array(
    z.object({
      selection: selectionSchema,
      candidate: candidateSchema.nullable(),
      allowed: z.boolean(),
      reason: z.string(),
    }),
  ),
});
const RETENTION = 30 * 24 * 60 * 60 * 1000;
export class PhotoTrash {
  constructor(
    private store: EditorStore,
    private now = () => Date.now(),
  ) {}
  private async inspect(selection: z.infer<typeof selectionSchema>) {
    const matches = (await this.store.rawCandidates()).filter(
      (c) => photoKey(c) === photoKey(selection),
    );
    const c = matches[0] || null;
    let reason = '';
    if (matches.length !== 1)
      reason = '候補が存在しないか、同じ識別子が重複しています';
    else if (photoRevision(c) !== selection.revision)
      reason = '候補が更新されています。再読込して確認し直してください';
    else {
      reason = await this.protection(c);
      if (
        !reason &&
        (await readPhotoTrash(this.store.root)).entries.some(
          (e) => e.restoredAt === null && photoKey(e.candidate) === photoKey(c),
        )
      )
        reason = 'すでにゴミ箱へ移動済みです';
    }
    return { selection, candidate: c, allowed: !reason, reason };
  }
  private async protection(c: Candidate) {
    if (!['pending', 'review'].includes(c.status))
      return '削除できるのは仮保存・確認待ちだけです。承認済み画像などは保護されています';
    const images = z
      .array(candidateSchema)
      .parse(await this.store.read('images'));
    if (
      images.some(
        (p) =>
          photoKey(p) === photoKey(c) ||
          (c.localPath && p.localPath === c.localPath) ||
          (c.sha256 && p.stoneId === c.stoneId && p.sha256 === c.sha256),
      )
    )
      return '公開用データに関連する代表写真は削除できません';
    return '';
  }
  async state() {
    const candidates = await this.store.candidates();
    const permissions = [];
    for (const c of candidates) {
      const reason = await this.protection(c);
      permissions.push({
        id: c.id,
        stoneId: c.stoneId,
        revision: photoRevision(c),
        deletable: !reason,
        reason,
      });
    }
    const trash = await readPhotoTrash(this.store.root);
    return {
      permissions,
      entries: trash.entries
        .filter((e) => e.restoredAt === null)
        .map((e) => ({ ...e, canRestore: this.now() < e.restoreUntil }))
        .sort((a, b) => b.deletedAt - a.deletedAt),
    };
  }
  async preview(raw: unknown) {
    const items = selectionList.parse(raw);
    if (new Set(items.map(photoKey)).size !== items.length)
      throw Error('同じ候補が重複しています');
    const inspected = [];
    for (const item of items) inspected.push(await this.inspect(item));
    const plan = {
      token: randomUUID(),
      createdAt: this.now(),
      items: inspected,
    };
    await this.store.atomic(
      join(this.store.root, '.editor/trash-previews', plan.token + '.json'),
      plan,
    );
    return plan;
  }
  async remove(token: string, raw: unknown) {
    const validToken = z.uuid().parse(token),
      items = selectionList.parse(raw);
    if (new Set(items.map(photoKey)).size !== items.length)
      throw Error('同じ候補が重複しています');
    const plan = planSchema.parse(
      JSON.parse(
        await readFile(
          join(this.store.root, '.editor/trash-previews', validToken + '.json'),
          'utf8',
        ),
      ),
    );
    if (this.now() - plan.createdAt > 15 * 60 * 1000)
      throw Error('削除確認の期限が切れました。確認画面を開き直してください');
    for (const item of items)
      if (
        !plan.items.some(
          (p) =>
            p.allowed &&
            photoKey(p.selection) === photoKey(item) &&
            p.selection.revision === item.revision,
        )
      )
        throw Error('確認画面の対象以外は削除できません');
    const trash = await readPhotoTrash(this.store.root),
      prior = trash.entries.filter((e) => e.token === validToken);
    if (prior.length) {
      if (
        prior.length !== items.length ||
        items.some(
          (i) =>
            !prior.some(
              (e) =>
                photoKey(e.candidate) === photoKey(i) &&
                photoRevision(e.candidate) === i.revision,
            ),
        )
      )
        throw Error('実行済みの確認内容は変更できません');
      return { deleted: prior.length, alreadyProcessed: true };
    }
    const checked = [];
    for (const item of items) {
      const result = await this.inspect(item);
      if (!result.allowed) throw Error(result.reason);
      checked.push(result.candidate!);
    }
    const at = this.now();
    trash.entries.push(
      ...checked.map((candidate) => ({
        trashId: randomUUID(),
        token: validToken,
        candidate,
        deletedAt: at,
        restoreUntil: at + RETENTION,
        restoredAt: null,
      })),
    );
    // One atomic tombstone commit. Candidate metadata, original bytes, rights records and public files never move or change.
    await this.store.atomic(
      join(this.store.root, '.editor/photo-trash.json'),
      trash,
    );
    return { deleted: checked.length, alreadyProcessed: false };
  }
  async restore(raw: unknown) {
    const id = z.uuid().parse(raw),
      trash = await readPhotoTrash(this.store.root);
    const entry = trash.entries.find((e) => e.trashId === id);
    if (!entry) throw Error('ゴミ箱の候補が見つかりません');
    if (entry.restoredAt !== null)
      return { restored: 0, alreadyProcessed: true };
    if (this.now() >= entry.restoreUntil)
      throw Error(
        '30日間の復元期限を過ぎています。自動で原本は消していません。バックアップを確認してください',
      );
    const current = (await this.store.rawCandidates()).filter(
      (c) => photoKey(c) === photoKey(entry.candidate),
    );
    if (
      current.length !== 1 ||
      photoRevision(current[0]) !== photoRevision(entry.candidate)
    )
      throw Error(
        '保存記録が変更されています。上書きせず元のフォルダーを確認してください',
      );
    const reason = await this.protection(current[0]);
    if (reason) throw Error(reason);
    // Verify the local uploaded original and rights record before restoring; never download a replacement.
    await this.store.validateLocalRights(current[0]);
    if (current[0].uploadSha256) {
      const { createHash } = await import('node:crypto');
      const bytes = await readFile(
        join(
          this.store.root,
          '.editor/uploads',
          current[0].uploadSha256 + '.webp',
        ),
      );
      if (
        createHash('sha256').update(bytes).digest('hex') !==
        current[0].uploadSha256
      )
        throw Error('原本画像が変更されています。復元を中止しました');
    }
    entry.restoredAt = this.now();
    await this.store.atomic(
      join(this.store.root, '.editor/photo-trash.json'),
      trash,
    );
    return { restored: 1, alreadyProcessed: false };
  }
  async thumbnailCandidate(raw: unknown) {
    const id = z.uuid().parse(raw),
      entry = (await readPhotoTrash(this.store.root)).entries.find(
        (e) => e.trashId === id && e.restoredAt === null,
      );
    if (!entry) throw Error('ゴミ箱の候補が見つかりません');
    return entry.candidate;
  }
}
