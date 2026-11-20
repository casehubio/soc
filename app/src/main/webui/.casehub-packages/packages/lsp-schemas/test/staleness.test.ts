import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const schemasDir = resolve(__dirname, '../src/schemas');

const GENERATED_FILES = [
  'case-definition.generated.ts',
  'org.generated.ts',
  'htn.generated.ts',
  'swf.generated.ts',
];

describe('schema staleness', () => {
  for (const file of GENERATED_FILES) {
    it(`${file} exists`, () => {
      expect(existsSync(resolve(schemasDir, file))).toBe(true);
    });

    it(`${file} has AUTO-GENERATED header`, () => {
      const content = readFileSync(resolve(schemasDir, file), 'utf-8');
      expect(content).toContain('AUTO-GENERATED');
    });
  }

  it('generated files are not stale', () => {
    const before = new Map<string, string>();
    for (const file of GENERATED_FILES) {
      before.set(file, readFileSync(resolve(schemasDir, file), 'utf-8'));
    }
    execSync('node --import tsx scripts/generate-domain-schemas.ts', {
      cwd: resolve(__dirname, '..'),
      stdio: 'pipe',
    });
    for (const file of GENERATED_FILES) {
      const after = readFileSync(resolve(schemasDir, file), 'utf-8');
      expect(after, `${file} is stale — run 'yarn workspace @casehubio/mosaic-lsp-schemas run generate' to update`).toBe(before.get(file));
    }
  });
});
