import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { loadWranglerConfig, validateDeploymentTarget } from './deploymentConfig.mjs';

function run(command, args, env = process.env) {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else files.push(path);
  }

  return files;
}

const config = await loadWranglerConfig();
validateDeploymentTarget(config, 'production');

const productionWorkerUrl = config.env.production.vars.PUBLIC_BASE_URL;
run('npm', ['run', 'build:production'], {
  ...process.env,
  VITE_PUBLISH_API_URL: productionWorkerUrl,
});

const bundleFiles = await listFiles('dist');
const text = (await Promise.all(bundleFiles.map(async (file) => {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return '';
  }
}))).join('\n');

if (!text.includes(productionWorkerUrl)) {
  throw new Error('Production Creator bundle does not contain the configured production Worker URL');
}

if (/abrelo-publish-staging|abrelo-creator-staging|localhost:8787|127\.0\.0\.1:8787/iu.test(text)) {
  throw new Error('Production Creator bundle contains a staging or development API reference');
}

console.log(`Production Creator bundle targets ${productionWorkerUrl}.`);
