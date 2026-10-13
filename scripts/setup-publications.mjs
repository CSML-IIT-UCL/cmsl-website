import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

if (fs.existsSync('.venv')) {
  console.log('.venv already exists; no changes made.');
  process.exit(0);
}
const result = spawnSync('python3', ['-m', 'venv', '.venv'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Created .venv. The collector uses the Python standard library; no API request was made.');
