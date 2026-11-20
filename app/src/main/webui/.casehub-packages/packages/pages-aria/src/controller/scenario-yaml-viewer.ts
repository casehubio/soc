import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { EventConnection } from '@casehubio/pages-data';
import { ScenarioConnectionController, type ScenarioState } from './scenario-connection-controller.js';
import { tokenizeYamlLine, buildStepLineMap, type LineRange } from './yaml-highlighter.js';

export class PagesScenarioYamlViewer extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui, sans-serif);
      font-size: var(--pages-font-size-sm, 12px);
      position: fixed;
      bottom: 16px;
      right: 320px;
      z-index: 10001;
    }
    .viewer-card {
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border-radius: var(--pages-radius-lg, 8px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      color: #e2e8f0;
      width: 360px;
      height: 50vh;
      min-width: 240px;
      min-height: 200px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      resize: both;
    }
    .viewer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      cursor: grab;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      gap: 8px;
    }
    .viewer-header:active { cursor: grabbing; }
    .viewer-title {
      color: #94a3b8;
      font-size: 12px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .viewer-header button {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 14px;
      padding: 0 2px;
      line-height: 1;
    }
    .viewer-header button:hover { color: #e2e8f0; }
    .viewer-body {
      overflow-y: auto;
      flex: 1;
      padding: 8px 0;
    }
    .yaml-empty {
      padding: 16px;
      color: #64748b;
      font-style: italic;
      text-align: center;
    }
    .yaml-line {
      padding: 0 12px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      display: flex;
    }
    .yaml-line.active {
      background: rgba(56, 189, 248, 0.12);
      border-left: 2px solid #38bdf8;
      padding-left: 10px;
    }
    .line-num {
      color: #475569;
      min-width: 28px;
      text-align: right;
      padding-right: 8px;
      user-select: none;
      flex-shrink: 0;
    }
    .yaml-key { color: #7dd3fc; }
    .yaml-string { color: #86efac; }
    .yaml-comment { color: #64748b; font-style: italic; }
    .yaml-literal { color: #fbbf24; }
    .yaml-punct { color: #94a3b8; }
    .yaml-plain { color: #e2e8f0; }

    .tab-bar {
      display: flex;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .tab-btn {
      flex: 1;
      padding: 6px 12px;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab-btn:hover { color: #e2e8f0; }
    .tab-btn.active { color: #38bdf8; border-bottom-color: #38bdf8; }
    .guide-empty {
      padding: 16px;
      color: #64748b;
      font-style: italic;
      text-align: center;
    }
    .guide-content {
      padding: 12px 16px;
      max-width: 100%;
      line-height: 1.6;
      font-size: 13px;
      color: #e2e8f0;
    }
    .guide-content h1 { font-size: 1.4em; margin: 0.5em 0; font-weight: 600; }
    .guide-content h2 { font-size: 1.2em; margin: 0.5em 0; font-weight: 600; }
    .guide-content h3 { font-size: 1.05em; margin: 0.5em 0; font-weight: 600; }
    .guide-content p { margin: 0.5em 0; }
    .guide-content strong { font-weight: 600; }
    .guide-content em { font-style: italic; }
    .guide-content code {
      background: rgba(255,255,255,0.08);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'SF Mono', monospace;
      font-size: 0.9em;
    }
    .guide-content ul { margin: 0.5em 0; padding-left: 1.5em; }
    .guide-content li { margin: 0.25em 0; }

    :host([mode="standalone"]) {
      position: static;
      width: 100%;
      height: 100%;
    }
    :host([mode="standalone"]) .viewer-card {
      width: 100%;
      height: 100%;
      max-height: none;
      border-radius: 0;
      box-shadow: none;
      resize: none;
    }
  `;

  @property({ attribute: false }) connection?: EventConnection;
  @property({ attribute: false }) eventTarget?: EventTarget;
  @property({ attribute: 'baseurl' }) baseUrl?: string;
  @property() scenario?: string;
  @property({ reflect: true }) mode: 'floating' | 'standalone' = 'floating';

  @state() private _yamlSource = '';
  @state() private _activeStep: string | null = null;
  @state() private _activeTab: 'source' | 'guide' = 'source';
  @state() private _guideContent: { type?: string; markdown?: string; path?: string; section?: string } | null = null;

  private _conn!: ScenarioConnectionController;
  private _stepMap = new Map<string, LineRange>();
  private _dragOffset = { x: 0, y: 0 };
  private _boundTarget: EventTarget | null = null;

  onClose?: () => void;
  onDetach?: () => void;
  onDragMove?: (left: number, top: number) => void;
  onDragEnd?: () => void;
  onResize?: () => void;

  private _resizeObserver?: ResizeObserver;

  private _onNarrative = (e: Event): void => {
    this._guideContent = (e as CustomEvent).detail as typeof this._guideContent;
  };

  protected override firstUpdated(): void {
    this._conn = new ScenarioConnectionController(this, {
      connection: this.connection,
      eventTarget: this.eventTarget,
      baseUrl: this.baseUrl,
      onState: (s: ScenarioState) => { this._onStateChange(s); },
    });
    if (this.scenario) void this._fetchYaml();
    this._bindGuideEvents(this.eventTarget);
    const card = this.shadowRoot?.querySelector('.viewer-card');
    if (card && typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this.onResize?.());
      this._resizeObserver.observe(card);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._bindGuideEvents(null);
    this._resizeObserver?.disconnect();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('scenario') && this.scenario) void this._fetchYaml();
    if (changed.has('eventTarget')) this._bindGuideEvents(this.eventTarget);
  }

  private _bindGuideEvents(target: EventTarget | undefined | null): void {
    if (this._boundTarget) {
      this._boundTarget.removeEventListener('scenario-narrative', this._onNarrative);
      this._boundTarget = null;
    }
    if (target) {
      target.addEventListener('scenario-narrative', this._onNarrative);
      this._boundTarget = target;
      const last = (target as any).__lastNarrativeContent;
      if (last && !this._guideContent) this._guideContent = last;
    }
  }

  private _onStateChange(s: ScenarioState): void {
    this._activeStep = s.step;
    if (s.scenario && !this._yamlSource && this.scenario) void this._fetchYaml();
    this.requestUpdate();
    this._scrollToActive();
  }

  private async _fetchYaml(): Promise<void> {
    if (!this.scenario) return;
    try {
      const base = this._conn?.restBase ?? this.baseUrl ?? '';
      const resp = await fetch(`${base}/scenarios/${this.scenario}.yaml`);
      if (resp.ok) {
        this._yamlSource = await resp.text();
        this._stepMap = buildStepLineMap(this._yamlSource);
      }
    } catch { /* retry on next state change */ }
  }

  private _scrollToActive(): void {
    if (!this._activeStep) return;
    const range = this._stepMap.get(this._activeStep);
    if (!range) return;
    requestAnimationFrame(() => {
      const activeLine = this.shadowRoot?.querySelector('.yaml-line.active');
      if (activeLine) {
        activeLine.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  }

  private _getActiveRange(): LineRange | null {
    if (!this._activeStep) return null;
    return this._stepMap.get(this._activeStep) ?? null;
  }

  override render(): TemplateResult {
    return html`
      <div class="viewer-card">
        ${this._renderHeader()}
        <div class="tab-bar">
          <button class="tab-btn ${this._activeTab === 'source' ? 'active' : ''}"
                  @click=${() => { this._activeTab = 'source'; }}>Source</button>
          <button class="tab-btn ${this._activeTab === 'guide' ? 'active' : ''}"
                  @click=${() => { this._activeTab = 'guide'; }}>Guide</button>
        </div>
        <div class="viewer-body">
          ${this._activeTab === 'source'
            ? (this._yamlSource
                ? this._renderYaml()
                : html`<div class="yaml-empty">No scenario source loaded</div>`)
            : this._renderGuide()}
        </div>
      </div>
    `;
  }

  private _renderHeader(): TemplateResult {
    return html`
      <div class="viewer-header" @pointerdown=${this._onDragStart}>
        <span class="viewer-title">${this.scenario ?? 'YAML Source'}</span>
        <button aria-label="Detach to window" @click=${() => this.onDetach?.()}>⧉</button>
        <button aria-label="Close" @click=${() => this.onClose?.()}>✕</button>
      </div>
    `;
  }

  private _renderYaml(): TemplateResult {
    const lines = this._yamlSource.split('\n');
    const activeRange = this._getActiveRange();

    return html`${lines.map((line, i) => {
      const lineNum = i + 1;
      const isActive = activeRange != null
        && lineNum >= activeRange.startLine
        && lineNum <= activeRange.endLine;
      const tokens = tokenizeYamlLine(line);

      return html`
        <div class="yaml-line ${isActive ? 'active' : ''}">
          <span class="line-num">${lineNum}</span>
          <span>${tokens.map(t =>
            html`<span class="yaml-${t.type}">${t.text}</span>`
          )}</span>
        </div>
      `;
    })}`;
  }

  private _renderGuide(): TemplateResult {
    if (!this._guideContent) {
      return html`<div class="guide-empty">No guide content</div>`;
    }
    const md = this._guideContent.markdown ?? '';
    const rendered = this._guideContent.section
      ? this._extractSection(md, this._guideContent.section)
      : md;
    return this._renderGuideMarkdown(rendered);
  }

  private _extractSection(markdown: string, section: string): string {
    const lines = markdown.split('\n');
    let capturing = false;
    let level = 0;
    const result: string[] = [];
    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        const headingLevel = headingMatch[1].length;
        const headingText = headingMatch[2].trim();
        if (capturing && headingLevel <= level) break;
        if (headingText.toLowerCase() === section.toLowerCase()) {
          capturing = true;
          level = headingLevel;
          continue;
        }
      }
      if (capturing) result.push(line);
    }
    return result.join('\n').trim();
  }

  private _renderGuideMarkdown(md: string): TemplateResult {
    const escaped = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const rendered = escaped
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hulo])(.+)$/gm, '<p>$1</p>');
    const container = document.createElement('div');
    container.className = 'guide-content';
    container.innerHTML = rendered;
    return html`${container}`;
  }

  private _onDragStart = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    const host = this.getBoundingClientRect();
    this._dragOffset = { x: e.clientX - host.left, y: e.clientY - host.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).addEventListener('pointermove', this._onDragMove);
    (e.currentTarget as HTMLElement).addEventListener('pointerup', this._onDragEnd);
  };

  private _onDragMove = (e: PointerEvent): void => {
    const left = e.clientX - this._dragOffset.x;
    const top = e.clientY - this._dragOffset.y;
    this.style.left = `${left}px`;
    this.style.top = `${top}px`;
    this.style.right = 'auto';
    this.style.bottom = 'auto';
    this.onDragMove?.(left, top);
  };

  private _onDragEnd = (e: PointerEvent): void => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).removeEventListener('pointermove', this._onDragMove);
    (e.currentTarget as HTMLElement).removeEventListener('pointerup', this._onDragEnd);
    this.onDragEnd?.();
  };

  setPosition(left: number, top: number): void {
    this.style.left = `${left}px`;
    this.style.top = `${top}px`;
    this.style.right = 'auto';
    this.style.bottom = 'auto';
  }
}

if (!customElements.get('pages-scenario-yaml-viewer')) {
  customElements.define('pages-scenario-yaml-viewer', PagesScenarioYamlViewer);
}
