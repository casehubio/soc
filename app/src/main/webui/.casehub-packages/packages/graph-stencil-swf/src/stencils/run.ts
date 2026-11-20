import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const runGrammar: StencilGrammar = {
  type: 'swf-run',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

function describeRunType(run: Record<string, unknown> | undefined): string {
  if (!run) return 'run';
  if (run['container']) {
    const c = run['container'] as { image?: string };
    return c.image ? `container: ${c.image}` : 'container';
  }
  if (run['shell']) {
    const s = run['shell'] as { command?: string };
    return s.command ? `shell: ${s.command}` : 'shell';
  }
  if (run['script']) {
    const s = run['script'] as { language?: string };
    return s.language ? `script: ${s.language}` : 'script';
  }
  if (run['workflow']) {
    const w = run['workflow'] as { name?: string };
    return w.name ? `workflow: ${w.name}` : 'workflow';
  }
  return 'run';
}

export function renderRun(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const run = node.properties['run'] as Record<string, unknown> | undefined;
  const subType = describeRunType(run);
  const label = node.properties['label'] ? String(node.properties['label']) : 'Run';

  return html`
    <div style="padding: 8px 12px; border: 2px solid var(--pages-border-strong, #888); background: var(--pages-surface-raised, #f8f8f8); border-top: 3px solid #059669; min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--pages-text-color, #333);">
        <span>\u{2699}\u{FE0F}</span>
        <span>${label}</span>
      </div>
      <div style="color: var(--pages-text-secondary, #666); font-size: 11px; margin-top: 2px;">${subType}</div>
    </div>
  `;
}
