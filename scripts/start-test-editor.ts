// Test-only writable copy: browser tests never modify published source content.
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startEditor } from './admin-server';
const root = await mkdtemp(join(tmpdir(), 'almea-editor-browser-'));
await cp('src/content', join(root, 'src/content'), { recursive: true });
const server = await startEditor(
  root,
  'browser-fixture-only-passphrase-32',
  4322,
);
console.log('Test editor ready at http://127.0.0.1:4322');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    server.close();
    await rm(root, { recursive: true, force: true });
    process.exit();
  });
