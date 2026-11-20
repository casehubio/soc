import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { FLOW_SOURCES, FLOW_TARGETS } from './grammars.js';

export const startGrammar: StencilGrammar = {
  type: 'swf-start',
  connections: { inbound: { min: 0, max: 0, allowedFrom: [] }, outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] } },
};

export const endGrammar: StencilGrammar = {
  type: 'swf-end',
  connections: { inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] }, outbound: { min: 0, max: 0, allowedTo: [] } },
};

export const entryGrammar: StencilGrammar = {
  type: 'swf-entry',
  connections: { inbound: { min: 0, max: 0, allowedFrom: [] }, outbound: { min: 0, max: 1, allowedTo: [...FLOW_TARGETS] } },
};

export const exitGrammar: StencilGrammar = {
  type: 'swf-exit',
  connections: { inbound: { min: 0, max: Infinity, allowedFrom: [...FLOW_SOURCES] }, outbound: { min: 0, max: 0, allowedTo: [] } },
};

function renderBoundaryNode(label: string, color: string): StencilTemplate {
  return html`
    <div style="padding: 14px 14px; border: 2px solid ${color}; background: ${color}22; border-radius: 20px; font-family: var(--pages-font-family, sans-serif); font-size: 11px; font-weight: 600; color: ${color}; text-align: center; min-width: 60px; box-sizing: border-box;">
      ${label}
    </div>
  `;
}

export function renderStart(_node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  return renderBoundaryNode('Start', '#16a34a');
}

export function renderEnd(_node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  return renderBoundaryNode('End', '#6b7280');
}

export function renderEntry(_node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  return renderBoundaryNode('Entry', '#0d9488');
}

export function renderExit(_node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  return renderBoundaryNode('Exit', '#9ca3af');
}
