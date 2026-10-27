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
import type { Candidate } from '../src/lib/schema';
import { validateCatalog } from '../src/lib/schema';
async function collectUnlocked(
  root: string,
  id: string,
  fetcher: typeof fetch = fetch,
) {
  const stones = validateCatalog(
      JSON.parse(await readFile(join(root, 'src/content/stones.json'), 'utf8')),
    ),
    stone = stones.find((s) => s.id === id);
  if (!stone) throw new Error('石IDが不正です');
  const dir = join(root, '.editor');
  await mkdir(dir, { recursive: true });
  const queueFile = join(dir, 'candidates.json'),
    budgetFile = join(dir, 'image-budget.json');
  let budget: { date: string; calls: number; limit: number } = {
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(
      new Date(),
    ),
    calls: 0,
    limit: 100,
  };
  try {
    const saved = JSON.parse(await readFile(budgetFile, 'utf8'));
    if (
      Number.isInteger(saved.limit) &&
      saved.limit >= 1 &&
      saved.limit <= 1000
    )
      budget.limit = saved.limit;
    if (saved.date === budget.date) budget.calls = saved.calls;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  if (!Number.isInteger(budget.calls) || budget.calls < 0)
    throw new Error('日次上限ファイルが不正です。確認するまで停止します。');
  if (budget.calls >= budget.limit)
    throw new Error('画像候補検索の日次上限です');
  budget.calls++;
  await writeFile(budgetFile + '.tmp', JSON.stringify(budget));
  await rename(budgetFile + '.tmp', budgetFile);
  const names = [
    ...new Set(
      [stone.english, stone.name, ...stone.aliases]
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ].slice(0, 3);
  const candidates: Candidate[] = [];
  for (const name of names) {
    if (candidates.length >= 10) break;
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: `"${name.replace(/"/g, '')}" filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: '10',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime',
      iiurlwidth: '1400',
      maxlag: '5',
    }).toString();
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
    let response: Response;
    try {
      response = await fetcher(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent':
            'ALMEA-Stone-Encyclopedia/0.1 (manual image review; no auto publish)',
        },
      });
    } catch {
      throw new Error(
        'Wikimedia Commonsへ接続できませんでした。ジョブを停止し、公開写真は変更していません。',
      );
    }
    if (!response.ok)
      throw new Error(
        `Commons検索に失敗（HTTP ${response.status}）。再試行は再開ボタンで行ってください。`,
      );
    const data = await response.json();
    if (data.error)
      throw new Error(
        `Commons APIが停止を要求しました（${String(data.error.code).slice(0, 80)}）。時間をおいて再開してください。`,
      );
    for (const c of commonsCandidates(data, stone)) {
      if (!candidates.some((x) => x.id === c.id))
        candidates.push({ ...c, searchName: name });
      if (candidates.length >= 10) break;
    }
    const prior = await new (await import('./admin-store')).EditorStore(
      root,
    ).candidates();
    for (const c of candidates)
      if (!prior.some((x) => x.id === c.id && x.stoneId === c.stoneId))
        prior.push(c);
    await writeFile(
      queueFile + '.tmp',
      JSON.stringify(capQueue(prior, id), null, 2),
    );
    await rename(queueFile + '.tmp', queueFile);
    // One request per second, including alias searches. No automatic retry loops.
    if (names.indexOf(name) < names.length - 1 && candidates.length < 10) {
      await new Promise((r) => setTimeout(r, 1000));
      if (budget.calls >= budget.limit)
        throw new Error(
          '日次検索上限です。上限設定または翌日を確認して再開してください。',
        );
      budget.calls++;
      await writeFile(budgetFile + '.tmp', JSON.stringify(budget));
      await rename(budgetFile + '.tmp', budgetFile);
    }
  }
  let old: any[] = [];
  try {
    old = JSON.parse(await readFile(queueFile, 'utf8'));
  } catch {}
  const next = [...old];
  for (const c of candidates)
    if (!next.some((x) => x.id === c.id && x.stoneId === c.stoneId))
      next.push(c);
  await writeFile(
    queueFile + '.tmp',
    JSON.stringify(capQueue(next, id), null, 2),
  );
  await rename(queueFile + '.tmp', queueFile);
  return candidates;
}
if (process.argv[1]?.endsWith('collect-images.ts')) {
  const ids = process.argv.slice(2);
  if (ids.length < 1 || ids.length > 3)
    throw new Error(
      '1〜3件の石IDを指定してください。例 npm run images:collect -- s107',
    );
  for (const id of ids)
    console.log({
      id,
      candidates: (await collectForStone(resolve('.'), id)).length,
    });
}

export async function collectForStone(
  root: string,
  id: string,
  fetcher: typeof fetch = fetch,
) {
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
    return await collectUnlocked(root, id, fetcher);
  } finally {
    await lock.close();
    await unlink(path);
  }
}

function capQueue(queue: Candidate[], id: string) {
  return [
    ...queue.filter((c) => c.stoneId !== id),
    ...queue
      .filter((c) => c.stoneId === id)
      .sort(
        (a, b) =>
          Number(b.status === 'approved') - Number(a.status === 'approved'),
      )
      .slice(0, 10),
  ];
}
