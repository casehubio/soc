import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { customElement, property, state } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import type { CaseRuntimeState } from '@casehubio/mosaic-graph-stencil-case';
import { DIAGRAM_TAGS } from '@casehubio/mosaic-core';

import '@casehubio/mosaic-casehub-diagram';
import '@casehubio/mosaic-swf-diagram';
import '@casehubio/mosaic-htn-diagram';

interface DrillDownLevel {
  name: string;
  yaml: string;
  diagramType: string;
}

export interface DiagramWorkbenchProps {
  yaml: string;
  src: string;
  runtimeState: CaseRuntimeState | null;
}

@customElement('agency-diagram-workbench')
export class DiagramWorkbench extends LitElement {
  @property() yaml = '';
  @property() src = '';
  @property({ attribute: false }) runtimeState: CaseRuntimeState | null = null;

  @state() private _stack: DrillDownLevel[] = [];

  private _unsubs: Array<() => void> = [];

  static override styles = css`
    :host { display: flex; height: 100%; font-family: var(--pages-font-family, system-ui); }
    .workbench-row { display: flex; flex: 1; height: 100%; min-width: 0; }
    .collapsed-strip {
      width: 36px; min-width: 36px; height: 100%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      border-right: 1px solid var(--pages-border-color, #333);
      background: var(--pages-neutral-3, #2a2a2a);
      transition: background 0.15s;
    }
    .collapsed-strip:hover { background: var(--pages-neutral-4, #3a3a3a); }
    .collapsed-strip span {
      writing-mode: vertical-rl; text-orientation: mixed;
      transform: rotate(180deg);
      font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
      color: var(--pages-text-secondary, #999);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-height: calc(100% - 16px);
    }
    .active-panel { flex: 1; height: 100%; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
    casehub-diagram, swf-diagram { width: 100%; height: 100%; }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Diagram workbench');
    this._unsubs.push(
      onPagesEvent(this, 'diagram:drill-down:resolved', (payload: unknown) => {
        const p = payload as { name: string; yaml: string; diagramType: string };
        this._stack = [...this._stack, { name: p.name, yaml: p.yaml, diagramType: p.diagramType }];
      }),
    );
  }

  override disconnectedCallback(): void {
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
    super.disconnectedCallback();
  }

  configure(props: Partial<DiagramWorkbenchProps>): void {
    if (props.yaml !== undefined) this.yaml = props.yaml;
    if (props.src !== undefined) this.src = props.src;
  }

  private _prevStackLength = 0;

  override updated(changed: Map<string, unknown>): void {
    if (this._stack.length !== this._prevStackLength) {
      this._prevStackLength = this._stack.length;
      requestAnimationFrame(() => {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
      });
    }
  }

  private _expandLevel(index: number): void {
    this._stack = this._stack.slice(0, index);
  }

  private _renderDiagram(level: DrillDownLevel): TemplateResult | typeof nothing {
    const tag = DIAGRAM_TAGS[level.diagramType];
    if (!tag) {
      return html`<div style="padding:16px; color:var(--pages-text-tertiary,#999);">Unknown diagram type: ${level.diagramType}</div>`;
    }
    const tagLiteral = unsafeStatic(tag);
    return staticHtml`
      <${tagLiteral}
        .yaml=${level.yaml}
        layout-direction="RIGHT">
      </${tagLiteral}>
    `;
  }

  override render(): TemplateResult {
    const rootLevel: DrillDownLevel = {
      name: 'Case Definition',
      yaml: this.yaml,
      diagramType: 'case',
    };

    const allLevels = [rootLevel, ...this._stack];
    const activeIndex = allLevels.length - 1;

    return html`
      <div class="workbench-row">
        ${allLevels.map((level, i) =>
          i < activeIndex
            ? html`
              <div class="collapsed-strip"
                title="${level.name} — click to expand"
                @click=${() => this._expandLevel(i)}>
                <span>${level.name}</span>
              </div>`
            : html`
              <div class="active-panel">
                ${level === rootLevel
                  ? html`<casehub-diagram
                      .yaml=${this.yaml}
                      .src=${this.src}
                      .runtimeState=${this.runtimeState}
                    ></casehub-diagram>`
                  : this._renderDiagram(level)}
              </div>`
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-diagram-workbench': DiagramWorkbench;
  }
}
