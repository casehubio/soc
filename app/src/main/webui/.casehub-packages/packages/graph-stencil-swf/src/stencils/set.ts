import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const setGrammar: StencilGrammar = {
  type: 'swf-set',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

export function renderSet(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const setData = node.properties['set'] as Record<string, unknown> | undefined;
  const vars = setData ? Object.keys(setData).join(', ') : '';
  const label = node.properties['label'] ? String(node.properties['label']) : 'Set';

  return html`
    <div style="padding: 8px 12px; border: 2px solid var(--pages-border-strong, #888); background: var(--pages-surface-raised, #f8f8f8); border-top: 3px solid #8b5cf6; min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--pages-text-color, #333);">
        <span>✏️</span>
        <span>${label}</span>
      </div>
      ${vars ? html`<div style="color: var(--pages-text-secondary, #666); font-size: 11px; margin-top: 2px;">${vars}</div>` : ''}
    </div>
  `;
}
