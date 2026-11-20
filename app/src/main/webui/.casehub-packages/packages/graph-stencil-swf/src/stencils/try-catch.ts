import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const tryCatchGrammar: StencilGrammar = {
  type: 'swf-try-catch',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

export function renderCatch(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const label = node.properties['label'] ? String(node.properties['label']) : 'catch';
  return html`
    <div style="font-family: var(--pages-font-family, sans-serif); font-size: 11px; font-weight: 600; color: var(--pages-danger-11, #b91c1c); letter-spacing: 0.03em; padding: 2px 8px;">
      <span style="opacity: 0.8;">&#x26A0;</span> ${label}
    </div>
  `;
}

export function renderTryCatch(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const label = node.properties['label'] ? String(node.properties['label']) : 'try/catch';
  const errors = node.properties['errors'] as { with?: { type?: string } } | undefined;
  const errorFilter = errors?.with?.type ?? '';

  return html`

    <div style="padding: 5px 10px; font-family: var(--pages-font-family, sans-serif); font-size: 12px; position: relative;">
      <div style="display: flex; align-items: center; gap: 5px; font-weight: 600; color: var(--pages-warning-11, #92400e);">
        <span style="font-size: 13px;">\u{1F6E1}\u{FE0F}</span>
        <span>${label}</span>
        ${errorFilter ? html`<span style="color: var(--pages-warning-9, #b45309); font-weight: 400; font-size: 10px; margin-left: 6px; opacity: 0.7;">${errorFilter}</span>` : ''}
      </div>
    </div>
  `;
}
