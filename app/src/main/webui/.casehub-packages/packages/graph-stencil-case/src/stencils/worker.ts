import { html, nothing } from 'lit-html';
import type { StencilGrammar, GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { StencilTemplate } from '@casehubio/graph-renderer';
import { emitPagesEvent } from '@casehubio/pages-data';
import { getThumbnailRenderer } from '../thumbnail-registry.js';
import { detectFunctionType } from '../worker-function/detect.js';
import type { WorkerFunctionType } from '../worker-function/types.js';

const BADGE_CONFIG: Record<WorkerFunctionType, { label: string; bg: string; fg: string }> = {
  agent:    { label: 'agent', bg: '#7c3aed', fg: '#fff' },
  flow:     { label: 'flow',  bg: '#2563eb', fg: '#fff' },
  a2a:      { label: 'a2a',   bg: '#0d9488', fg: '#fff' },
  mcp:      { label: 'mcp',   bg: '#ea580c', fg: '#fff' },
  sequence: { label: 'seq',   bg: '#6b7280', fg: '#fff' },
  external: { label: 'ext',   bg: '#d1d5db', fg: '#374151' },
  unknown:  { label: '?',     bg: '#fbbf24', fg: '#374151' },
};

export const workerGrammar: StencilGrammar = {
  type: 'worker',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['binding'] },
    outbound: { min: 0, max: Infinity, allowedTo: ['binding'] },
  },
};

export function renderWorker(node: GraphNode, _decoration?: NodeDecoration): StencilTemplate {
  const data = node.properties;
  const name = String(data['name'] ?? '');
  const caps = (data['capabilities'] as string[] | undefined) ?? [];
  const desc = data['description'] ? String(data['description']).slice(0, 60) : '';
  const doBlock = data['do'];
  const definitionRef = data['definitionRef'] as string | undefined;
  const hasDrillDown = doBlock || definitionRef;
  const hasThumbnail = doBlock && getThumbnailRenderer('swf');
  const fnType = detectFunctionType(data as Record<string, unknown>);
  const badge = BADGE_CONFIG[fnType];

  return html`
    <div style="padding: 10px 14px; border: 2px solid var(--pages-neutral-7, #6b7280); background: var(--pages-neutral-2, #f5f5f5); min-width: 200px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; border-radius: 4px; position: relative; z-index: 5;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="font-weight: 700; color: var(--pages-neutral-12, #111); flex: 1;">${name}</div>
        <span style="font-size: 10px; padding: 2px 6px; border-radius: 3px; background: ${badge.bg}; color: ${badge.fg}; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase;">${badge.label}</span>
        ${hasDrillDown ? html`
          <button
            style="border: none; background: none; cursor: pointer; font-size: 13px; color: var(--pages-accent-9, #2563eb); padding: 2px 4px; position: relative; z-index: 10;"
            title="Drill down"
            @click=${(e: Event) => { e.stopPropagation(); emitDrillDown(e.target as HTMLElement, node.id, name, doBlock, definitionRef); }}
          >⤢</button>
        ` : nothing}
      </div>
      <div style="color: var(--pages-neutral-9, #666); font-size: 12px;">${caps.join(', ')}</div>
      ${desc ? html`<div style="color: var(--pages-neutral-8, #888); font-size: 11px; margin-top: 3px;">${desc}</div>` : nothing}
      ${hasThumbnail ? html`
        <worker-thumbnail
          style="display: block; margin-top: 6px; overflow: hidden; pointer-events: none; border: 1px solid var(--pages-border-color, #ddd); border-radius: 4px; background: transparent;"
          .doBlock=${doBlock}
          .workerId=${node.id}
        ></worker-thumbnail>
      ` : nothing}
    </div>
  `;
}

function emitDrillDown(
  target: HTMLElement,
  workerId: string,
  workerName: string,
  doBlock: unknown | undefined,
  definitionRef: string | undefined,
): void {
  emitPagesEvent(target, 'diagram:drill-down', {
    nodeId: workerId,
    nodeName: workerName,
    definitionRef,
    doBlock,
  });
}

// Guard: WorkerThumbnail requires browser globals (HTMLElement, customElements)
const _HTMLElement = typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as typeof HTMLElement);

class WorkerThumbnail extends _HTMLElement {
  private _rendered = false;
  private _expanded = false;
  doBlock: unknown;
  workerId = '';

  connectedCallback(): void {
    if (this._rendered) return;
    this._rendered = true;
    this._updateSize();
    const renderer = getThumbnailRenderer('swf');
    if (!renderer) return;
    try {
      renderer(this.doBlock, this);
      this._addChevron();
    } catch {
      // Graceful degradation — worker renders without thumbnail
    }
  }

  private _updateSize(): void {
    this.style.width = this._expanded ? '300px' : '180px';
    this.style.height = this._expanded ? '200px' : '100px';
  }

  private _addChevron(): void {
    const btn = document.createElement('button');
    btn.textContent = '▾';
    btn.title = 'Toggle expand';
    btn.style.cssText = 'position: absolute; top: 2px; right: 2px; border: none; background: rgba(255,255,255,0.8); cursor: pointer; font-size: 10px; padding: 0 3px; border-radius: 2px; pointer-events: auto; line-height: 1;';
    this.style.position = 'relative';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._expanded = !this._expanded;
      btn.textContent = this._expanded ? '▴' : '▾';
      this._updateSize();
      const renderer = getThumbnailRenderer('swf');
      if (renderer) {
        try { renderer(this.doBlock, this); } catch { /* ignore */ }
        this.appendChild(btn);
      }
      this.dispatchEvent(new CustomEvent('worker-expand-toggle', {
        bubbles: true, composed: true,
        detail: { workerId: this.workerId, expanded: this._expanded },
      }));
    });
    this.appendChild(btn);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('worker-thumbnail')) {
  customElements.define('worker-thumbnail', WorkerThumbnail);
}
