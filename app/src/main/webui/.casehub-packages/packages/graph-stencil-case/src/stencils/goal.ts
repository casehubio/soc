import { html } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';

export const goalGrammar: StencilGrammar = {
  type: 'goal',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['milestone', 'binding'] },
    outbound: { min: 0, max: 0, allowedTo: [] },
  },
};

const KIND_COLORS: Record<string, { border: string; textVar: string; textFallback: string; icon: string }> = {
  success: { border: '#16a34a', textVar: '--pages-success-11', textFallback: '#15803d', icon: '🎯' },
  failure: { border: '#dc2626', textVar: '--pages-danger-11', textFallback: '#b91c1c', icon: '⛔' },
};

export function renderGoal(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const data = node.properties;
  const name = String(data['name'] ?? '');
  const kind = String(data['kind'] ?? 'success');
  const c = KIND_COLORS[kind] ?? { border: '#3b82f6', textVar: '--pages-accent-11', textFallback: '#1d4ed8', icon: '🎯' };

  return html`
    <div style="padding: 10px 14px; background: var(--pages-neutral-2, #f5f5f5); border: 2px solid ${c.border}; border-radius: 6px; min-width: 160px; font-family: var(--pages-font-family, sans-serif); font-size: 13px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 14px;">${c.icon}</span>
        <span style="font-weight: 600; color: var(${c.textVar}, ${c.textFallback});">${name}</span>
      </div>
      <div style="font-size: 11px; color: var(${c.textVar}, ${c.textFallback}); text-transform: uppercase; margin-top: 3px; opacity: 0.7;">${kind}</div>
    </div>
  `;
}
