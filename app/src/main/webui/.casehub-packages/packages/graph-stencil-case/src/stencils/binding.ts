import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';

export const bindingGrammar: StencilGrammar = {
  type: 'binding',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['worker', 'milestone'] },
    outbound: { min: 0, max: 1, allowedTo: ['worker', 'subcase', 'external'] },
  },
};

function triggerLabel(on: Record<string, unknown> | undefined): string {
  if (!on) return '?';
  if (on['contextChange']) return 'ctx';
  if (on['cloudEvent']) return 'event';
  if (on['schedule']) return 'sched';
  if (on['scopeActivated']) return 'scope';
  return '?';
}

function targetLabel(data: Record<string, unknown>): string {
  const cap = data['capability'];
  if (cap) {
    if (typeof cap === 'string') return cap;
    return String((cap as { name?: string }).name ?? cap);
  }
  if (data['subCase']) return 'subcase';
  if (data['humanTask']) return 'task';
  return '?';
}

export function renderBinding(node: GraphNode, decoration?: NodeDecoration): StencilTemplate {
  const data = node.properties;
  const name = String(data['name'] ?? '');
  const trigger = triggerLabel(data['on'] as Record<string, unknown> | undefined);
  const target = targetLabel(data);
  const when = data['when'] ? String(data['when']).slice(0, 40) : '';
  const opacity = decoration?.badge?.icon === '—' ? '0.5' : '1';

  return html`
    <div style="padding: 10px 14px; border-radius: 8px; border: 2px solid var(--pages-accent-9, #3b82f6); background: var(--pages-neutral-2, #f5f5f5); min-width: 200px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; opacity: ${opacity};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 600; color: var(--pages-neutral-12, #111);">${name}</span>
        <span style="background: var(--pages-accent-3, #dbeafe); color: var(--pages-accent-11, #1e40af); padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 500;">${trigger}</span>
      </div>
      <div style="color: var(--pages-neutral-9, #666); font-size: 12px;">→ ${target}</div>
      ${when ? html`<div style="color: var(--pages-neutral-8, #888); font-size: 11px; margin-top: 3px; font-style: italic;">${when}</div>` : ''}
    </div>
  `;
}
