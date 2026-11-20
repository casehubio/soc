import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const switchGrammar: StencilGrammar = {
  type: 'swf-switch',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 1, max: Infinity, allowedTo: [...FLOW_TARGETS] },
  },
};

export function renderSwitch(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const cases = node.properties['switch'] as unknown[] | undefined;
  const count = cases?.length ?? 0;
  const label = node.properties['label'] ? String(node.properties['label']) : 'Switch';

  return html`
    <div style="padding: 8px 12px; border: 2px solid var(--pages-border-strong, #888); background: var(--pages-surface-raised, #f8f8f8); border-top: 3px solid #f59e0b; min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--pages-text-color, #333);">
        <span>\u{1F500}</span>
        <span>${label}</span>
      </div>
      <div style="color: var(--pages-text-secondary, #666); font-size: 11px; margin-top: 2px;">${count} case${count !== 1 ? 's' : ''}</div>
    </div>
  `;
}
