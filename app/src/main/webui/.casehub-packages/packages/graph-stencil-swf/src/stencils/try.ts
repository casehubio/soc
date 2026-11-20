import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const tryGrammar: StencilGrammar = {
  type: 'swf-try',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

export function renderTry(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const label = node.properties['label'] ? String(node.properties['label']) : 'Try';
  return html`
    <div style="font-family: var(--pages-font-family, sans-serif); font-size: 11px; font-weight: 600; color: var(--pages-accent-11, #1d4ed8); letter-spacing: 0.03em; padding: 2px 8px;">
      <span style="opacity: 0.8;">&#x25B6;</span> ${label}
    </div>
  `;
}
