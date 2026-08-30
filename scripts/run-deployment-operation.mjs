import { spawnSync } from 'node:child_process';

const [operation, environment, ...flags] = process.argv.slice(2);
const executableSuffix = process.platform === 'win32' ? '.cmd' : '';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(`${command}${executableSuffix}`, args, {
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

if (!['deploy', 'deploy-creator', 'migrate'].includes(operation) || !['staging', 'production'].includes(environment)) {
  fail('Usage: run-deployment-operation.mjs <deploy|deploy-creator|migrate> <staging|production> [--confirm-production]');
}

if (environment === 'production' && !flags.includes('--confirm-production')) {
  fail('Production operation blocked. Re-run with --confirm-production after staging validation.');
}

run('npm', ['run', `validate:deploy:${environment}`]);

if (operation === 'migrate') {
  run('npx', ['wrangler', 'd1', 'migrations', 'apply', 'DB', '--remote', '--env', environment]);
} else if (operation === 'deploy-creator') {
  if (environment !== 'production') {
    fail('The staging Creator remains managed by its existing Git-integrated Pages project.');
  }
  run('npm', ['run', 'build:creator:production']);
  run('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', 'abrelo-creator-production', '--branch', 'main']);
} else {
  run('npm', ['run', 'build:runtime']);
  run('npm', ['run', 'check:runtime-bundle']);
  run('npx', ['wrangler', 'deploy', '--env', environment]);
}
