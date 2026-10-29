import { lstat, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const targets = [
  '.turbo',
  '.playwright-cli',
  '.tmp',
  '.impeccable/review',
  'output/playwright',
  'apps/web/.next/cache',
  'apps/web/.next/dev',
  'node_modules/.vite',
  'node_modules/.vite-temp',
];

// Only known generated paths are removed. Keep production build output,
// dependencies, environment files and browser drafts intact.
const workspaceDirs = ['apps/web'];
for (const entry of await readdir(join(root, 'packages'), { withFileTypes: true })) {
  if (entry.isDirectory()) workspaceDirs.push(`packages/${entry.name}`);
}
for (const dir of workspaceDirs) {
  targets.push(`${dir}/.turbo`, `${dir}/tsconfig.tsbuildinfo`);
}

for (const target of targets) {
  const path = join(root, target);
  const exists = await lstat(path).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!exists) continue;
  await rm(path, { recursive: true, force: true });
  console.log(`Removed ${target}`);
}
