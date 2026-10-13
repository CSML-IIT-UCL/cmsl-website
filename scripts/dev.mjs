import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';

const staging = process.argv.includes('--staging');
const port = Number(process.env.PORT ?? 4321);
const astroCli = path.resolve('node_modules/astro/bin/astro.mjs');
if (!fs.existsSync(astroCli)) {
  console.error('Dependencies are missing. Run `npm ci`, then start the server again.');
  process.exit(1);
}

await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', (error) => reject(error));
  server.once('listening', () => server.close(resolve));
  server.listen(port, '127.0.0.1');
}).catch((error) => {
  console.error(`Cannot start CSML preview on 127.0.0.1:${port}: ${error.message}`);
  console.error('Stop the existing server or set an explicit unused PORT. No process was terminated.');
  process.exit(1);
});

await fsp.cp(path.resolve('media'), path.resolve('public/media'), { recursive: true, force: true, preserveTimestamps: true });

const watcher = fs.watch(path.resolve('media'), { recursive: true }, async (_event, filename) => {
  if (!filename) return;
  const source = path.resolve('media', filename);
  const target = path.resolve('public/media', filename);
  try {
    const stat = await fsp.stat(source);
    if (stat.isDirectory()) return;
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.copyFile(source, target);
  } catch (error) {
    if (error.code === 'ENOENT') await fsp.rm(target, { force: true });
    else console.error(`Media sync failed for ${filename}: ${error.message}`);
  }
});

const env = {
  ...process.env,
  ASTRO_TELEMETRY_DISABLED: '1',
  SITE_ORIGIN: 'http://127.0.0.1:4321',
  SITE_BASE_PATH: staging ? '/dev/' : '/',
  PUBLIC_SITE_ENV: 'local',
};
console.log(`CSML live preview: http://127.0.0.1:${port}${staging ? '/dev/' : '/'} (Ctrl+C to stop)`);
const child = spawn(process.execPath, [astroCli, 'dev', '--host', '127.0.0.1', '--port', String(port)], { env, stdio: 'inherit' });
const close = () => { watcher.close(); if (!child.killed) child.kill('SIGTERM'); };
process.once('SIGINT', close);
process.once('SIGTERM', close);
child.on('exit', (code) => { watcher.close(); process.exit(code ?? 0); });
