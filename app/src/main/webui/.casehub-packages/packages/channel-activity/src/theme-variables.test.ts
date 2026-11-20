/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = dirname(fileURLToPath(import.meta.url));

const INVALID_PAGES_VARS = /var\(--pages-(?:bg|text|white|border|font(?!-))[^)]*\)/g;

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry.endsWith('.test.ts') || entry === 'types.ts' || entry === 'events.ts') continue;
    if (statSync(full).isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (entry.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('theme variable usage', () => {
  const files = collectTsFiles(SRC_DIR);

  for (const file of files) {
    const relative = file.replace(SRC_DIR + '/', '');

    it(`${relative} uses only valid pages-ui-tokens variable names`, () => {
      const content = readFileSync(file, 'utf-8');
      const matches = content.match(INVALID_PAGES_VARS);
      if (matches) {
        const unique = [...new Set(matches)];
        throw new Error(
          `Found non-theme CSS variables (use --pages-neutral-*, --pages-accent-* etc.):\n` +
          unique.map(m => `  ${m}`).join('\n')
        );
      }
    });
  }
});
