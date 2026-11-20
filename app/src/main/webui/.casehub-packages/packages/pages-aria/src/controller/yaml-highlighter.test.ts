import { describe, it, expect } from 'vitest';
import { tokenizeYamlLine, buildStepLineMap } from './yaml-highlighter.js';

describe('tokenizeYamlLine', () => {
  it('tokenizes a key-value pair', () => {
    const tokens = tokenizeYamlLine('scenario: help-desk-demo');
    expect(tokens).toEqual([
      { text: 'scenario', type: 'key' },
      { text: ': ', type: 'punct' },
      { text: 'help-desk-demo', type: 'plain' },
    ]);
  });

  it('tokenizes a quoted string value', () => {
    const tokens = tokenizeYamlLine('  label: "Customer submits ticket"');
    expect(tokens).toEqual([
      { text: '  ', type: 'plain' },
      { text: 'label', type: 'key' },
      { text: ': ', type: 'punct' },
      { text: '"Customer submits ticket"', type: 'string' },
    ]);
  });

  it('tokenizes a comment', () => {
    const tokens = tokenizeYamlLine('# This is a comment');
    expect(tokens).toEqual([
      { text: '# This is a comment', type: 'comment' },
    ]);
  });

  it('tokenizes a list item', () => {
    const tokens = tokenizeYamlLine('  - action: click');
    expect(tokens).toEqual([
      { text: '  ', type: 'plain' },
      { text: '- ', type: 'punct' },
      { text: 'action', type: 'key' },
      { text: ': ', type: 'punct' },
      { text: 'click', type: 'plain' },
    ]);
  });

  it('tokenizes boolean and number literals', () => {
    const tokens = tokenizeYamlLine('  paused: true');
    expect(tokens).toEqual([
      { text: '  ', type: 'plain' },
      { text: 'paused', type: 'key' },
      { text: ': ', type: 'punct' },
      { text: 'true', type: 'literal' },
    ]);
  });

  it('tokenizes inline comment after value', () => {
    const tokens = tokenizeYamlLine('  speed: 0.5 # half speed');
    expect(tokens).toEqual([
      { text: '  ', type: 'plain' },
      { text: 'speed', type: 'key' },
      { text: ': ', type: 'punct' },
      { text: '0.5 ', type: 'literal' },
      { text: '# half speed', type: 'comment' },
    ]);
  });

  it('handles empty line', () => {
    expect(tokenizeYamlLine('')).toEqual([]);
  });

  it('tokenizes a key-only line (no value)', () => {
    const tokens = tokenizeYamlLine('sections:');
    expect(tokens).toEqual([
      { text: 'sections', type: 'key' },
      { text: ':', type: 'punct' },
    ]);
  });

  it('tokenizes a list item with quoted string', () => {
    const tokens = tokenizeYamlLine('      - label: "Load demo classifications"');
    expect(tokens).toEqual([
      { text: '      ', type: 'plain' },
      { text: '- ', type: 'punct' },
      { text: 'label', type: 'key' },
      { text: ': ', type: 'punct' },
      { text: '"Load demo classifications"', type: 'string' },
    ]);
  });
});

describe('buildStepLineMap', () => {
  const SAMPLE_YAML = `scenario: help-desk-demo
description: "Full helpdesk demo"
speed: 0.5

sections:
  - label: "Customer submits ticket"
    steps:
      - label: "Load demo classifications"
        name: load-demo-data
        target: browser
        commands:
          - action: click
            target: {role: button, name: Load demo classification data}

      - label: "Fill in customer name"
        name: fill-name
        target: browser
        commands:
          - action: fill
            target: {role: textbox, name: Your name}
            value: "Alice"

  - label: "Backend processes ticket"
    steps:
      - label: "System creates and classifies ticket"
        name: verify-ticket
        target: helpdesk
        commands:
          - action: verify-ticket-exists
`;

  it('maps step labels to line ranges', () => {
    const map = buildStepLineMap(SAMPLE_YAML);
    expect(map.has('Load demo classifications')).toBe(true);
    const range = map.get('Load demo classifications')!;
    expect(range.startLine).toBeGreaterThan(0);
    expect(range.endLine).toBeGreaterThan(range.startLine);
  });

  it('maps step names to line ranges', () => {
    const map = buildStepLineMap(SAMPLE_YAML);
    expect(map.has('load-demo-data')).toBe(true);
  });

  it('maps all steps', () => {
    const map = buildStepLineMap(SAMPLE_YAML);
    expect(map.has('Load demo classifications')).toBe(true);
    expect(map.has('Fill in customer name')).toBe(true);
    expect(map.has('System creates and classifies ticket')).toBe(true);
  });

  it('step label and name map to same line range', () => {
    const map = buildStepLineMap(SAMPLE_YAML);
    const byLabel = map.get('Load demo classifications')!;
    const byName = map.get('load-demo-data')!;
    expect(byLabel).toEqual(byName);
  });

  it('returns empty map for non-scenario YAML', () => {
    const map = buildStepLineMap('key: value');
    expect(map.size).toBe(0);
  });

  it('returns empty map for invalid YAML', () => {
    const map = buildStepLineMap(':::invalid');
    expect(map.size).toBe(0);
  });
});
