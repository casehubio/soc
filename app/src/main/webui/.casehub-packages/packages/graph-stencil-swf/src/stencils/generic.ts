import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';

export const genericGrammar: StencilGrammar = {
  type: 'swf-generic',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [] },
    outbound: { min: 0, max: Infinity, allowedTo: [] },
  },
};

export function renderGeneric(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const originalType = String(node.properties['originalType'] ?? 'step');
  const label = node.properties['label'] ? String(node.properties['label']) : originalType;

  return html`
    <div style="padding: 8px 12px; border: 2px solid var(--pages-border-color, #ddd); background: var(--pages-surface-color, #fff); min-width: 140px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--pages-text-secondary, #666);">
        <span>\u{2B21}</span>
        <span>${label}</span>
      </div>
      <div style="color: var(--pages-text-tertiary, #999); font-size: 10px; margin-top: 2px;">${originalType}</div>
    </div>
  `;
}
