import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const index = path.join(dist, 'index.html');
if (!fs.existsSync(index)) {
  console.error('dist/index.html is missing. Run `npm run build` first.');
  process.exit(1);
}

const forbidden = ['OPENALEX_API_KEY', 'BEGIN PRIVATE KEY', 'PUBLIC_OPENALEX'];
const files: string[] = [];
const walk = (directory: string) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Production output contains a symlink: ${fullPath}`);
    if (entry.isDirectory()) walk(fullPath);
    else files.push(fullPath);
  }
};
walk(dist);

for (const file of files) {
  if (fs.statSync(file).size > 5_000_000) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const marker of forbidden) {
    if (source.includes(marker)) throw new Error(`${file} contains forbidden marker '${marker}'`);
  }
}
console.log(`Production output valid: ${files.length} files, no symlinks or credential markers.`);
