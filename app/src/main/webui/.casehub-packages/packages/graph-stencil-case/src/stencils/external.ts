import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';

export const externalGrammar: StencilGrammar = {
  type: 'external',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['binding'] },
    outbound: { min: 0, max: 0, allowedTo: [] },
  },
};

export function renderExternal(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const name = String(node.properties['name'] ?? node.id.replace('external:', ''));

  return html`
    <div style="padding: 10px 14px; border: 2px dashed var(--pages-neutral-7, #a3a3a3); background: var(--pages-neutral-2, #f5f5f5); border-radius: 6px; min-width: 140px; font-family: var(--pages-font-family, sans-serif); font-size: 13px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 13px;">🔗</span>
        <span style="font-weight: 600; color: var(--pages-neutral-11, #555);">${name}</span>
      </div>
      <div style="color: var(--pages-neutral-8, #888); font-size: 11px; margin-top: 3px;">external capability</div>
    </div>
  `;
}
