import { html } from 'lit-html';
import type { JSONSchema7 } from 'json-schema';
import type { StencilRenderFn, StencilTemplate } from './stencil-wrapper.js';
import type { GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { WorkStencil } from '@casehubio/graph-work-registry';
import type { StencilDescriptor } from './registry/stencil-registry.js';

export function createWorkStencilRenderFn(stencil: WorkStencil): StencilRenderFn {
  return (_node: GraphNode, _decoration?: NodeDecoration): StencilTemplate => {
    const inputKeys = summarizeSchema(stencil.input);
    const outputKeys = summarizeSchema(stencil.output);

    return html`
      <div style="
        display: flex; flex-direction: column; gap: 4px;
        padding: 8px 12px; min-width: 140px;
        font-family: var(--pages-font-sans, system-ui, sans-serif);
        font-size: 12px; color: var(--pages-color-neutral-12, #1a1a1a);
      ">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 16px;">${stencil.icon}</span>
          <span style="font-weight: 600; font-size: 13px;">${stencil.displayName}</span>
        </div>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <span style="
            padding: 1px 6px; border-radius: 4px; font-size: 10px;
            background: var(--pages-color-neutral-3, #e8e8e8);
            color: var(--pages-color-neutral-11, #444);
          ">${formatCategory(stencil.category)}</span>
          <span style="
            padding: 1px 6px; border-radius: 4px; font-size: 10px;
            background: ${stencil.async ? 'var(--pages-color-blue-3, #dbeafe)' : 'var(--pages-color-green-3, #dcfce7)'};
            color: ${stencil.async ? 'var(--pages-color-blue-11, #1e40af)' : 'var(--pages-color-green-11, #166534)'};
          ">${stencil.async ? 'async' : 'sync'}</span>
        </div>
        ${inputKeys || outputKeys ? html`
          <div style="
            font-size: 10px; color: var(--pages-color-neutral-9, #888);
            border-top: 1px solid var(--pages-color-neutral-4, #ddd);
            padding-top: 4px; margin-top: 2px;
          ">
            ${inputKeys ? html`<div>in: ${inputKeys}</div>` : ''}
            ${outputKeys ? html`<div>out: ${outputKeys}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  };
}

export function toWorkStencilDescriptor(stencil: WorkStencil): StencilDescriptor {
  return {
    type: `work:${stencil.name}`,
    label: stencil.displayName,
    icon: stencil.icon,
    grammar: {
      type: `work:${stencil.name}`,
      connections: {
        inbound: { min: 0, max: Infinity, allowedFrom: [] },
        outbound: { min: 0, max: Infinity, allowedTo: [] },
      },
    },
    render: createWorkStencilRenderFn(stencil),
  };
}

function formatCategory(category: string): string {
  const last = category.split('/').pop() ?? category;
  return last.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function summarizeSchema(schema: JSONSchema7): string {
  if (typeof schema === 'boolean') return '';
  const props = schema.properties;
  if (props) {
    return Object.keys(props).slice(0, 3).join(', ');
  }
  return '';
}
