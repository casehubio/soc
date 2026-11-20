import { describe, it, expect } from 'vitest';
import { PageDocument } from '@casehubio/pages-document';
import { serializeNode, parseFragment } from './yaml-fragment.js';

const ROWS_PAGE = `pages:
- name: Dashboard
  rows:
  - columns:
    - span: 6
      components:
      - type: bar-chart
        properties:
          subtype: column
    - span: 6
      components:
      - type: metric
        properties:
          title: Users
`;

describe('serializeNode', () => {
  it('serializes a component node to YAML', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const yaml = serializeNode(doc, ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0]);
    expect(yaml).toContain('type: bar-chart');
    expect(yaml).toContain('subtype: column');
    expect(yaml).not.toContain('metric');
  });

  it('serializes a column node', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const yaml = serializeNode(doc, ['pages', 0, 'rows', 0, 'columns', 0]);
    expect(yaml).toContain('span: 6');
    expect(yaml).toContain('bar-chart');
  });

  it('serializes a row node', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const yaml = serializeNode(doc, ['pages', 0, 'rows', 0]);
    expect(yaml).toContain('columns:');
    expect(yaml).toContain('bar-chart');
    expect(yaml).toContain('metric');
  });

  it('returns empty string for invalid path', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    expect(serializeNode(doc, ['pages', 99])).toBe('');
  });
});

describe('parseFragment', () => {
  it('detects component fragment', () => {
    const result = parseFragment('type: bar-chart\nproperties:\n  subtype: column');
    expect(result).toEqual({ type: 'component' });
  });

  it('detects column fragment', () => {
    const result = parseFragment('span: 6\ncomponents:\n- type: metric');
    expect(result).toEqual({ type: 'column' });
  });

  it('detects row fragment', () => {
    const result = parseFragment('columns:\n- span: 12\n  components: []');
    expect(result).toEqual({ type: 'row' });
  });

  it('detects page fragment', () => {
    const result = parseFragment('name: Dashboard\nrows:\n- columns: []');
    expect(result).toEqual({ type: 'page' });
  });

  it('returns null for non-YAML', () => {
    expect(parseFragment('not yaml {')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseFragment('')).toBeNull();
  });

  it('returns null for unrecognized YAML structure', () => {
    expect(parseFragment('foo: bar')).toBeNull();
  });

  it('round-trips: serialize then parse detects correct type', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const yaml = serializeNode(doc, ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0]);
    const result = parseFragment(yaml);
    expect(result).toEqual({ type: 'component' });
  });
});
