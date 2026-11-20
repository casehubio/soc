import type { NodeDecoration } from '@casehubio/graph-core';
import type { CaseRuntimeState, PlanItemSnapshot, TrustScoreSnapshot, AdaptiveDecisionSnapshot } from './types.js';
import { toDecoration } from './decoration.js';
import {
  TERMINAL_SEVERITY,
  ACTIVE_WORST_PRIORITY,
  isActiveStatus,
} from './badge-mappings.js';

function aggregateBinding(items: readonly PlanItemSnapshot[]): NodeDecoration {
  const activeItems = items.filter(i => isActiveStatus(i.status));
  const count = items.length > 1 ? items.length : undefined;

  let statusKey: string;

  if (activeItems.length > 0) {
    statusKey = activeItems.reduce((worst, item) =>
      (ACTIVE_WORST_PRIORITY[item.status] ?? 0) > (ACTIVE_WORST_PRIORITY[worst.status] ?? 0) ? item : worst,
    ).status;
  } else {
    const sorted = [...items].sort((a, b) => {
      const timeDiff = b.createdAt.localeCompare(a.createdAt);
      if (timeDiff !== 0) return timeDiff;
      return (TERMINAL_SEVERITY[b.status] ?? 0) - (TERMINAL_SEVERITY[a.status] ?? 0);
    });
    statusKey = sorted[0]!.status;
  }

  const base = toDecoration('task', statusKey);
  const tooltip = buildTooltip(items);

  return {
    ...base,
    badge: count !== undefined ? { ...base.badge!, count } : { ...base.badge! },
    tooltip,
  };
}

function buildTooltip(items: readonly PlanItemSnapshot[]): string {
  if (items.length === 1) {
    return items[0]!.status.toLowerCase();
  }
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.status.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const parts = Array.from(counts.entries()).map(([status, n]) => `${n} ${status}`);
  return `${items.length} plan items: ${parts.join(', ')}`;
}

export function toDecorations(state: CaseRuntimeState): ReadonlyMap<string, NodeDecoration> {
  const decorations = new Map<string, NodeDecoration>();

  const byBinding = new Map<string, PlanItemSnapshot[]>();
  for (const item of state.planItems) {
    const list = byBinding.get(item.bindingName);
    if (list) {
      list.push(item);
    } else {
      byBinding.set(item.bindingName, [item]);
    }
  }

  for (const [bindingName, items] of byBinding) {
    decorations.set(`binding:${bindingName}`, aggregateBinding(items));
  }

  for (const milestone of state.milestones) {
    const base = toDecoration('milestone', milestone.status);
    decorations.set(`milestone:${milestone.name}`, { ...base, tooltip: milestone.status.toLowerCase() });
  }

  if (state.trustScores) {
    for (const ts of state.trustScores) {
      const key = `binding:${ts.bindingName}`;
      const existing = decorations.get(key);
      if (existing) {
        decorations.set(key, {
          ...existing,
          pills: [{ text: String(ts.score), color: trustScoreColor(ts.score) }],
        });
      }
    }
  }

  if (state.adaptiveDecisions) {
    for (const ad of state.adaptiveDecisions) {
      if (!ad.fired || !ad.affectedBindings) continue;
      for (const bindingName of ad.affectedBindings) {
        const key = `binding:${bindingName}`;
        const existing = decorations.get(key);
        if (existing) {
          const adaptiveTooltip = `⚡ ${ad.trigger}: ${ad.condition}`;
          const currentTooltip = existing.tooltip ?? '';
          decorations.set(key, {
            ...existing,
            tooltip: currentTooltip ? `${currentTooltip}\n${adaptiveTooltip}` : adaptiveTooltip,
          });
        }
      }
    }
  }

  return decorations;
}

function trustScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}
