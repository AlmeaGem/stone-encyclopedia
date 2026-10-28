// Test-only writable copy: browser tests never modify published source content.
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { EditorStore } from './admin-store';
import { commonsCandidates } from './image-policy';
import { startEditor } from './admin-server';
const root = await mkdtemp(join(tmpdir(), 'almea-editor-browser-'));
await cp('src/content', join(root, 'src/content'), { recursive: true });
const store = new EditorStore(root);
const fixtureBytes = await sharp({
  create: { width: 400, height: 260, channels: 3, background: '#d4b6bc' },
})
  .jpeg()
  .toBuffer();
const fixtureMetadata = {
  query: {
    pages: {
      1: {
        pageid: 1,
        imageinfo: [
          {
            mime: 'image/jpeg',
            url: 'https://upload.wikimedia.org/fixture.jpg',
            descriptionurl:
              'https://commons.wikimedia.org/wiki/File:Fixture.jpg',
            extmetadata: {
              Artist: { value: 'TEST FIXTURE — NOT A REAL PHOTO' },
              LicenseShortName: { value: 'CC BY 4.0' },
            },
          },
        ],
      },
    },
  },
};
for (const stone of (await store.read('stones')).slice(0, 10)) {
  for (const c of commonsCandidates(fixtureMetadata, stone))
    await store.saveCandidate(
      ['s007', 's008'].includes(stone.id)
        ? { ...c, imageUrl: 'https://upload.wikimedia.org/broken.jpg' }
        : c,
    );
}
const server = await startEditor(
  root,
  'browser-fixture-only-passphrase-32',
  4322,
  async (url) =>
    String(url).includes('/broken.jpg')
      ? new Response(null, { status: 403 })
      : String(url).includes('commons.wikimedia.org/w/api.php')
        ? Response.json(fixtureMetadata)
        : new Response(fixtureBytes, {
            headers: { 'Content-Type': 'image/jpeg' },
          }),
);
console.log('Test editor ready at http://127.0.0.1:4322');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    server.close();
    await rm(root, { recursive: true, force: true });
    process.exit();
  });
