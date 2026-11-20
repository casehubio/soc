import { html, nothing, css } from 'lit';
import type { TemplateResult } from 'lit';
import type { TimelineNode } from '../types.js';
import { renderPropertyTree, propertyTreeStyles } from '@casehubio/blocks-ui-core';

export interface VerticalOptions {
  expandedKeys: Set<string>;
  onNodeClick: (node: TimelineNode, index: number) => void;
  onToggleExpand: (key: string) => void;
  onKeyDown: (e: KeyboardEvent, index: number) => void;
  renderNode?: ((node: TimelineNode) => TemplateResult) | undefined;
  renderDetail?: ((node: TimelineNode) => TemplateResult) | undefined;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

function getRelativeTime(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  } catch {
    return '';
  }
}

function defaultRenderNodeIndicator(_node: TimelineNode): TemplateResult | undefined {
  return undefined;
}

function defaultRenderDetail(node: TimelineNode): TemplateResult {
  return html`${renderPropertyTree(node.detail)}`;
}

export function renderVertical(nodes: TimelineNode[], opts: VerticalOptions): TemplateResult {
  const resolveRenderNodeIndicator = opts.renderNode ?? defaultRenderNodeIndicator;
  const resolveRenderDetail = opts.renderDetail ?? defaultRenderDetail;

  return html`
    <div class="timeline" role="list" aria-label="Timeline">
      ${nodes.map((node, index) => {
        const category = node.category ?? 'lifecycle';
        const isExpanded = opts.expandedKeys.has(node.key);
        const relTime = node.timestamp ? getRelativeTime(node.timestamp) : '';
        const ariaLabel = `${node.label}${relTime ? `, ${relTime}` : ''}`;

        return html`
          <div
            class="timeline-node ${category}"
            role="listitem"
            tabindex="0"
            aria-label="${ariaLabel}"
            @keydown=${(e: KeyboardEvent) => opts.onKeyDown(e, index)}
          >
            <div class="node-dot"></div>
            <div class="node-content">
              <div class="node-body" @click=${() => opts.onNodeClick(node, index)}>
                <div class="node-header">
                  ${opts.renderNode
                    ? html`${resolveRenderNodeIndicator(node)}<span class="node-label">${node.label}</span>`
                    : html`<span class="event-type-badge ${category}">${node.label}</span>`}
                  ${node.timestamp ? html`<span class="timestamp">${formatTimestamp(node.timestamp)}</span>` : nothing}
                </div>
                ${node.actor ? html`<div class="worker-info">Worker: ${node.actor}</div>` : nothing}
              </div>
              ${node.detail != null ? html`
                <button
                  class="expand-button"
                  aria-expanded="${isExpanded}"
                  @click=${(e: Event) => { e.stopPropagation(); opts.onToggleExpand(node.key); }}
                >
                  ${isExpanded ? '▼' : '▶'} Details
                </button>
                ${isExpanded ? html`
                  <div class="payload-detail" role="region">
                    ${resolveRenderDetail(node)}
                  </div>
                ` : nothing}
              ` : nothing}
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

export const verticalStyles = css`
  .timeline {
    position: relative;
    padding-left: 40px;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--pages-neutral-5, #e5e7eb);
  }

  .timeline-node {
    position: relative;
    margin-bottom: 24px;
    outline: none;
  }

  .timeline-node:focus {
    outline: 2px solid var(--pages-accent-8, #1d4ed8);
    outline-offset: 4px;
    border-radius: 8px;
  }

  .node-dot {
    position: absolute;
    left: -34px;
    top: 12px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--pages-neutral-7, #9ca3af);
    border: 2px solid var(--pages-neutral-1, #fff);
    z-index: 1;
  }

  .timeline-node.lifecycle .node-dot,
  .timeline-node.CASE .node-dot { width: 16px; height: 16px; top: 10px; left: -36px; background: var(--pages-success-9, #16a34a); }
  .timeline-node.milestone .node-dot { transform: rotate(45deg); background: var(--pages-accent-9, #2563eb); }
  .timeline-node.task .node-dot,
  .timeline-node.WORKER .node-dot { background: var(--pages-warning-9, #f59e0b); }
  .timeline-node.agent .node-dot { background: var(--pages-purple-9, #9333ea); }
  .timeline-node.action-gate .node-dot { background: var(--pages-error-9, #dc2626); }
  .timeline-node.orchestration .node-dot,
  .timeline-node.ORCHESTRATION .node-dot { background: var(--pages-neutral-9, #6b7280); }
  .timeline-node.timer .node-dot,
  .timeline-node.TIMER .node-dot { background: var(--pages-warning-7, #d97706); }
  .timeline-node.SYSTEM .node-dot { background: var(--pages-neutral-8, #a1a1aa); }

  .node-content {
    background: var(--pages-neutral-1, #fff);
    border: 1px solid var(--pages-neutral-5, #e5e7eb);
    border-radius: 8px;
    padding: 12px;
  }

  .node-body { cursor: pointer; }

  .node-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .node-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--pages-neutral-12, #111);
  }

  .event-type-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .event-type-badge.lifecycle { background: var(--pages-success-3, #dcfce7); color: var(--pages-success-11, #166534); }
  .event-type-badge.task { background: var(--pages-warning-3, #fef3c7); color: var(--pages-warning-11, #92400e); }
  .event-type-badge.agent { background: var(--pages-purple-3, #f3e8ff); color: var(--pages-purple-11, #581c87); }
  .event-type-badge.milestone { background: var(--pages-accent-3, #dbeafe); color: var(--pages-accent-11, #1e3a5f); }
  .event-type-badge.action-gate { background: var(--pages-error-3, #fee2e2); color: var(--pages-error-11, #991b1b); }
  .event-type-badge.orchestration { background: var(--pages-neutral-3, #f3f4f6); color: var(--pages-neutral-11, #374151); }
  .event-type-badge.timer { background: var(--pages-warning-3, #fef3c7); color: var(--pages-warning-11, #92400e); }

  .timestamp { font-size: 13px; color: var(--pages-neutral-9, #6b7280); }
  .worker-info { font-size: 13px; color: var(--pages-neutral-9, #6b7280); margin-top: 4px; }

  .expand-button {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    background: none;
    border: 1px solid var(--pages-neutral-5, #e5e7eb);
    border-radius: 4px;
    color: var(--pages-neutral-11, #374151);
  }

  .expand-button:hover { background: var(--pages-neutral-2, #f9fafb); }

  .payload-detail {
    margin-top: 12px;
    padding: 12px;
    background: var(--pages-neutral-2, #f9fafb);
    border-radius: 4px;
    font-size: 13px;
  }

  ${propertyTreeStyles}
`;
