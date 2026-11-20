import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES } from './grammars.js';

export const raiseGrammar: StencilGrammar = {
  type: 'swf-raise',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 0, allowedTo: [] },
  },
};

export function renderRaise(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const raise = node.properties['raise'] as { error?: { type?: string; title?: string } } | undefined;
  const errorTitle = raise?.error?.title ?? '';
  const label = node.properties['label'] ? String(node.properties['label']) : 'Raise';

  return html`
    <div style="padding: 8px 12px; border: 2px solid #dc2626; background: #fef2f2; border-top: 3px solid #dc2626; min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #dc2626;">
        <span>⚠️</span>
        <span>${label}</span>
      </div>
      ${errorTitle ? html`<div style="color: #991b1b; font-size: 11px; margin-top: 2px;">${errorTitle}</div>` : ''}
    </div>
  `;
}
