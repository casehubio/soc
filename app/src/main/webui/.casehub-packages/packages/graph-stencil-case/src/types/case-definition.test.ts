import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CaseHub } from './generated/case-definition.js';

const EXAMPLE_PATH = resolve(
  import.meta.dirname,
  '../test-fixtures/document-processing.yaml',
);

function loadExample(): CaseHub {
  return parseYaml(readFileSync(EXAMPLE_PATH, 'utf-8')) as CaseHub;
}

describe('CaseDefinition generated types', () => {
  it('parses document-processing.yaml root fields', () => {
    const def = loadExample();
    expect(def.dsl).toBe('1.0.0');
    expect(def.namespace).toBe('casehub-examples');
    expect(def.name).toBe('document-processing');
    expect(def.version).toBe('1.0.0');
    expect(def.spec).toBeDefined();
  });

  it('has typed spec.bindings with trigger', () => {
    const def = loadExample();
    const bindings = def.spec.bindings;
    expect(bindings).toBeDefined();
    expect(bindings!.length).toBeGreaterThan(0);

    const first = bindings![0]!;
    expect(first.name).toBe('validate-on-upload');
    expect(first.capability).toBe('validate-format');
    expect(first.on).toBeDefined();
    expect(first.on.contextChange).toBeDefined();
  });

  it('has typed spec.workers', () => {
    const def = loadExample();
    const workers = def.spec.workers;
    expect(workers).toBeDefined();
    expect(workers![0]!.name).toBe('ocr-worker');
    expect(workers![0]!.capabilities).toContain('ocr');
  });

  it('has typed spec.milestones', () => {
    const def = loadExample();
    const milestones = def.spec.milestones;
    expect(milestones).toBeDefined();
    expect(milestones![0]!.name).toBe('text-extracted');
    expect(milestones![0]!.condition).toContain('.ocrResult');
  });

  it('has typed spec.goals with kind', () => {
    const def = loadExample();
    const goals = def.spec.goals;
    expect(goals).toBeDefined();
    expect(goals![0]!.name).toBe('processingComplete');
    expect(goals![0]!.kind).toBe('success');
  });

  it('has typed spec.completion with goal expression', () => {
    const def = loadExample();
    const completion = def.spec.completion;
    expect(completion).toBeDefined();
    expect(completion!.success).toBeDefined();
  });
});
