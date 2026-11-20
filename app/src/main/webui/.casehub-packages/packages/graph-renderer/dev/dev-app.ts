import { createGraph } from '@casehubio/graph-core';
import { registerStencil } from '../src/registry/stencil-registry.js';
import { sampleDefaultRender, sampleGroupRender } from './sample-nodes.js';
import '../src/bridge/GraphCanvas.js';
import '../src/bridge/PagesGraphCanvas.js';
import type { PagesGraphCanvas } from '../src/bridge/PagesGraphCanvas.js';

registerStencil({
  type: 'sample-default',
  label: 'Default Node',
  icon: 'circle',
  grammar: {
    type: 'sample-default',
    connections: {
      inbound: { min: 0, max: 5, allowedFrom: [] },
      outbound: { min: 0, max: 5, allowedTo: [] },
    },
  },
  render: sampleDefaultRender,
});
registerStencil({
  type: 'sample-group',
  label: 'Group Node',
  icon: 'box',
  grammar: {
    type: 'sample-group',
    connections: {
      inbound: { min: 0, max: 5, allowedFrom: [] },
      outbound: { min: 0, max: 5, allowedTo: [] },
    },
  },
  render: sampleGroupRender,
});

// --- GraphCanvas core (direct model API) ---
const model = createGraph(
  [
    { id: 'worker-1', type: 'sample-group', properties: { label: 'Worker: ReviewAgent' } },
    { id: 'binding-1', type: 'sample-default', parentId: 'worker-1', properties: { label: 'on-document-upload' } },
    { id: 'binding-2', type: 'sample-default', parentId: 'worker-1', properties: { label: 'on-review-complete' } },
    { id: 'milestone-1', type: 'sample-default', properties: { label: 'Milestone: review-done' } },
    { id: 'goal-1', type: 'sample-default', properties: { label: 'Goal: case-resolved' } },
  ],
  [
    { id: 'e1', type: 'default', source: 'binding-1', target: 'binding-2' },
    { id: 'e2', type: 'default', source: 'binding-2', target: 'milestone-1' },
    { id: 'e3', type: 'default', source: 'milestone-1', target: 'goal-1' },
  ],
);

const coreCanvas = document.querySelector('graph-canvas-core');
if (coreCanvas) {
  (coreCanvas as unknown as { model: typeof model }).model = model;
}

// --- PagesGraphCanvas YAML bridge (tabular data API) ---
const yamlCanvas = document.querySelector('pages-graph-canvas') as PagesGraphCanvas | null;
if (yamlCanvas) {
  yamlCanvas.props = {
    sourceColumn: 'from',
    targetColumn: 'to',
    directed: true,
    direction: 'RIGHT',
    algorithm: 'layered',
    spacing: 60,
    fitView: true,
  } as any;
  yamlCanvas.dataSet = {
    columns: [{ id: 'from' }, { id: 'to' }],
    rows: [
      { cells: [{ type: 'TEXT', value: 'Ingest' }, { type: 'TEXT', value: 'Validate' }] },
      { cells: [{ type: 'TEXT', value: 'Validate' }, { type: 'TEXT', value: 'Transform' }] },
      { cells: [{ type: 'TEXT', value: 'Transform' }, { type: 'TEXT', value: 'Enrich' }] },
      { cells: [{ type: 'TEXT', value: 'Enrich' }, { type: 'TEXT', value: 'Store' }] },
      { cells: [{ type: 'TEXT', value: 'Store' }, { type: 'TEXT', value: 'Notify' }] },
    ],
  };
}

const hostTestEl = document.getElementById('host-test');
if (hostTestEl) {
  hostTestEl.textContent = 'This text should have HOST styles (Comic Sans, magenta) — not affected by graph-renderer CSS.';
}
