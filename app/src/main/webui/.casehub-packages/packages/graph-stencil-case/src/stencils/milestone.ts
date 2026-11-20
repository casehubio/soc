import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';

export const milestoneGrammar: StencilGrammar = {
  type: 'milestone',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['binding', 'goal'] },
    outbound: { min: 0, max: Infinity, allowedTo: ['binding'] },
  },
};

export function renderMilestone(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const data = node.properties;
  const name = String(data['name'] ?? '');
  const sla = data['slaDuration'] ? String(data['slaDuration']) : '';

  return html`
    <div style="padding: 10px 14px; background: var(--pages-neutral-2, #f5f5f5); border: 2px solid #d97706; border-left: 4px solid #d97706; border-radius: 6px; min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 14px;">🚩</span>
        <span style="font-weight: 600; color: var(--pages-warning-11, #92400e);">${name}</span>
      </div>
      ${sla ? html`<div style="font-size: 11px; color: var(--pages-warning-9, #d97706); margin-top: 3px;">${sla}</div>` : ''}
    </div>
  `;
}
