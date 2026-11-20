import { html, nothing } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const forkGrammar: StencilGrammar = {
  type: 'swf-fork',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

export function renderFork(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const fork = node.properties['fork'] as { compete?: boolean } | undefined;
  const compete = fork?.compete === true;
  const label = node.properties['label'] ? String(node.properties['label']) : 'Fork';

  return html`
    <div style="font-family: var(--pages-font-family, sans-serif); font-size: 11px; font-weight: 600; color: var(--pages-accent-11, #1d4ed8); letter-spacing: 0.03em; padding: 2px 8px;">
      <span style="opacity: 0.8;">\u{1F500}</span> ${label}
      ${compete ? html`<span style="background: #dc2626; color: white; font-size: 9px; padding: 1px 5px; border-radius: 3px; margin-left: 6px; font-weight: 500; letter-spacing: 0;">race</span>` : nothing}
    </div>
  `;
}
