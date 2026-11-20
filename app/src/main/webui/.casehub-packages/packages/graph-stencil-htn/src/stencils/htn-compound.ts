import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';

export const htnCompoundGrammar: StencilGrammar = {
  type: 'htn-compound',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['htn-method'] },
    outbound: { min: 0, max: Infinity, allowedTo: ['htn-method'] },
  },
};

export function renderHtnCompound(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const name = String(node.properties['name'] ?? '');
  const methodCount = node.properties['methodCount'] ?? 0;
  return html`
    <div style="padding: 12px 16px; border: 2px solid #7c3aed; background: #f5f3ff; min-width: 180px; border-radius: 8px; font-family: var(--pages-font-family, sans-serif); font-size: 13px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 14px;">🔀</span>
        <span style="font-weight: 700; color: #1e1b4b;">${name}</span>
        <span style="font-size: 10px; padding: 1px 6px; border-radius: 8px; background: #7c3aed; color: #fff; font-weight: 600;">${methodCount} methods</span>
      </div>
    </div>
  `;
}
