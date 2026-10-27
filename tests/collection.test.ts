import { beforeEach, afterEach, it, expect } from 'vitest';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectForStone } from '../scripts/collect-images';
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'almea-collection-'));
  await cp('src/content', join(root, 'src/content'), { recursive: true });
});
afterEach(async () => rm(root, { recursive: true, force: true }));
const fixture = {
  query: {
    pages: {
      1: {
        pageid: 1,
        imageinfo: [
          {
            url: 'https://upload.wikimedia.org/test.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
            extmetadata: {
              Artist: { value: 'Fixture only' },
              LicenseShortName: { value: 'CC0' },
            },
          },
        ],
      },
    },
  },
};
it('automatically collects candidates without publication and deduplicates repeated search results', async () => {
  const before = await readFile(join(root, 'src/content/images.json'), 'utf8');
  const names: string[] = [];
  const fetcher: typeof fetch = async (url) => {
    names.push(new URL(String(url)).searchParams.get('gsrsearch') || '');
    expect(String(url)).toContain('commons.wikimedia.org/w/api.php');
    return Response.json(fixture);
  };
  await collectForStone(root, 's107', fetcher);
  await collectForStone(root, 's107', fetcher);
  const queue = JSON.parse(
    await readFile(join(root, '.editor/candidates.json'), 'utf8'),
  );
  expect(names.some((n) => n.includes('Rose Quartz'))).toBe(true);
  expect(names.some((n) => n.includes('ローズクォーツ'))).toBe(true);
  expect(queue).toHaveLength(1);
  expect(queue[0].status).toBe('pending');
  expect(queue[0].rightsConfirmed).toBe(false);
  expect(await readFile(join(root, 'src/content/images.json'), 'utf8')).toBe(
    before,
  );
}, 15000);
it('stops safely on API failures and always releases its search lock', async () => {
  await expect(
    collectForStone(
      root,
      's107',
      async () => new Response(null, { status: 403 }),
    ),
  ).rejects.toThrow('検索に失敗');
  await expect(
    readFile(join(root, '.editor/image-search.lock')),
  ).rejects.toThrow();
  expect(
    JSON.parse(await readFile(join(root, 'src/content/images.json'), 'utf8')),
  ).toEqual([]);
  await expect(
    collectForStone(root, 's107', async () => {
      throw new Error('network fixture');
    }),
  ).rejects.toThrow('接続できません');
});
it('enforces daily quotas and a cross-process lock before any network request', async () => {
  await mkdir(join(root, '.editor'), { recursive: true });
  await writeFile(
    join(root, '.editor/image-budget.json'),
    JSON.stringify({
      date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(
        new Date(),
      ),
      calls: 20,
      limit: 20,
    }),
  );
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return Response.json(fixture);
  };
  await expect(collectForStone(root, 's107', fetcher)).rejects.toThrow(
    '日次上限',
  );
  expect(calls).toBe(0);
  await writeFile(join(root, '.editor/image-search.lock'), 'fixture');
  await expect(collectForStone(root, 's107', fetcher)).rejects.toThrow(
    '候補収集中',
  );
  expect(calls).toBe(0);
});
