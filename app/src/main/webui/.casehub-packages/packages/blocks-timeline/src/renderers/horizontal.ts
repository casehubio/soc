import { html, nothing, css } from 'lit';
import type { TemplateResult } from 'lit';
import type { TimelineNode } from '../types.js';

export interface HorizontalOptions {
  onNodeClick: (node: TimelineNode, index: number) => void;
  onKeyDown: (e: KeyboardEvent, index: number) => void;
  renderNode?: ((node: TimelineNode) => TemplateResult) | undefined;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return ts;
  }
}

function defaultRenderNode(node: TimelineNode, index: number): TemplateResult {
  return html`
    <div class="stage-node stage-node--${node.status}">${index + 1}</div>
  `;
}

export function renderHorizontal(nodes: TimelineNode[], opts: HorizontalOptions): TemplateResult {
  return html`
    <div class="pipeline" role="list" aria-label="Timeline progression" aria-orientation="horizontal">
      ${nodes.map((node, i) => html`
        ${i > 0 ? html`<div class="connector ${node.status === 'completed' || node.status === 'active' ? 'connector--completed' : ''}"></div>` : nothing}
        <div
          class="stage"
          role="listitem"
          tabindex="0"
          aria-label="${node.label}: ${node.status}"
          @click=${() => opts.onNodeClick(node, i)}
          @keydown=${(e: KeyboardEvent) => opts.onKeyDown(e, i)}
        >
          ${opts.renderNode ? opts.renderNode(node) : defaultRenderNode(node, i)}
          <div class="stage-label">${node.label}</div>
          ${node.actor ? html`<div class="stage-actor">${node.actor}</div>` : nothing}
          ${node.timestamp ? html`<div class="stage-time">${formatTimestamp(node.timestamp)}</div>` : nothing}
        </div>
      `)}
    </div>
  `;
}

export const horizontalStyles = css`
  .pipeline {
    display: flex;
    align-items: flex-start;
    gap: var(--pages-space-4, 1rem);
    padding: var(--pages-space-4, 1rem) 0;
    overflow-x: auto;
  }

  .stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--pages-space-2, 0.5rem);
    min-width: 100px;
    cursor: pointer;
    outline: none;
  }

  .stage:focus {
    outline: 2px solid var(--pages-accent-8, #1d4ed8);
    outline-offset: 4px;
    border-radius: 8px;
  }

  .stage-node {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    transition: background-color 0.3s, transform 0.2s;
  }

  .stage-node--completed { background: var(--pages-success-9, #16a34a); color: white; }
  .stage-node--active { background: var(--pages-accent-9, #2563eb); color: white; animation: pulse 2s infinite; }
  .stage-node--pending { background: var(--pages-neutral-6, #d1d5db); color: white; }
  .stage-node--failed { background: var(--pages-error-9, #dc2626); color: white; }
  .stage-node--skipped { background: var(--pages-neutral-4, #e5e7eb); color: var(--pages-neutral-8, #9ca3af); }

  .stage-label { font-size: 12px; color: var(--pages-neutral-11, #374151); text-align: center; }
  .stage-actor { font-size: 11px; color: var(--pages-neutral-9, #6b7280); }
  .stage-time { font-size: 10px; color: var(--pages-neutral-8, #9ca3af); }

  .connector {
    flex: 1;
    height: 2px;
    margin-top: 17px;
    background: var(--pages-neutral-6, #d1d5db);
    min-width: 20px;
    transition: background-color 0.3s;
  }

  .connector--completed { background: var(--pages-success-9, #16a34a); }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
`;
