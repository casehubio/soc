import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const listenGrammar: StencilGrammar = {
  type: 'swf-listen',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

function describeStrategy(listen: Record<string, unknown> | undefined): string {
  if (!listen) return 'events';
  const to = listen['to'] as Record<string, unknown> | undefined;
  if (!to) return 'events';
  if (to['one']) return 'one event';
  if (to['all']) {
    const items = to['all'] as unknown[];
    return `all ${items?.length ?? ''} events`;
  }
  if (to['any']) {
    const items = to['any'] as unknown[];
    return `any of ${items?.length ?? ''} events`;
  }
  return 'events';
}

export function renderListen(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const listen = node.properties['listen'] as Record<string, unknown> | undefined;
  const strategy = describeStrategy(listen);
  const label = node.properties['label'] ? String(node.properties['label']) : 'Listen';

  return html`
    <div style="padding: 8px 12px; border: 2px solid var(--pages-border-strong, #888); background: var(--pages-surface-raised, #f8f8f8); border-top: 3px solid #0d9488; min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--pages-text-color, #333);">
        <span>\u{1F4FB}</span>
        <span>${label}</span>
      </div>
      <div style="color: var(--pages-text-secondary, #666); font-size: 11px; margin-top: 2px;">${strategy}</div>
    </div>
  `;
}
