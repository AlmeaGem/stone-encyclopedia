// Cross-platform CLI wrapper: no telemetry, no writes to a global home directory.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url),
  manifest = require.resolve('astro/package.json'),
  pkg = JSON.parse(readFileSync(manifest, 'utf8'));
const child = spawn(
  process.execPath,
  [join(dirname(manifest), pkg.bin.astro), ...process.argv.slice(2)],
  { stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
