import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

export interface ParsedMarkdown<T = Record<string, unknown>> {
  data: T;
  body: string;
}

export function readMarkdown<T = Record<string, unknown>>(filePath: string): ParsedMarkdown<T> {
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${filePath}: expected YAML frontmatter between --- delimiters`);
  return { data: yaml.load(match[1]) as T, body: match[2].trim() };
}

export function filesUnder(directory: string, extensions: string[]): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(fullPath, extensions);
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [fullPath] : [];
  }).sort();
}

export function readYaml<T = unknown>(filePath: string): T {
  return yaml.load(fs.readFileSync(filePath, 'utf8')) as T;
}
