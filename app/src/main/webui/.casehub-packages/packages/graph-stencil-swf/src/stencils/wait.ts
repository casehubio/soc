import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const waitGrammar: StencilGrammar = {
  type: 'swf-wait',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

function formatDuration(wait: unknown): string {
  if (typeof wait === 'string') return wait;
  if (typeof wait === 'object' && wait !== null) {
    const d = wait as Record<string, number>;
    const parts: string[] = [];
    if (d['days']) parts.push(`${d['days']}d`);
    if (d['hours']) parts.push(`${d['hours']}h`);
    if (d['minutes']) parts.push(`${d['minutes']}m`);
    if (d['seconds']) parts.push(`${d['seconds']}s`);
    if (d['milliseconds']) parts.push(`${d['milliseconds']}ms`);
    if (parts.length > 0) return parts.join(' ');
  }
  return 'wait';
}

export function renderWait(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const wait = node.properties['wait'];
  const duration = formatDuration(wait);
  const label = node.properties['label'] ? String(node.properties['label']) : 'Wait';

  return html`
    <div style="padding: 8px 12px; border: 2px solid var(--pages-border-strong, #888); background: var(--pages-surface-raised, #f8f8f8); border-top: 3px solid #475569; min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--pages-text-color, #333);">
        <span>\u{231B}</span>
        <span>${label}</span>
      </div>
      <div style="color: var(--pages-text-secondary, #666); font-size: 11px; margin-top: 2px;">${duration}</div>
    </div>
  `;
}
