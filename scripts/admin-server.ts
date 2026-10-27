import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { EditorStore, EditorConflict } from './admin-store';
import { collectForStone } from './collect-images';

const scriptDir = fileURLToPath(new URL('./admin/', import.meta.url));
export async function startEditor(root: string, password: string, port = 4322) {
  if (password.length < 20 || password.length > 256)
    throw new Error(
      'EDITOR_PASSWORDに20文字以上の専用パスフレーズを設定してください。公開サイトやManagerの認証情報は使わないでください。',
    );
  const sessions = new Map<string, { csrf: string; expires: number }>();
  const store = new EditorStore(resolve(root));
  const salt = randomBytes(32),
    key = scryptSync(password, salt, 64);
  const attempts = new Map<string, { count: number; until: number }>();
  let mutation: Promise<unknown> = Promise.resolve();
  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
      );
      res.setHeader('Referrer-Policy', 'no-referrer');
      const address = server.address();
      const actual =
        typeof address === 'object' && address ? address.port : port;
      const hosts = new Set([`127.0.0.1:${actual}`, `localhost:${actual}`]);
      if (!hosts.has(req.headers.host || '')) {
        res.writeHead(403).end('Host not allowed');
        return;
      }
      const origin = `http://${req.headers.host}`;
      const url = new URL(req.url || '/', origin);
      const token = /(?:^|;\s*)editor=([a-f0-9]{64})/.exec(
        req.headers.cookie || '',
      )?.[1];
      const session = token ? sessions.get(token) : undefined;
      const authenticated = !!session && session.expires > Date.now();
      const json = (status: number, value: unknown) => {
        res.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
        });
        res.end(JSON.stringify(value));
      };
      const file = async (name: string, type: string) => {
        res.writeHead(200, { 'Content-Type': type });
        res.end(await readFile(join(scriptDir, name)));
      };
      try {
        if (req.method === 'GET' && url.pathname === '/login') {
          await file('login.html', 'text/html; charset=utf-8');
          return;
        }
        if (req.method === 'GET' && url.pathname === '/login.js') {
          await file('login.js', 'application/javascript');
          return;
        }
        if (req.method === 'GET' && url.pathname === '/editor.css') {
          await file('editor.css', 'text/css');
          return;
        }
        const post = req.method === 'POST';
        if (
          post &&
          (req.headers.origin !== origin ||
            req.headers['sec-fetch-site'] === 'cross-site' ||
            !req.headers['content-type']?.startsWith('application/json'))
        ) {
          json(403, {
            error: '同一オリジンのJSONリクエストだけを受け付けます',
          });
          return;
        }
        let body: any = {};
        if (post) {
          let bytes = 0;
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            bytes += chunk.length;
            if (bytes > 1500000) {
              json(413, { error: '入力が大きすぎます' });
              return;
            }
            chunks.push(chunk);
          }
          body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
        }
        if (post && url.pathname === '/api/login') {
          const ip = req.socket.remoteAddress || 'local';
          let attempt = attempts.get(ip);
          if (!attempt || attempt.until < Date.now())
            attempt = { count: 0, until: Date.now() + 900000 };
          if (attempt.count >= 5) {
            json(429, {
              error: '試行回数の上限です。15分後に再試行してください。',
            });
            return;
          }
          const supplied =
            typeof body.password === 'string' && body.password.length <= 256
              ? body.password
              : '';
          if (!timingSafeEqual(key, scryptSync(supplied, salt, 64))) {
            attempt.count++;
            attempts.set(ip, attempt);
            json(401, { error: '認証できませんでした' });
            return;
          }
          attempts.delete(ip);
          const id = randomBytes(32).toString('hex');
          sessions.set(id, {
            csrf: randomBytes(32).toString('hex'),
            expires: Date.now() + 3600000,
          });
          res.setHeader(
            'Set-Cookie',
            `editor=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`,
          );
          json(200, { ok: true });
          return;
        }
        if (!authenticated) {
          if (url.pathname.startsWith('/api/'))
            json(401, { error: 'ログインが必要です' });
          else {
            res.writeHead(303, { Location: '/login' }).end();
          }
          return;
        }
        if (post && req.headers['x-csrf-token'] !== session!.csrf) {
          json(403, { error: '画面を再読み込みしてください' });
          return;
        }
        if (req.method === 'GET' && url.pathname === '/') {
          await file('index.html', 'text/html; charset=utf-8');
          return;
        }
        if (req.method === 'GET' && url.pathname === '/editor.js') {
          await file('editor.js', 'application/javascript');
          return;
        }
        if (req.method === 'GET' && url.pathname === '/api/state') {
          json(200, {
            csrf: session!.csrf,
            stones: await store.read('stones'),
            articles: await store.read('articles'),
            categories: await store.read('categories'),
            images: await store.read('images'),
            candidates: await store.candidates(),
          });
          return;
        }
        if (req.method === 'GET' && url.pathname === '/api/entry') {
          json(
            200,
            await store.entry(
              store.validCollection(url.searchParams.get('collection') || ''),
              url.searchParams.get('id') || '',
            ),
          );
          return;
        }
        if (post) {
          const perform = async () => {
            switch (url.pathname) {
              case '/api/logout':
                sessions.delete(token!);
                res.setHeader(
                  'Set-Cookie',
                  'editor=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
                );
                return { ok: true };
              case '/api/draft':
                return store.draft(
                  store.validCollection(body.collection),
                  body.id,
                  body.revision,
                  body.document,
                );
              case '/api/publish':
                return store.publish(
                  store.validCollection(body.collection),
                  body.id,
                  body.revision,
                );
              case '/api/candidate':
                return store.saveCandidate(body.document);
              case '/api/collect':
                return collectForStone(store.root, body.stoneId);
              case '/api/approve':
                return store.approve(body.document);
              case '/api/remove-photo':
                return store.removePhoto(body.stoneId);
              default:
                throw new Error('操作が不正です');
            }
          };
          const job = mutation.then(perform);
          mutation = job.catch(() => {});
          json(200, await job);
          return;
        }
        json(404, { error: '見つかりません' });
      } catch (e) {
        json(e instanceof EditorConflict ? 409 : 400, {
          error: e instanceof Error ? e.message : '処理に失敗しました',
        });
      }
    },
  );
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));
  return server;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = await startEditor(
    process.env.EDITOR_ROOT || process.cwd(),
    process.env.EDITOR_PASSWORD || '',
    Number(process.env.EDITOR_PORT || 4322),
  );
  const address = server.address();
  console.log(
    `Private editor: http://127.0.0.1:${typeof address === 'object' && address ? address.port : 4322}/login (loopback only)`,
  );
}
