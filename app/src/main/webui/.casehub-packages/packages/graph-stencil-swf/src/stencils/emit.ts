import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const emitGrammar: StencilGrammar = {
  type: 'swf-emit',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

export function renderEmit(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const emit = node.properties['emit'] as { event?: { with?: { type?: string } } } | undefined;
  const eventType = emit?.event?.with?.type ?? '';
  const label = node.properties['label'] ? String(node.properties['label']) : 'Emit';

  return html`
    <div style="padding: 8px 12px; border: 2px solid var(--pages-border-strong, #888); background: var(--pages-surface-raised, #f8f8f8); border-top: 3px solid #7c3aed; min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--pages-text-color, #333);">
        <span>\u{1F4E1}</span>
        <span>${label}</span>
      </div>
      ${eventType ? html`<div style="color: var(--pages-text-secondary, #666); font-size: 11px; margin-top: 2px;">${eventType}</div>` : ''}
    </div>
  `;
}
