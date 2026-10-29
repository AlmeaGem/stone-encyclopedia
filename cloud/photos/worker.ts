import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import stones from '../../src/content/stones.json' with { type: 'json' };
import { adminHtml } from './ui';
import localPhotos from '../../src/content/images.json' with { type: 'json' };

export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  ADMIN_ORIGIN: string;
  PUBLIC_ORIGIN: string;
  ACCESS_TEAM: string;
  ACCESS_AUD: string;
  ADMIN_EMAILS: string;
  UPLOADS_ENABLED: string;
}
const ids = new Set(stones.map((s) => s.id));
const licenses: Record<string, string> = {
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'Own photo': '',
  'Commercial permission': '',
  'AI-generated': '',
};
for (const kind of ['by', 'by-sa']) {
  for (const version of ['2.0', '2.5', '3.0', '4.0']) {
    licenses[`CC ${kind.toUpperCase()} ${version}`] =
      `https://creativecommons.org/licenses/${kind}/${version}/`;
  }
}
export type Metadata = {
  kind: 'real' | 'illustrative';
  photographer: string;
  sourceUrl: string;
  originalUrl: string;
  license: string;
  licenseUrl: string;
  credit: string;
  alt: string;
  permissionNote: string;
};
type Row = {
  stone_id: string;
  revision: string;
  state: string;
  object_key: string;
  metadata: string;
};
function url(value: unknown, required = false) {
  if (!value && !required) return '';
  if (String(value).length > 2048)
    throw Error('URLは2048文字以内で入力してください');
  const u = new URL(String(value));
  if (u.protocol !== 'https:' || u.username || u.password)
    throw Error('HTTPSの出典URLを入力してください');
  return u.href;
}
export function validateMetadata(value: Record<string, unknown>): Metadata {
  const text = (key: string, max: number, required = false) => {
    const v = String(value[key] ?? '').trim();
    if ((required && !v) || v.length > max)
      throw Error(`${key}を確認してください`);
    return v;
  };
  const license = text('license', 50, true);
  if (!(license in licenses))
    throw Error('対応する商用利用ライセンスを選択してください');
  if (value.kind !== 'real' && value.kind !== 'illustrative')
    throw Error('写真区分を選択してください');
  if (value.identityConfirmed !== true || value.rightsConfirmed !== true)
    throw Error('石の種類と権利の確認が必要です');
  const sourceUrl = url(value.sourceUrl, license.startsWith('CC'));
  if (license.startsWith('CC') && license !== 'CC0') {
    const source = new URL(sourceUrl);
    if (
      source.hostname !== 'commons.wikimedia.org' ||
      source.port ||
      !(
        source.pathname.includes('/File:') ||
        /^\d+$/.test(source.searchParams.get('curid') || '')
      )
    ) {
      throw Error(
        'CC BY / BY-SAはWikimedia Commonsのファイル出典ページを指定してください',
      );
    }
  }
  if (license === 'AI-generated' && value.kind !== 'illustrative')
    throw Error('AI生成画像はイメージ写真として登録してください');
  const permissionNote = text('permissionNote', 3000);
  if (
    ['Commercial permission', 'AI-generated'].includes(license) &&
    permissionNote.length < 10
  )
    throw Error('商用利用許諾の記録を10文字以上で残してください');
  return {
    kind: value.kind,
    photographer: text('photographer', 200, true),
    sourceUrl,
    originalUrl: url(value.originalUrl),
    license,
    licenseUrl: licenses[license],
    credit: text('credit', 1000),
    alt: text('alt', 300, true),
    permissionNote,
  };
}
function publicMeta(row: Row) {
  const { permissionNote: _private, ...meta } = JSON.parse(
    row.metadata,
  ) as Metadata;
  return {
    stoneId: row.stone_id,
    revision: row.revision,
    state: row.state,
    ...meta,
  };
}
const keys = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function authorize(request: Request, env: Env) {
  if (
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM) ||
    !env.ACCESS_AUD ||
    env.ACCESS_AUD === 'REPLACE'
  )
    throw Error('Access未設定');
  const issuer = `https://${env.ACCESS_TEAM}`;
  let jwks = keys.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keys.set(issuer, jwks);
  }
  const { payload } = await jwtVerify(
    request.headers.get('Cf-Access-Jwt-Assertion') || '',
    jwks,
    {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'email', 'sub'],
    },
  );
  const email = String(payload.email).toLowerCase();
  if (
    !env.ADMIN_EMAILS.split(',')
      .map((s) => s.trim().toLowerCase())
      .includes(email)
  )
    throw Error('管理者権限がありません');
  return email;
}
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export async function handle(
  request: Request,
  env: Env,
  authenticate = authorize,
): Promise<Response> {
  const u = new URL(request.url);
  // Public, read-only endpoints. No drafts, permission notes, history, or object keys.
  if (u.pathname === '/public/photos' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM photos').all<Row>();
    const out = response({
      photos: rows.results.map((row) =>
        row.state === 'published'
          ? publicMeta(row)
          : { stoneId: row.stone_id, state: row.state },
      ),
    });
    out.headers.set('Access-Control-Allow-Origin', env.PUBLIC_ORIGIN);
    return out;
  }
  const media = u.pathname.match(/^\/public\/image\/(s\d{3})$/);
  if (media && request.method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT * FROM photos WHERE stone_id = ? AND state = ?',
    )
      .bind(media[1], 'published')
      .first<Row>();
    if (!row) return response({ error: '写真は公開されていません' }, 404);
    const object = await env.IMAGES.get(row.object_key);
    if (!object) return response({ error: '写真を取得できません' }, 404);
    return new Response(object.body as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': env.PUBLIC_ORIGIN,
      },
    });
  }
  if (u.origin !== env.ADMIN_ORIGIN)
    return response({ error: '管理画面のホストを確認してください' }, 403);
  let actor: string;
  try {
    actor = await authenticate(request, env);
  } catch {
    return response({ error: '管理者ログインが必要です' }, 401);
  }
  if (request.method === 'GET' && u.pathname === '/') {
    return new Response(adminHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'Content-Security-Policy':
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }
  if (request.method === 'GET' && u.pathname === '/api/stones') {
    const rows = await env.DB.prepare('SELECT * FROM photos').all<Row>();
    return response({
      stones: stones.map((s) => ({ id: s.id, name: s.name })),
      localPhotos: localPhotos
        .filter((p) => p.status === 'approved')
        .map((p) => p.stoneId),
      photos: rows.results.map((r) => ({
        ...publicMeta(r),
        permissionNote: (JSON.parse(r.metadata) as Metadata).permissionNote,
      })),
      licenses,
    });
  }
  if (
    request.method !== 'POST' ||
    request.headers.get('Origin') !== env.ADMIN_ORIGIN ||
    request.headers.get('X-Almea-Action') !== 'photo'
  )
    return response({ error: '同一画面から操作してください' }, 403);
  if (env.UPLOADS_ENABLED !== 'true')
    return response({ error: '公開操作は現在停止中です' }, 503);
  if (Number(request.headers.get('Content-Length') || 0) > 3_000_000)
    return response({ error: '画像が大きすぎます' }, 413);
  const match = u.pathname.match(
    /^\/api\/photos\/(s\d{3})\/(publish|pause|delete)$/,
  );
  if (!match || !ids.has(match[1]))
    return response({ error: '対象の石を確認してください' }, 404);
  const [, id, action] = match;
  let objectKey = '';
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 3_000_000) {
          await reader.cancel();
          return response({ error: '画像が大きすぎます' }, 413);
        }
        chunks.push(value);
      }
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const bytes = buffer.buffer;
    if (bytes.byteLength > 3_000_000)
      return response({ error: '画像が大きすぎます' }, 413);
    const body = JSON.parse(new TextDecoder().decode(bytes)) as Record<
      string,
      unknown
    >;
    const before = await env.DB.prepare(
      'SELECT * FROM photos WHERE stone_id = ?',
    )
      .bind(id)
      .first<Row>();
    if (String(body.expectedRevision || '') !== (before?.revision || ''))
      return response(
        { error: '別の端末で更新されています。再読込してください' },
        409,
      );
    const revision = crypto.randomUUID();
    const now = new Date().toISOString();
    let metadata: Metadata;
    if (action === 'publish') {
      metadata = validateMetadata(body);
      const encoded = String(body.image || '');
      if (encoded.length > 2_800_000 || !/^[A-Za-z0-9+/]+=*$/.test(encoded))
        throw Error('画像を選択してください');
      const image = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      if (
        image.length > 2_000_000 ||
        image.length < 20 ||
        new TextDecoder().decode(image.slice(0, 4)) !== 'RIFF' ||
        new TextDecoder().decode(image.slice(8, 12)) !== 'WEBP'
      )
        throw Error('最適化されたWebP画像を確認してください');
      objectKey = `${id}/${revision}.webp`;
      await env.IMAGES.put(objectKey, image, {
        httpMetadata: { contentType: 'image/webp' },
      });
    } else {
      if (before) {
        objectKey = before.object_key;
        metadata = JSON.parse(before.metadata) as Metadata;
      } else {
        const local = localPhotos.find(
          (p) => p.stoneId === id && p.status === 'approved',
        );
        if (!local) throw Error('登録写真がありません');
        // Only a display tombstone: never delete or rewrite the existing Git image.
        metadata = {
          kind: local.imageKind === 'ai-generated' ? 'illustrative' : 'real',
          photographer: local.photographer,
          sourceUrl: local.pageUrl,
          originalUrl: local.imageUrl,
          license: local.license,
          licenseUrl: local.licenseUrl,
          credit: local.creditText || '',
          alt: local.alt || '天然石の写真',
          permissionNote:
            '既存静的写真の公開停止記録。元のファイルと権利記録を保持。',
        };
        objectKey = '';
      }
    }
    const state =
      action === 'publish'
        ? 'published'
        : action === 'pause'
          ? 'paused'
          : 'deleted';
    // Revision condition plus history SELECT execute atomically. Concurrent updates cannot overwrite each other.
    const result = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO photos (stone_id,revision,state,object_key,metadata,updated_at) VALUES (?,?,?,?,?,?)
       ON CONFLICT(stone_id) DO UPDATE SET revision=excluded.revision,state=excluded.state,object_key=excluded.object_key,metadata=excluded.metadata,updated_at=excluded.updated_at WHERE photos.revision=?`,
      ).bind(
        id,
        revision,
        state,
        objectKey,
        JSON.stringify(metadata),
        now,
        before?.revision || '',
      ),
      env.DB.prepare(
        'INSERT INTO photo_history (revision,stone_id,action,actor,metadata,created_at) SELECT revision,stone_id,?, ?,metadata,? FROM photos WHERE stone_id=? AND revision=?',
      ).bind(action, actor, now, id, revision),
    ]);
    if (!result[0].meta.changes) {
      if (action === 'publish') await env.IMAGES.delete(objectKey);
      return response(
        { error: '同時更新を検出しました。再読込してください' },
        409,
      );
    }
    return response({ ok: true, revision, state });
  } catch (e) {
    // An uploaded orphan is private. Retain it after ambiguous DB failures rather than deleting a possibly published object.
    return response(
      {
        error:
          e instanceof Error
            ? e.message
            : '保存に失敗しました。入力を保持して再確認してください',
      },
      400,
    );
  }
}
export default { fetch: (request: Request, env: Env) => handle(request, env) };
