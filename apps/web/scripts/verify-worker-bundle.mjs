// Fails the build when a Web Worker was emitted as a raw source asset instead
// of a bundled chunk. Turbopack (Next 16.3) does that for
// `new Worker(new URL('./x.worker.ts', import.meta.url))`, which silently pushes
// all analysis and mining work onto the main thread; the app is therefore
// built with webpack. Run after `next build`.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '.next', 'static');
const list = (dir) => (existsSync(dir) ? readdirSync(dir) : []);

const rawWorkers = list(join(root, 'media')).filter((file) =>
  /\.worker\.[\w-]+\.(ts|tsx)$/.test(file),
);
const workerChunks = list(join(root, 'chunks')).filter((file) =>
  /^flowculus-(analysis|mining)\.[\w-]+\.js$/.test(file),
);

if (rawWorkers.length > 0 || workerChunks.length < 2) {
  console.error(
    `Worker bundling check failed. Raw worker sources: ${rawWorkers.join(', ') || 'none'}; ` +
      `bundled worker chunks: ${workerChunks.join(', ') || 'none'}.`,
  );
  process.exit(1);
}
console.log(`Worker bundling OK: ${workerChunks.join(', ')}`);
