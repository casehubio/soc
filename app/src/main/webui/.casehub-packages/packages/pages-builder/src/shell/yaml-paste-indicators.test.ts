import { describe, it, expect } from 'vitest';
import { PageDocument } from '@casehubio/pages-document';
import { computeValidPasteLines } from './yaml-paste-indicators.js';

const ROWS_PAGE = `pages:
- name: Dashboard
  rows:
  - columns:
    - span: 6
      components:
      - type: metric
    - span: 6
      components:
      - type: bar-chart
`;

describe('computeValidPasteLines', () => {
  it('returns line numbers where a component can be pasted', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const lines = computeValidPasteLines(doc, 'component');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('includes lines near existing components for sibling insert', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const yaml = doc.toString();
    const lines = computeValidPasteLines(doc, 'component');
    const metricLineNum = yaml.split('\n').findIndex(l => l.includes('type: metric')) + 1;
    expect(lines.some(l => Math.abs(l.line - metricLineNum) <= 1)).toBe(true);
  });

  it('each result has a line number and position', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const lines = computeValidPasteLines(doc, 'component');
    for (const entry of lines) {
      expect(entry.line).toBeGreaterThan(0);
      expect(['before', 'after', 'child']).toContain(entry.position);
    }
  });

  it('returns empty for unrecognized fragment type', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const lines = computeValidPasteLines(doc, 'unknown');
    expect(lines).toHaveLength(0);
  });

  it('returns child positions for columns when fragment is component', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const lines = computeValidPasteLines(doc, 'component');
    const childEntries = lines.filter(l => l.position === 'child');
    expect(childEntries.length).toBeGreaterThan(0);
  });
});
