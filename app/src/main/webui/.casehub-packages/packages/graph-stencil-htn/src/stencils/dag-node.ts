import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';

export const dagNodeGrammar: StencilGrammar = {
  type: 'dag-node',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['dag-node'] },
    outbound: { min: 0, max: Infinity, allowedTo: ['dag-node'] },
  },
};

const DIM_ICONS = new Set(['⏭', '/', '—']);

export function renderDagNode(node: GraphNode, decoration?: NodeDecoration): StencilTemplate {
  const data = node.properties;
  const deps = data['dependsOn'] as readonly string[] | undefined;
  const joinType = data['joinType'] as string | undefined;
  const desc = String(data['taskDescription'] ?? '').slice(0, 60);
  const executor = data['executorName'] as string | undefined;
  const showJoin = deps != null && deps.length > 1;
  const joinIcon = joinType === 'ANY_OF' ? '∨' : '∧';
  const dimmed = decoration?.badge?.icon != null && DIM_ICONS.has(decoration.badge.icon);
  const opacity = dimmed ? '0.5' : '1';

  return html`
    <div style="padding: 8px 12px; border-radius: 8px; border: 2px solid var(--pages-border-color, #ccc); background: var(--pages-surface-color, #fff); min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; opacity: ${opacity};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        ${showJoin ? html`<span style="background: var(--pages-accent-subtle, #e8f0fe); color: var(--pages-accent-color, #1a73e8); padding: 1px 6px; border-radius: 4px; font-size: 11px; margin-right: 6px;">${joinIcon} ${joinType}</span>` : ''}
        <span style="font-weight: 600; color: var(--pages-text-color, #333); flex: 1;">${desc}</span>
      </div>
      ${executor ? html`<div style="color: var(--pages-text-secondary, #666); font-size: 12px;">${executor}</div>` : ''}
    </div>
  `;
}
