import fs from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('media');
const destination = path.resolve('public/media');
await fs.mkdir(destination, { recursive: true });
await fs.cp(source, destination, { recursive: true, force: true, preserveTimestamps: true });
console.log('Prepared approved source media in public/media/.');
