import { html, nothing, css } from 'lit';
import type { TemplateResult } from 'lit';
import type { EventTimelineNode } from '../../event-timeline-types.js';
import { renderPropertyTree, propertyTreeStyles } from '@casehubio/pages-ui-components';

export interface VerticalTimelineOptions {
  expandedKeys: Set<string>;
  onNodeClick: (node: EventTimelineNode, index: number) => void;
  onToggleExpand: (key: string) => void;
  onKeyDown: (e: KeyboardEvent, index: number) => void;
  renderNode?: ((node: EventTimelineNode) => unknown) | undefined;
  renderDetail?: ((node: EventTimelineNode) => unknown) | undefined;
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

function defaultRenderDetail(node: EventTimelineNode): TemplateResult {
  return html`${renderPropertyTree(node.detail)}`;
}

export function renderVerticalTimeline(nodes: EventTimelineNode[], opts: VerticalTimelineOptions): TemplateResult {
  const resolveRenderDetail = opts.renderDetail ?? defaultRenderDetail;

  return html`
    <div class="timeline" role="list" aria-label="Timeline">
      ${nodes.map((node, index) => {
        const isExpanded = opts.expandedKeys.has(node.key);
        const relTime = node.timestamp ? getRelativeTime(node.timestamp) : '';
        const ariaLabel = `${node.label}${relTime ? `, ${relTime}` : ''}`;

        return html`
          <div
            class="timeline-node status-${node.status}"
            role="listitem"
            tabindex="0"
            aria-label="${ariaLabel}"
            @keydown=${(e: KeyboardEvent) => { opts.onKeyDown(e, index); }}
          >
            <div class="node-dot"></div>
            <div class="node-content">
              <div class="node-body" @click=${() => { opts.onNodeClick(node, index); }}>
                <div class="node-header">
                  ${opts.renderNode
                    ? html`${opts.renderNode(node)}`
                    : html`<span class="node-label">${node.label}</span>`}
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

export const verticalTimelineStyles = css`
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

  .timeline-node.status-completed .node-dot { background: var(--pages-success-9, #16a34a); }
  .timeline-node.status-active .node-dot { background: var(--pages-accent-9, #2563eb); }
  .timeline-node.status-pending .node-dot { background: var(--pages-neutral-7, #9ca3af); }
  .timeline-node.status-failed .node-dot { background: var(--pages-danger-9, #dc2626); }
  .timeline-node.status-skipped .node-dot { background: var(--pages-neutral-5, #d1d5db); }

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
