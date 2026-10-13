import { spawn } from 'node:child_process';

const mode = process.argv[2] ?? 'production';
if (!['production', 'staging'].includes(mode)) {
  console.error('Usage: node scripts/build.mjs production|staging');
  process.exit(2);
}

const base = mode === 'staging' ? '/cmsl-website/dev/' : '/cmsl-website/';
const env = {
  ...process.env,
  ASTRO_TELEMETRY_DISABLED: '1',
  SITE_ORIGIN: process.env.SITE_ORIGIN ?? 'https://danfoa.github.io',
  SITE_BASE_PATH: process.env.SITE_BASE_PATH ?? base,
  PUBLIC_SITE_ENV: mode,
  PUBLIC_COMMIT_SHA: process.env.PUBLIC_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'local',
  PUBLIC_BUILD_TIME: process.env.PUBLIC_BUILD_TIME ?? new Date().toISOString(),
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

await run(process.execPath, ['scripts/prepare-media.mjs']);
await run(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build']);
