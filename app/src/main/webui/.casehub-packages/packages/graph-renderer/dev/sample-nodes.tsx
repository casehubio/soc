import { html } from 'lit-html';
import type { GraphNode } from '@casehubio/graph-core';
import type { StencilTemplate } from '../src/stencil-wrapper.js';

export const sampleDefaultRender = (node: GraphNode): StencilTemplate => html`
  <div style="padding: 10px 20px; border-radius: var(--pages-radius-md, 8px);
    background: var(--pages-neutral-2, #f0f0f0);
    border: 1px solid var(--pages-neutral-6, #999);
    font-family: var(--pages-font-family, system-ui);
    font-size: var(--pages-font-size-base, 14px);
    color: var(--pages-text-primary, #111);">
    ${String(node.properties['label'] ?? '')}
  </div>
`;

export const sampleGroupRender = (node: GraphNode): StencilTemplate => html`
  <div style="padding: 30px 10px 10px; border-radius: var(--pages-radius-lg, 12px);
    background: var(--pages-accent-2, #e8f0ff);
    border: 2px solid var(--pages-accent-7, #3366cc);
    min-width: 200px; min-height: 150px;
    font-family: var(--pages-font-family, system-ui);
    font-size: var(--pages-font-size-sm, 12px);
    color: var(--pages-accent-11, #003);">
    <div style="position: absolute; top: 8px; left: 12px; font-weight: 600;">
      ${String(node.properties['label'] ?? '')}
    </div>
  </div>
`;
