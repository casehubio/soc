import type { NodeDecoration } from '@casehubio/graph-core';
import { lookupStatus, type StateCategory } from '@casehubio/pages-ui-components/status-badge';

export const BADGE_COLORS: Record<StateCategory, string> = {
  active:   '#6366f1',
  info:     '#3b82f6',
  success:  '#22c55e',
  danger:   '#ef4444',
  neutral:  '#9ca3af',
  transfer: '#3b82f6',
  warning:  '#eab308',
};

export function toDecoration(domain: string, state: string): NodeDecoration {
  const descriptor = lookupStatus(domain, state);
  const color = BADGE_COLORS[descriptor.category];

  const decoration: NodeDecoration = {
    badge: {
      icon: descriptor.icon,
      color,
      ...(descriptor.pulse ? { pulse: true } : {}),
    },
  };

  if (descriptor.border) {
    (decoration as any).border = { style: 'solid', color };
  }

  return decoration;
}
