import { html, nothing } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';

export const htnMethodGrammar: StencilGrammar = {
  type: 'htn-method',
  connections: {
    inbound: { min: 1, max: 1, allowedFrom: ['htn-compound'] },
    outbound: { min: 1, max: Infinity, allowedTo: ['htn-leaf', 'htn-compound'] },
  },
};

export function renderHtnMethod(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const guardLabel = String(node.properties['guardLabel'] ?? '');
  const guard = String(node.properties['guard'] ?? '');
  return html`
    <div style="padding: 10px 14px; border: 1px dashed #a78bfa; background: #faf5ff; min-width: 160px; border-radius: 6px; font-family: var(--pages-font-family, sans-serif); font-size: 12px;">
      <div style="font-weight: 600; color: #5b21b6;">${guardLabel || 'Method'}</div>
      ${guard ? html`<div style="color: #7c3aed; font-size: 11px; font-family: monospace; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;" title="${guard}">${guard}</div>` : nothing}
    </div>
  `;
}
