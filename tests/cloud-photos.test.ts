import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { handle, validateMetadata, type Env } from '../cloud/photos/worker';
import { cloudPhotoOrigin } from '../src/lib/cloud-photos';
const mf = new Miniflare({
  modules: true,
  script: 'export default { fetch(){ return new Response("test"); } }',
  compatibilityDate: '2026-08-01',
  d1Databases: ['DB'],
  r2Buckets: ['IMAGES'],
});
let env: Env;
const meta = {
  kind: 'illustrative',
  photographer: 'Test author',
  license: 'CC BY-SA 4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Test.webp',
  originalUrl: 'https://upload.wikimedia.org/test.webp',
  credit: 'Test credit',
  alt: 'テスト用イメージ写真',
  permissionNote: '非公開の確認記録',
  identityConfirmed: true,
  rightsConfirmed: true,
};
const request = (
  path: string,
  body?: unknown,
  origin = 'https://admin.example.com',
) =>
  new Request(
    origin + path,
    body
      ? {
          method: 'POST',
          headers: {
            Origin: origin,
            'X-Almea-Action': 'photo',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      : undefined,
  );
const auth = async () => 'owner@example.com';
beforeAll(async () => {
  const DB = await mf.getD1Database('DB'),
    IMAGES = await mf.getR2Bucket('IMAGES');
  for (const sql of (
    await readFile('cloud/photos/migrations/0001_photos.sql', 'utf8')
  )
    .replace(/^--.*$/gm, '')
    .split(';')
    .filter((s) => s.trim()))
    await DB.prepare(sql).run();
  env = {
    DB,
    IMAGES,
    ADMIN_ORIGIN: 'https://admin.example.com',
    PUBLIC_ORIGIN: 'https://almeagem.github.io',
    ACCESS_TEAM: 'test.cloudflareaccess.com',
    ACCESS_AUD: 'test',
    ADMIN_EMAILS: 'owner@example.com',
    UPLOADS_ENABLED: 'true',
  } as unknown as Env;
});
afterAll(async () => {
  await mf.dispose();
});
test('fails closed without verified Access JWT; rejects CSRF and wrong host', async () => {
  expect((await handle(request('/api/stones'), env)).status).toBe(401);
  expect((await handle(request('/'), env)).status).toBe(401);
  expect(
    (
      await handle(
        request('/api/photos/s001/publish', meta, 'https://evil.example'),
        env,
        auth,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handle(
        new Request(env.ADMIN_ORIGIN + '/api/photos/s001/publish', {
          method: 'POST',
          body: '{}',
        }),
        env,
        auth,
      )
    ).status,
  ).toBe(403);
});
test('real D1/R2 upload, publish, credit privacy, conflict, pause, replacement and delete', async () => {
  const image = (
    await sharp({
      create: { width: 32, height: 24, channels: 3, background: '#e6c9c0' },
    })
      .webp()
      .toBuffer()
  ).toString('base64');
  const publish = await handle(
    request('/api/photos/s001/publish', {
      ...meta,
      image,
      expectedRevision: '',
    }),
    env,
    auth,
  );
  expect(publish.status).toBe(200);
  const result = await publish.json();
  const manifest = await handle(request('/public/photos'), env);
  const publicText = await manifest.text();
  expect(publicText).toContain('Test author');
  expect(publicText).toContain('creativecommons.org/licenses/by-sa/4.0');
  expect(publicText).not.toContain('非公開');
  expect(publicText).not.toContain('object_key');
  const media = await handle(request('/public/image/s001'), env);
  expect(media.status).toBe(200);
  expect(media.headers.get('Content-Type')).toBe('image/webp');
  expect((await media.arrayBuffer()).byteLength).toBeGreaterThan(20);
  expect(
    (
      await handle(
        request('/api/photos/s001/publish', {
          ...meta,
          image,
          expectedRevision: '',
        }),
        env,
        auth,
      )
    ).status,
  ).toBe(409);
  const paused = await handle(
    request('/api/photos/s001/pause', { expectedRevision: result.revision }),
    env,
    auth,
  );
  expect(paused.status).toBe(200);
  expect((await handle(request('/public/image/s001'), env)).status).toBe(404);
  const pausedText = await (
    await handle(request('/public/photos'), env)
  ).text();
  expect(pausedText).not.toContain('Test author');
  const p = await paused.json();
  const next = await handle(
    request('/api/photos/s001/publish', {
      ...meta,
      kind: 'real',
      image,
      expectedRevision: p.revision,
    }),
    env,
    auth,
  );
  expect(next.status).toBe(200);
  const n = await next.json();
  expect(
    (
      await handle(
        request('/api/photos/s001/delete', { expectedRevision: n.revision }),
        env,
        auth,
      )
    ).status,
  ).toBe(200);
  expect((await handle(request('/public/image/s001'), env)).status).toBe(404);
  const history = await env.DB.prepare('SELECT * FROM photo_history').all();
  expect(history.results).toHaveLength(4);
});
test('metadata refuses unsafe URLs, missing confirmations, NC and missing permission', () => {
  expect(() =>
    validateMetadata({ ...meta, sourceUrl: 'javascript:alert(1)' }),
  ).toThrow();
  expect(() => validateMetadata({ ...meta, rightsConfirmed: false })).toThrow();
  expect(() =>
    validateMetadata({ ...meta, license: 'AI-generated', kind: 'real' }),
  ).toThrow();
  expect(() =>
    validateMetadata({ ...meta, license: 'CC BY-NC 4.0' }),
  ).toThrow();
  expect(() =>
    validateMetadata({
      ...meta,
      license: 'Commercial permission',
      permissionNote: '',
    }),
  ).toThrow();
  expect(cloudPhotoOrigin('https://public.example.com')).toBe(
    'https://public.example.com',
  );
  expect(cloudPhotoOrigin('http://public.example.com')).toBeUndefined();
});

test('Access signed JWT accepts only the configured audience and administrator email', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: 'access-test',
    alg: 'RS256',
    use: 'sig',
  };
  const mocked = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ keys: [jwk] }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  const token = async (email: string, audience = 'test') =>
    new SignJWT({ email })
      .setProtectedHeader({ alg: 'RS256', kid: 'access-test' })
      .setSubject('admin')
      .setIssuedAt()
      .setIssuer('https://test.cloudflareaccess.com')
      .setAudience(audience)
      .setExpirationTime('5m')
      .sign(privateKey);
  try {
    const call = async (jwt: string) =>
      handle(
        new Request(env.ADMIN_ORIGIN + '/api/stones', {
          headers: { 'Cf-Access-Jwt-Assertion': jwt },
        }),
        env,
      );
    expect((await call(await token('owner@example.com'))).status).toBe(200);
    expect((await call(await token('outsider@example.com'))).status).toBe(401);
    expect(
      (await call(await token('owner@example.com', 'wrong-audience'))).status,
    ).toBe(401);
  } finally {
    mocked.mockRestore();
  }
});

test('existing static photos can be hidden without deleting original files', async () => {
  const paused = await handle(
    request('/api/photos/s002/pause', { expectedRevision: '' }),
    env,
    auth,
  );
  expect(paused.status).toBe(200);
  expect((await handle(request('/public/image/s002'), env)).status).toBe(404);
  const manifest = await (await handle(request('/public/photos'), env)).text();
  expect(manifest).toContain('s002');
  expect(manifest).not.toContain('既存静的写真の公開停止記録');
});
