import { html, css } from 'lit';
import type { TemplateResult } from 'lit';
import type { EventTimelineNode } from '../../event-timeline-types.js';

export interface CompactTimelineOptions {
  onExpandRequested: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

function computeTemporalWeights(nodes: EventTimelineNode[]): number[] {
  if (nodes.length === 0) return [];
  if (nodes.length < 2) return nodes.map(() => 1);

  const times = nodes.map(n => n.timestamp ? new Date(n.timestamp).getTime() : NaN);
  const allValid = times.every(t => !isNaN(t));

  if (!allValid) {
    return nodes.map((_, i) => (i === 0 ? 0 : 1));
  }

  const totalSpan = times[times.length - 1]! - times[0]!;
  if (totalSpan === 0) {
    return nodes.map((_, i) => (i === 0 ? 0 : 1));
  }

  return nodes.map((_, i) => {
    if (i === 0) return 0;
    return (times[i]! - times[i - 1]!) / totalSpan;
  });
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

export function renderCompactTimeline(nodes: EventTimelineNode[], opts: CompactTimelineOptions): TemplateResult {
  const TRUNCATE_THRESHOLD = 7;
  const SHOW_FIRST = 3;
  const SHOW_LAST = 2;

  let displayNodes = nodes;
  let hiddenCount = 0;
  let ellipsisWeight = 0;

  const fullWeights = computeTemporalWeights(nodes);

  if (nodes.length > TRUNCATE_THRESHOLD) {
    const first = nodes.slice(0, SHOW_FIRST);
    const last = nodes.slice(-SHOW_LAST);
    displayNodes = [...first, ...last];
    hiddenCount = nodes.length - SHOW_FIRST - SHOW_LAST;
    for (let k = SHOW_FIRST; k < nodes.length - SHOW_LAST; k++) {
      ellipsisWeight += fullWeights[k] ?? 0;
    }
  }

  const weights = hiddenCount > 0
    ? [...fullWeights.slice(0, SHOW_FIRST), ...fullWeights.slice(-SHOW_LAST)]
    : fullWeights;
  const summaryLabel = `Timeline: ${nodes.length} events`;

  return html`
    <div
      class="compact-strip"
      role="img"
      aria-label="${summaryLabel}"
      tabindex="0"
      @click=${opts.onExpandRequested}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          opts.onExpandRequested();
        }
        opts.onKeyDown(e);
      }}
    >
      ${(() => {
        const CLOSE_THRESHOLD = 0.15;
        let prevBelow = false;
        return displayNodes.map((node, i) => {
          const isAfterEllipsis = hiddenCount > 0 && i === SHOW_FIRST;
          const tooltipParts = [node.label];
          if (node.actor) tooltipParts.push(`Actor: ${node.actor}`);
          if (node.timestamp) tooltipParts.push(formatTimestamp(node.timestamp));
          if (node.status !== 'completed') tooltipParts.push(`Status: ${node.status}`);
          const tooltip = tooltipParts.join(' · ');
          const time = node.timestamp ? formatTimestamp(node.timestamp) : '';
          const weight = weights[i] ?? 1;
          const flexStyle = weight > 0 ? `flex: ${weight}` : 'flex: 0 0 auto';

          const close = i > 0 && weight < CLOSE_THRESHOLD;
          const above = close && prevBelow;
          prevBelow = !above;

          return html`
            ${isAfterEllipsis ? html`<div class="ellipsis-spacer" style="flex: ${ellipsisWeight}"><span class="ellipsis">+${hiddenCount}</span></div>` : ''}
            <div class="compact-event" data-tooltip="${tooltip}" style="${flexStyle}">
              <span class="compact-label-above">${above ? node.label : ''}</span>
              <span class="compact-time-above">${above && time ? time : ''}</span>
              <div class="event-dot status-${node.status}" aria-hidden="true"></div>
              <span class="compact-label-below">${!above ? node.label : ''}</span>
              <span class="compact-time-below">${!above && time ? time : ''}</span>
            </div>
          `;
        });
      })()}
    </div>
  `;
}

export const compactTimelineStyles = css`
  .compact-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 28px 12px;
    background: var(--pages-neutral-2, #f9fafb);
    border-radius: 8px;
    cursor: pointer;
    position: relative;
    min-height: 24px;
    outline: none;
  }

  .compact-strip::before {
    content: '';
    position: absolute;
    left: 16px;
    right: 16px;
    top: 50%;
    height: 2px;
    background: var(--pages-neutral-5, #e5e7eb);
    z-index: 0;
  }

  .compact-strip:hover { background: var(--pages-neutral-3, #f3f4f6); }
  .compact-strip:focus { outline: 2px solid var(--pages-accent-8, #1d4ed8); outline-offset: 2px; }

  .compact-event {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    position: relative;
  }

  .compact-label-above {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    white-space: nowrap;
    max-width: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 9px;
    color: var(--pages-neutral-9, #6b7280);
  }

  .compact-time-above {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    white-space: nowrap;
    font-size: 8px;
    color: var(--pages-neutral-8, #9ca3af);
    display: none;
  }

  .compact-label-below {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    white-space: nowrap;
    max-width: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 9px;
    color: var(--pages-neutral-9, #6b7280);
  }

  .compact-time-below {
    position: absolute;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    white-space: nowrap;
    font-size: 8px;
    color: var(--pages-neutral-8, #9ca3af);
  }

  .compact-event[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 36px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    background: var(--pages-neutral-12, #111);
    color: white;
    font-size: 11px;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 10;
    pointer-events: none;
  }

  .event-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--pages-neutral-7, #9ca3af);
    flex-shrink: 0;
    z-index: 1;
  }

  .event-dot.status-completed { background: var(--pages-success-9, #16a34a); }
  .event-dot.status-active { background: var(--pages-accent-9, #2563eb); }
  .event-dot.status-pending { background: var(--pages-neutral-7, #9ca3af); }
  .event-dot.status-failed { background: var(--pages-danger-9, #dc2626); }
  .event-dot.status-skipped { background: var(--pages-neutral-5, #d1d5db); }

  .ellipsis-spacer {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ellipsis {
    position: relative;
    top: 18px;
    font-size: 10px;
    font-weight: 500;
    color: var(--pages-neutral-8, #9ca3af);
    padding: 2px 6px;
    background: var(--pages-neutral-3, #f3f4f6);
    border-radius: 8px;
    z-index: 1;
    flex-shrink: 0;
  }
`;
