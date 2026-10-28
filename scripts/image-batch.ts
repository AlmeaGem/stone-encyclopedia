import { open, readFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EditorStore } from './admin-store';
import { searchMode, type PhotoSearchMode } from './photo-search';
import { collectForStone } from './collect-images';
export type ImageJob = {
  mode?: PhotoSearchMode;
  id: string;
  ids: string[];
  cursor: number;
  status: 'running' | 'paused' | 'error' | 'completed';
  error: string;
  updatedAt: string;
};
export class ImageBatch {
  private job: ImageJob | null = null;
  private running = false;
  private writes: Promise<unknown> = Promise.resolve();
  constructor(
    private store: EditorStore,
    private collect = collectForStone,
    private intervalMs = 1100,
  ) {}
  private async save() {
    if (!this.job) return;
    this.job.updatedAt = new Date().toISOString();
    const snapshot = structuredClone(this.job);
    this.writes = this.writes.then(() =>
      this.store.atomic(
        join(this.store.root, '.editor/image-job.json'),
        snapshot,
      ),
    );
    await this.writes;
  }
  get busy() {
    return this.running;
  }
  async active() {
    if (this.running) return true;
    try {
      const pid = Number(
        await readFile(
          join(this.store.root, '.editor/image-batch.lock'),
          'utf8',
        ),
      );
      if (!Number.isInteger(pid) || pid <= 0)
        throw new Error('ジョブロックが不正です');
      try {
        process.kill(pid, 0);
        return true;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ESRCH') return false;
        throw e;
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw e;
    }
  }
  async state() {
    if (!this.running) {
      try {
        this.job = JSON.parse(
          await readFile(
            join(this.store.root, '.editor/image-job.json'),
            'utf8',
          ),
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
      if (this.job?.status === 'running' && !(await this.active())) {
        this.job.status = 'paused';
        this.job.error =
          '管理サーバー再起動後は再開を押してください。完了分は再検索しません。';
        await this.save();
      }
    }
    return this.job;
  }
  async start(ids: string[], mode: unknown = 'sphere') {
    const selectedMode = searchMode(mode);
    if (await this.active()) throw new Error('別の収集ワーカーが動作中です');
    await this.state();
    if (this.running || (this.job && this.job.status !== 'completed'))
      throw new Error('既存ジョブを再開してください。新規作成は完了後です。');
    const stones = await this.store.read('stones');
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > 210 ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !stones.some((s: any) => s.id === id))
    )
      throw new Error('対象の石IDが不正です');
    this.job = {
      mode: selectedMode,
      id: randomUUID(),
      ids,
      cursor: 0,
      status: 'paused',
      error: '',
      updatedAt: '',
    };
    await this.save();
    return this.resume();
  }
  async pause() {
    if (!this.running && (await this.active()))
      throw new Error('収集を開始した管理サーバーから停止してください');
    await this.state();
    if (this.job && this.job.status !== 'completed') {
      this.job.status = 'paused';
      await this.save();
    }
    return this.job;
  }
  async resume() {
    await this.state();
    if (!this.job || this.job.status === 'completed')
      throw new Error('再開するジョブがありません');
    if (this.running) return this.job;
    const directory = join(this.store.root, '.editor');
    await mkdir(directory, { recursive: true });
    const path = join(directory, 'image-batch.lock');
    try {
      const pid = Number(await readFile(path, 'utf8'));
      if (!Number.isInteger(pid) || pid <= 0)
        throw new Error('ジョブロックを確認してください');
      try {
        process.kill(pid, 0);
        throw new Error('別の収集ワーカーが動作中です');
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e;
      }
      await unlink(path);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    const handle = await open(path, 'wx');
    await handle.writeFile(String(process.pid));
    this.job.status = 'running';
    this.job.error = '';
    this.running = true;
    await this.save();
    void (async () => {
      try {
        while (
          this.job!.status === 'running' &&
          this.job!.cursor < this.job!.ids.length
        ) {
          await this.collect(
            this.store.root,
            this.job!.ids[this.job!.cursor],
            fetch,
            this.job!.mode || 'sphere',
          );
          this.job!.cursor++;
          if (this.job!.cursor === this.job!.ids.length)
            this.job!.status = 'completed';
          await this.save();
          if (this.job!.status === 'running')
            await new Promise((r) => setTimeout(r, this.intervalMs));
        }
      } catch (e) {
        this.job!.status = 'error';
        this.job!.error = e instanceof Error ? e.message : '収集に失敗しました';
        await this.save();
      } finally {
        this.running = false;
        await handle.close();
        await unlink(path);
      }
    })();
    return this.job;
  }
}
