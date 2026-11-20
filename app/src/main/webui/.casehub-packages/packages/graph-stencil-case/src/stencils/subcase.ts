import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';

export const subcaseGrammar: StencilGrammar = {
  type: 'subcase',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['binding'] },
    outbound: { min: 0, max: 0, allowedTo: [] },
  },
};

export function renderSubCase(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const data = node.properties;
  const ns = String(data['namespace'] ?? '');
  const name = String(data['name'] ?? '');
  const version = String(data['version'] ?? '');
  const groupId = data['groupId'] as string | undefined;
  const total = data['totalInGroup'] as number | undefined;
  const required = data['requiredCount'] as number | undefined;

  return html`
    <div style="padding: 10px 14px; border: 3px double #8b5cf6; background: var(--pages-neutral-2, #f5f5f5); border-radius: 6px; min-width: 180px; font-family: var(--pages-font-family, sans-serif); font-size: 13px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 13px;">📦</span>
        <span style="font-weight: 600; color: var(--pages-neutral-12, #111);">${name}</span>
      </div>
      ${ns ? html`<div style="color: var(--pages-neutral-9, #666); font-size: 11px; margin-top: 3px;">${ns}${version ? ` v${version}` : ''}</div>` : ''}
      ${groupId ? html`<div style="font-size: 11px; color: #7c3aed; margin-top: 3px;">${required ?? total}/${total} (${groupId})</div>` : ''}
    </div>
  `;
}
