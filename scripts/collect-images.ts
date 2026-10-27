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
    limit: 20,
  };
  try {
    const saved = JSON.parse(await readFile(budgetFile, 'utf8'));
    if (saved.date === budget.date) budget = { ...budget, ...saved };
  } catch {}
  if (budget.calls >= budget.limit)
    throw new Error('画像候補検索の日次上限（20回）です');
  budget.calls++;
  await writeFile(budgetFile + '.tmp', JSON.stringify(budget));
  await rename(budgetFile + '.tmp', budgetFile);
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: stone.english + ' mineral',
    gsrnamespace: '6',
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '1400',
    origin: '*',
  }).toString();
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
      'Wikimedia Commonsへ接続できませんでした。候補の公開・既存写真の変更は行っていません。',
    );
  }
  if (!response.ok)
    throw new Error(
      '画像候補の検索に失敗しました。公開情報は変更していません。',
    );
  const candidates = commonsCandidates(await response.json(), stone);
  let old: any[] = [];
  try {
    old = JSON.parse(await readFile(queueFile, 'utf8'));
  } catch {}
  const next = [...old];
  for (const c of candidates)
    if (!next.some((x) => x.id === c.id && x.stoneId === c.stoneId))
      next.push(c);
  await writeFile(queueFile + '.tmp', JSON.stringify(next, null, 2));
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
    lock = await open(path, 'wx');
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
