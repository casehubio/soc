import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { handleCompletion } from './completion.js';
import { createSchemaRegistry } from './schema-registry.js';
import type { FormatRegistration } from './types.js';

const pageSchema = z.object({
  pages: z.array(
    z.object({
      name: z.string(),
      components: z.array(
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('bar-chart'), width: z.number().optional() }),
          z.object({ type: z.literal('data-table'), columns: z.array(z.string()).optional() }),
        ]),
      ),
    }),
  ),
  datasets: z.array(z.object({ uuid: z.string() })).optional(),
});

const pageFormat: FormatRegistration = {
  formatId: 'page',
  extensions: ['.page.yaml'],
  documentSchema: pageSchema,
};

function setup() {
  const registry = createSchemaRegistry();
  registry.register(pageFormat);
  return registry;
}

describe('handleCompletion', () => {
  it('returns top-level property completions at root', () => {
    const registry = setup();
    const doc = '';
    const items = handleCompletion(
      'file:///app/test.page.yaml', doc, { line: 0, character: 0 }, registry,
    );
    const labels = items.map(i => i.label);
    expect(labels).toContain('pages');
    expect(labels).toContain('datasets');
  });

  it('returns component type enum values after type:', () => {
    const registry = setup();
    const doc = 'pages:\n  - name: Home\n    components:\n      - type: ';
    const lines = doc.split('\n');
    const lastLine = lines[lines.length - 1]!;
    const items = handleCompletion(
      'file:///app/test.page.yaml', doc,
      { line: lines.length - 1, character: lastLine.length },
      registry,
    );
    const labels = items.map(i => i.label);
    expect(labels).toContain('bar-chart');
    expect(labels).toContain('data-table');
  });

  it('returns narrowed properties for selected type', () => {
    const registry = setup();
    const doc = 'pages:\n  - name: Home\n    components:\n      - type: bar-chart\n        ';
    const lines = doc.split('\n');
    const lastLine = lines[lines.length - 1]!;
    const items = handleCompletion(
      'file:///app/test.page.yaml', doc,
      { line: lines.length - 1, character: lastLine.length },
      registry,
    );
    const labels = items.map(i => i.label);
    expect(labels).toContain('- width');
    expect(labels).not.toContain('- columns');
    expect(labels).not.toContain('columns');
  });

  it('includes textEdit at root level (col 0)', () => {
    const registry = setup();
    const doc = '';
    const items = handleCompletion(
      'file:///app/test.page.yaml', doc, { line: 0, character: 0 }, registry,
    );
    const pagesItem = items.find(i => i.label === 'pages');
    expect(pagesItem?.textEdit).toEqual({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      newText: 'pages: ',
    });
  });

  it('includes textEdit at indented position', () => {
    const registry = setup();
    const doc = 'pages:\n  - name: Home\n    components:\n      - type: bar-chart\n        ';
    const lines = doc.split('\n');
    const lastLine = lines[lines.length - 1]!;
    const items = handleCompletion(
      'file:///app/test.page.yaml', doc,
      { line: lines.length - 1, character: lastLine.length },
      registry,
    );
    const widthItem = items.find(i => i.label === '- width');
    expect(widthItem?.textEdit).toBeDefined();
    expect(widthItem!.textEdit!.range.start.line).toBe(lines.length - 1);
    expect(widthItem!.textEdit!.range.start.character).toBe(lastLine.length);
    expect(widthItem!.textEdit!.range.end.character).toBe(lastLine.length);
  });

  it('textEdit replaces partial text when user has typed a prefix', () => {
    const registry = setup();
    const doc = 'pages:\n  - name: Home\n    components:\n      - type: bar-chart\n        wi';
    const lines = doc.split('\n');
    const lastLine = lines[lines.length - 1]!;
    const items = handleCompletion(
      'file:///app/test.page.yaml', doc,
      { line: lines.length - 1, character: lastLine.length },
      registry,
    );
    const widthItem = items.find(i => i.label === '- width');
    expect(widthItem?.textEdit).toBeDefined();
    expect(widthItem!.textEdit!.range.start.character).toBe(lastLine.length - 2);
    expect(widthItem!.textEdit!.range.end.character).toBe(lastLine.length);
  });

  it('textEdit for value completion replaces partial value', () => {
    const registry = setup();
    const doc = 'pages:\n  - name: Home\n    components:\n      - type: bar';
    const lines = doc.split('\n');
    const lastLine = lines[lines.length - 1]!;
    const items = handleCompletion(
      'file:///app/test.page.yaml', doc,
      { line: lines.length - 1, character: lastLine.length },
      registry,
    );
    const barItem = items.find(i => i.label === 'bar-chart');
    expect(barItem?.textEdit).toBeDefined();
    expect(barItem!.textEdit!.range.start.character).toBe(lastLine.indexOf('bar'));
    expect(barItem!.textEdit!.newText).toBe('bar-chart');
  });
});
