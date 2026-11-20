import { html, nothing } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { emitPagesEvent } from '@casehubio/pages-data';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

const CALL_ICONS: Record<string, string> = {
  http: '\u{1F310}',
  grpc: '\u{1F50C}',
  openapi: '\u{1F4CB}',
  function: '{ }',
  'casehub:dispatch': '➡️',
};

export const callGrammar: StencilGrammar = {
  type: 'swf-call',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] },
    outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] },
  },
};

export function renderCall(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const callType = String(node.properties['call'] ?? 'function');
  const icon = CALL_ICONS[callType] ?? '\u{1F4DE}';
  const label = node.properties['label'] ? String(node.properties['label']) : callType;
  const definitionRef = node.properties['definitionRef'] as string | undefined;

  return html`
    <div style="padding: 8px 12px; border: 2px solid var(--pages-border-strong, #888); background: var(--pages-surface-raised, #f8f8f8); border-top: 3px solid var(--pages-accent-color, #4a9eff); min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px; position: relative; z-index: 5;">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--pages-text-color, #333);">
        <span>${icon}</span>
        <span style="flex:1;">${label}</span>
        ${definitionRef ? html`
          <button style="border: none; background: none; cursor: pointer; font-size: 13px; color: var(--pages-accent-9, #2563eb); padding: 2px 4px; position: relative; z-index: 10;"
            title="Drill down"
            @click=${(e: Event) => {
              e.stopPropagation();
              emitPagesEvent(e.target as HTMLElement, 'diagram:drill-down', { nodeId: node.id, nodeName: label, definitionRef });
            }}>⤢</button>
        ` : nothing}
      </div>
      <div style="color: var(--pages-text-secondary, #666); font-size: 11px; margin-top: 2px;">call: ${callType}</div>
    </div>
  `;
}
