import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const originalArgs = process.argv.slice(2);
let args = [...originalArgs];

if (!args.includes('--all') && !args.includes('--person')) {
  if (!input.isTTY) {
    console.error('Choose an explicit scope: --person <person-id> (repeatable) or --all.');
    process.exit(2);
  }
  execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/export-authors.ts'], { stdio: 'inherit' });
  const registry = JSON.parse(fs.readFileSync('.cache/authors.json', 'utf8'));
  const linked = registry.authors.filter((author) => author.openalex_ids.length > 0);
  console.log('Publication-enabled people with verified OpenAlex IDs:');
  for (const author of linked) console.log(`- ${author.person_id}: ${author.name} [${author.openalex_ids.join(', ')}]`);
  const prompt = createInterface({ input, output });
  const answer = (await prompt.question('Enter a person ID, comma-separated IDs, or "all": ')).trim();
  prompt.close();
  args = answer === 'all'
    ? ['--all']
    : answer.split(',').map((value) => value.trim()).filter(Boolean).flatMap((value) => ['--person', value]);
  for (const flag of ['--dry-run', '--anonymous']) if (originalArgs.includes(flag)) args.push(flag);
}

execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/validate-content.ts'], { stdio: 'inherit' });
execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/export-authors.ts'], { stdio: 'inherit' });

const python = fs.existsSync(path.join('.venv', 'bin', 'python'))
  ? path.join('.venv', 'bin', 'python')
  : 'python3';
const result = spawnSync(python, ['scripts/openalex_collector.py', ...args], { stdio: 'inherit', env: process.env });
if (result.error) {
  console.error(`Unable to start the publication collector: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
