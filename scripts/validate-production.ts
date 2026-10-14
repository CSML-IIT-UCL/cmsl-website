import fs from 'node:fs';
import path from 'node:path';
import { filesUnder, readMarkdown } from './content-utils.ts';

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
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const requiredTags: [string, RegExp][] = [
  ['<title>', /<title>[^<]+<\/title>/],
  ['meta description', /<meta name="description" content="[^"]*"/],
  ['canonical link', /<link rel="canonical" href="https?:\/\/[^"]+"/],
  ['og:title', /<meta property="og:title" content="[^"]*"/],
  ['og:description', /<meta property="og:description" content="[^"]*"/],
  ['og:image', /<meta property="og:image" content="https?:\/\/[^"]+"/],
];
for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of requiredTags) {
    if (!pattern.test(source)) throw new Error(`${file} is missing required SEO metadata: ${label}`);
  }
}

const personProfilePages = htmlFiles.filter((file) => /\/people\/[^/]+\/index\.html$/.test(file));
for (const file of personProfilePages) {
  const source = fs.readFileSync(file, 'utf8');
  if (!/<script type="application\/ld\+json">[^<]*"@type":"Person"/.test(source)) {
    throw new Error(`${file} is missing Person structured data (application/ld+json)`);
  }
}
console.log(`SEO metadata present on ${htmlFiles.length} pages (${personProfilePages.length} with Person structured data).`);

const people = filesUnder(path.resolve('content/people'), ['.md']).map((file) => readMarkdown<{ email?: string | null }>(file).data);
const emails = people.map((person) => person.email).filter((email): email is string => Boolean(email));
for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const email of emails) {
    if (source.includes(email)) throw new Error(`${file} exposes a raw, scrapable email address (${email}); obfuscation regressed`);
  }
}
console.log(`Checked ${htmlFiles.length} pages for ${emails.length} known email addresses: none appear as scrapable plain text.`);

const robotsPath = path.join(dist, 'robots.txt');
if (!fs.existsSync(robotsPath)) throw new Error('dist/robots.txt is missing.');
const robots = fs.readFileSync(robotsPath, 'utf8');
if (!/^Sitemap: https?:\/\/\S+sitemap-index\.xml$/m.test(robots)) throw new Error('dist/robots.txt does not reference a sitemap.');
if (!/^Disallow: \/dev\/$/m.test(robots)) throw new Error('dist/robots.txt does not disallow /dev/.');
if (!fs.existsSync(path.join(dist, 'sitemap-index.xml'))) throw new Error('dist/sitemap-index.xml is missing.');
console.log('robots.txt and sitemap-index.xml are present and reference each other correctly.');

console.log(`Production output valid: ${files.length} files, no symlinks or credential markers.`);
