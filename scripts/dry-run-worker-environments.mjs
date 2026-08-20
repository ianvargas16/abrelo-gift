import { spawnSync } from 'node:child_process';

const executableSuffix = process.platform === 'win32' ? '.cmd' : '';

for (const environment of ['development', 'staging', 'production']) {
  const wranglerEnvironment = environment === 'development' ? '' : environment;
  const result = spawnSync(`npx${executableSuffix}`, [
    'wrangler',
    'deploy',
    '--dry-run',
    `--env=${wranglerEnvironment}`,
    '--outdir',
    `dist-worker/${environment}`,
  ], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
