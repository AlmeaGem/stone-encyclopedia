import {
  mkdir,
  readFile,
  writeFile,
  rename,
  open,
  unlink,
} from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { commonsCandidates } from './image-policy';
import {
  validateCatalog,
  candidateSchema,
  type Candidate,
} from '../src/lib/schema';
import { photoQueries, searchMode } from './photo-search';

// Called only while holding image-search.lock; quota includes failures and refreshes.
export async function commonsRequest(
  root: string,
  params: Record<string, string>,
  fetcher: typeof fetch = fetch,
) {
  const dir = join(root, '.editor');
  await mkdir(dir, { recursive: true });
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
  }).format(new Date());
  const budgetFile = join(dir, 'image-budget.json');
  let saved: { date?: string; calls?: number; limit?: number } = {};
  try {
    saved = JSON.parse(await readFile(budgetFile, 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  const budget = {
    date,
    calls: saved.date === date ? saved.calls || 0 : 0,
    limit: saved.limit || 100,
  };
  if (
    !Number.isInteger(budget.calls) ||
    budget.calls < 0 ||
    !Number.isInteger(budget.limit) ||
    budget.limit < 1 ||
    budget.limit > 1000
  )
    throw new Error('日次上限ファイルを確認してください');
  if (budget.calls >= budget.limit)
    throw new Error('画像候補検索の日次上限です');
  budget.calls++;
  await writeFile(budgetFile + '.tmp', JSON.stringify(budget));
  await rename(budgetFile + '.tmp', budgetFile);
  const lastFile = join(dir, 'image-last-request.json');
  let last = 0;
  try {
    last = JSON.parse(await readFile(lastFile, 'utf8')).at;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  if (!Number.isFinite(last) || last > Date.now() + 60000)
    throw new Error('検索間隔の記録を確認してください');
  const wait = Math.max(0, 1050 - (Date.now() - last));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  await writeFile(lastFile, JSON.stringify({ at: Date.now() }));
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    maxlag: '5',
    ...params,
  }).toString();
  let response: Response;
  try {
    response = await fetcher(url, {
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
      headers: {
        'User-Agent':
          'ALMEA-Stone-Encyclopedia/0.2 (https://github.com/AlmeaGem/stone-encyclopedia; manual review)',
      },
    });
  } catch {
    throw new Error(
      'Wikimedia Commonsへ接続できませんでした。公開写真は変更していません。',
    );
  }
  if (!response.ok)
    throw new Error(
      `Commons検索に失敗（HTTP ${response.status}）。制限を回避せず、時間をおいて再取得してください。`,
    );
  const data = await response.json();
  if (data.error)
    throw new Error(
      `Commons APIエラー：${String(data.error.code).slice(0, 80)}`,
    );
  return data;
}
export async function collectForStone(
  root: string,
  id: string,
  fetcher: typeof fetch = fetch,
  mode: unknown = 'sphere',
) {
  const selectedMode = searchMode(mode);
  return imageSearchLock(root, async () => {
    const stones = validateCatalog(
      JSON.parse(await readFile(join(root, 'src/content/stones.json'), 'utf8')),
    );
    const stone = stones.find((s) => s.id === id);
    if (!stone) throw new Error('石IDが不正です');
    const file = join(root, '.editor/candidates.json');
    let previous: Candidate[] = [];
    try {
      previous = JSON.parse(await readFile(file, 'utf8')).map((c: unknown) =>
        candidateSchema.parse(c),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    const found: Candidate[] = [];
    for (const query of photoQueries(stone, selectedMode)) {
      if (found.length >= 10) break;
      const data = await commonsRequest(
        root,
        {
          generator: 'search',
          gsrsearch: query,
          gsrnamespace: '6',
          gsrlimit: '10',
          prop: 'imageinfo',
          iiprop: 'url|extmetadata|mime|size',
          iiurlwidth: '1400',
        },
        fetcher,
      );
      const parsed = commonsCandidates(data, stone).sort(
        (a, b) =>
          (b.sourceWidth || 0) * (b.sourceHeight || 0) -
          (a.sourceWidth || 0) * (a.sourceHeight || 0),
      );
      for (const c of parsed) {
        if (found.some((x) => x.id === c.id)) continue;
        found.push({
          ...c,
          searchName: query.slice(0, 200),
          searchMode: selectedMode,
        });
        if (found.length >= 10) break;
      }
      // Never truncate or delete historical candidates, including old approved images.
      for (const c of found)
        if (!previous.some((x) => x.id === c.id && x.stoneId === c.stoneId))
          previous.push(c);
      await writeFile(file + '.tmp', JSON.stringify(previous, null, 2));
      await rename(file + '.tmp', file);
    }
    return found;
  });
}
export async function imageSearchLock<T>(root: string, run: () => Promise<T>) {
  const directory = join(root, '.editor');
  await mkdir(directory, { recursive: true });
  const path = join(directory, 'image-search.lock');
  let lock;
  try {
    const pid = Number(await readFile(path, 'utf8'));
    if (!Number.isInteger(pid) || pid <= 0)
      throw new Error('候補収集中、または検索ロックの確認が必要です');
    try {
      process.kill(pid, 0);
      throw new Error('候補収集中です');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e;
    }
    await unlink(path);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  try {
    lock = await open(path, 'wx');
    await lock.writeFile(String(process.pid));
  } catch {
    throw new Error(
      '候補収集中です。別の検索が終了してから再試行してください。',
    );
  }
  try {
    return await run();
  } finally {
    await lock.close();
    await unlink(path);
  }
}

if (process.argv[1]?.endsWith('collect-images.ts')) {
  const ids = process.argv.slice(2);
  if (!ids.length || ids.length > 3)
    throw new Error('石IDを1〜3件指定してください');
  for (const id of ids)
    console.log({
      id,
      candidates: (await collectForStone(resolve('.'), id)).length,
    });
}
