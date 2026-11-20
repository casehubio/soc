import '@casehubio/pages-property-palette';
import '@casehubio/pages-code-editor';
import '../src/index.js';
import { PagesBuilderShell } from '../src/shell/builder-shell.js';

const SAMPLE_YAML = `pages:
- name: Sales Dashboard
  rows:
  - columns:
    - span: 4
      components:
      - type: metric
        properties:
          title: Total Revenue
          lookup:
            uuid: sales_tx
    - span: 4
      components:
      - type: metric
        properties:
          title: Active Users
          lookup:
            uuid: analytics
    - span: 4
      components:
      - type: metric
        properties:
          title: Conversion Rate
  - columns:
    - span: 8
      components:
      - type: bar-chart
        properties:
          subtype: column
          title: Revenue by Region
          lookup:
            uuid: sales_tx
    - span: 4
      components:
      - type: pie-chart
        properties:
          title: Revenue Split
          lookup:
            uuid: sales_tx
  - columns:
    - span: 12
      components:
      - type: data-table
        properties:
          title: Recent Transactions
          lookup:
            uuid: sales_tx

- name: Settings
  components:
  - type: title
    properties:
      text: Application Settings
  - type: panel
    properties:
      title: Configuration
  - type: markdown
    properties:
      content: |
        Configure your application preferences below.

datasets:
- uuid: sales_tx
  name: Sales Transactions
  url: /api/sales
- uuid: analytics
  name: User Analytics
  url: /api/analytics

navTree:
  root_items:
  - type: ITEM
    id: dashboard
    page: Sales Dashboard
  - type: ITEM
    id: settings
    page: Settings
`;

const container = document.getElementById('builder-container')!;
const shell = document.createElement('pages-builder-shell') as PagesBuilderShell;
shell.yaml = SAMPLE_YAML;

const previewFetch: typeof globalThis.fetch = async (input) => {
  const url = typeof input === 'string' ? input : (input as Request).url;
  if (url.startsWith('/api/') || url.startsWith('http')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return globalThis.fetch(input);
};

shell.renderPreview = async (el: HTMLElement, yaml: string) => {
  try {
    const { loadSite } = await import('@casehubio/pages-runtime');
    el.innerHTML = '';
    await loadSite(el, yaml, { fetch: previewFetch });
  } catch {
    el.innerHTML = '<div style="padding:24px;color:#5f6368;text-align:center;">Live preview requires pages-runtime with component bundles.</div>';
  }
};

container.appendChild(shell);
