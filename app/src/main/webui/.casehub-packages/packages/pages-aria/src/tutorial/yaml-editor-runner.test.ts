import { describe, it, expect } from 'vitest';
import { validateYamlStep } from './yaml-editor-runner.js';

describe('validateYamlStep', () => {
  it('passes valid YAML with expected keys', () => {
    const yaml = 'variables:\n  theme:\n    color: blue';
    const result = validateYamlStep(yaml, { expectedKeys: ['variables'] });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails on missing expected key', () => {
    const yaml = 'pages:\n  - name: test';
    const result = validateYamlStep(yaml, { expectedKeys: ['variables'] });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('fails on YAML syntax error', () => {
    const yaml = 'invalid: [unclosed';
    const result = validateYamlStep(yaml, {});
    expect(result.valid).toBe(false);
  });

  it('validates expectedStructure against expanded map', () => {
    const yaml = [
      'variables:',
      '  app:',
      '    title: Dashboard',
      'pages:',
      '  - name: ${app.title}',
      '    components:',
      '      - type: title',
    ].join('\n');
    const result = validateYamlStep(yaml, {
      expectedStructure: {
        pages: [{ components: [{ type: 'title' }] }],
      },
    });
    expect(result.valid).toBe(true);
  });

  it('fails when expectedStructure does not match', () => {
    const yaml = 'pages:\n  - name: test\n    components:\n      - type: title';
    const result = validateYamlStep(yaml, {
      expectedStructure: {
        pages: [{ components: [{ type: 'bar-chart' }] }],
      },
    });
    expect(result.valid).toBe(false);
  });

  it('passes YAML without yaml-core constructs', () => {
    const yaml = 'pages:\n  - name: test';
    const result = validateYamlStep(yaml, {});
    expect(result.valid).toBe(true);
  });

  it('multiset matching requires distinct elements', () => {
    const yaml = [
      'pages:',
      '  - components:',
      '      - type: metric',
      '      - type: metric',
      '      - type: metric',
    ].join('\n');
    const result = validateYamlStep(yaml, {
      expectedStructure: {
        pages: [{ components: [{ type: 'metric' }, { type: 'metric' }, { type: 'metric' }] }],
      },
    });
    expect(result.valid).toBe(true);
  });
});
