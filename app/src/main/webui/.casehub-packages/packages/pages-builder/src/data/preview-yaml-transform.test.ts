import { describe, it, expect } from 'vitest';
import { transformYamlForPreview } from './preview-yaml-transform.js';
import { createDefaultRegistry } from './preview-data-registry.js';
import { PageDocument } from '@casehubio/pages-document';

describe('transformYamlForPreview', () => {
  it('replaces URL datasets with inline content for data-consuming components', () => {
    const yaml = `datasets:
  - uuid: sales
    url: /api/sales
    columns:
      - { id: region, type: TEXT }
      - { id: revenue, type: NUMBER }
pages:
  - name: p1
    components:
      - type: bar-chart
        properties:
          lookup: { uuid: sales }`;

    const doc = PageDocument.parse(yaml);
    const registry = createDefaultRegistry();
    const transformed = transformYamlForPreview(yaml, doc, registry);

    expect(transformed).toContain("content:");
    expect(transformed).not.toMatch(/url:\s*\/api\/sales/);
  });

  it('preserves datasets that already have content source', () => {
    const yaml = `datasets:
  - uuid: inline_ds
    content: '[{"a":1}]'
pages:
  - name: p1
    components:
      - type: bar-chart
        properties:
          lookup: { uuid: inline_ds }`;

    const doc = PageDocument.parse(yaml);
    const registry = createDefaultRegistry();
    const transformed = transformYamlForPreview(yaml, doc, registry);

    expect(transformed).toContain("content:");
  });

  it('does not transform datasets not referenced by data-consuming components', () => {
    const yaml = `datasets:
  - uuid: unused
    url: /api/unused
pages:
  - name: p1
    components:
      - type: title
        properties:
          text: Hello`;

    const doc = PageDocument.parse(yaml);
    const registry = createDefaultRegistry();
    const transformed = transformYamlForPreview(yaml, doc, registry);

    expect(transformed).toContain('url: /api/unused');
  });

  it('handles documents with no datasets', () => {
    const yaml = `pages:
  - name: p1
    components:
      - type: title
        properties:
          text: Hello`;

    const doc = PageDocument.parse(yaml);
    const registry = createDefaultRegistry();
    const transformed = transformYamlForPreview(yaml, doc, registry);

    expect(transformed).toBe(yaml);
  });

  it('handles nested components in containers', () => {
    const yaml = `datasets:
  - uuid: sales
    url: /api/sales
    columns:
      - { id: region, type: TEXT }
      - { id: revenue, type: NUMBER }
pages:
  - name: p1
    components:
      - type: tabs
        tabs:
          "Tab 1":
            components:
              - type: bar-chart
                properties:
                  lookup: { uuid: sales }`;

    const doc = PageDocument.parse(yaml);
    const registry = createDefaultRegistry();
    const transformed = transformYamlForPreview(yaml, doc, registry);

    expect(transformed).toContain("content:");
  });
});
