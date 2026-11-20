import { html, nothing } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { emitPagesEvent } from '@casehubio/pages-data';

export const htnLeafGrammar: StencilGrammar = {
  type: 'htn-leaf',
  connections: {
    inbound: { min: 1, max: 1, allowedFrom: ['htn-method'] },
    outbound: { min: 0, max: 0, allowedTo: [] },
  },
};

export function renderHtnLeaf(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const name = String(node.properties['name'] ?? '');
  const capability = node.properties['capability'] as string | undefined;
  const definitionRef = node.properties['definitionRef'] as string | undefined;
  return html`
    <div style="padding: 10px 14px; border: 2px solid #059669; background: #ecfdf5; min-width: 150px; border-radius: 4px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; position: relative; z-index: 5;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-weight: 600; color: #064e3b; flex: 1;">${name}</span>
        ${definitionRef ? html`
          <button style="border: none; background: none; cursor: pointer; font-size: 13px; color: var(--pages-accent-9, #2563eb); padding: 2px 4px; position: relative; z-index: 10;"
            title="Drill down"
            @click=${(e: Event) => {
              e.stopPropagation();
              emitPagesEvent(e.target as HTMLElement, 'diagram:drill-down', { nodeId: node.id, nodeName: name, definitionRef });
            }}>⤢</button>
        ` : nothing}
      </div>
      ${capability ? html`<div style="font-size: 11px; color: #059669; margin-top: 2px;">→ ${capability}</div>` : nothing}
    </div>
  `;
}
