import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const forGrammar: StencilGrammar = {
  type: 'swf-for',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

export function renderFor(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const label = node.properties['label'] ? String(node.properties['label']) : 'For';
  const each = node.properties['each'] as string | undefined;
  const inExpr = node.properties['in'] as string | undefined;
  const subtitle = each && inExpr ? `for ${each} in ${inExpr}` : each ? `for ${each}` : 'for loop';

  return html`
    <div style="font-family: var(--pages-font-family, sans-serif); font-size: 11px; font-weight: 600; color: var(--pages-accent-11, #1d4ed8); letter-spacing: 0.03em; padding: 2px 8px;">
      <span style="opacity: 0.8;">&#x1F504;</span> ${label}
      <div style="font-weight: 400; font-size: 10px; color: var(--pages-text-secondary, #666); margin-top: 1px;">${subtitle}</div>
    </div>
  `;
}
