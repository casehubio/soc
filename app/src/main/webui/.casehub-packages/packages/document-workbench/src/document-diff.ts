import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import { marked } from 'marked';
import type { DiffSummary } from './types.js';

interface DiffChunk {
  op: string;
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
}

interface PanelState {
  path: string | null;
  content: string | null;
  label: string;
}

interface ScrollAnchor {
  a: number;
  b: number;
  [key: string]: number;
}

@customElement('document-diff')
export class DocumentDiff extends LitElement {
  @property({ type: String }) apiBaseUrl = '';

  private _panels: { a: PanelState; b: PanelState } = {
    a: { path: null, content: null, label: 'File A' },
    b: { path: null, content: null, label: 'File B' },
  };
  private _pathA: string | null = null;
  private _pathB: string | null = null;
  private _syncEnabled = true;
  private _viewMode: 'split' | 'unified' = 'split';
  private _syncing = false;
  private _dragging = false;
  private _lastChunks: DiffChunk[] = [];
  private _lastTotalA = 0;
  private _lastTotalB = 0;
  private _currentChunkIdx = -1;
  private _scrollAnchors: ScrollAnchor[] = [];
  private _resizeObserver: ResizeObserver | null = null;
  private _connected = false;
  private _pendingPathA: string | null = null;
  private _pendingPathB: string | null = null;
  private _cleanups: (() => void)[] = [];
  private _threadAnchors: Array<{
    threadId: string;
    side: string;
    startLine: number;
    endLine: number;
    status: string;
  }> = [];

  private _$(id: string): HTMLElement {
    return (this.renderRoot as ShadowRoot).getElementById(id)!;
  }

  static override styles = css`
    :host {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    .panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    #divider {
      width: 20px;
      background: var(--chrome, var(--pages-neutral-2, #f5f5f5));
      cursor: col-resize;
      flex-shrink: 0;
      position: relative;
      border-left: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-right: 1px solid var(--pages-neutral-5, #d4d4d4);
    }
    #diff-map {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }

    .panel-header {
      flex-shrink: 0;
      background: var(--chrome, var(--pages-neutral-2, #f5f5f5));
      border-bottom: 1px solid var(--pages-neutral-5, #d4d4d4);
      padding: 5px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .panel-label {
      font-weight: 700;
      font-size: 12px;
      color: var(--pages-neutral-12, #111);
      background: none;
      border: 1px solid transparent;
      border-radius: 2px;
      padding: 2px 6px;
      width: 56px;
      font-family: Georgia, serif;
      font-style: italic;
      transition: border-color .15s;
    }
    .panel-label:hover { border-color: var(--pages-neutral-4, #e5e7eb); }
    .panel-label:focus { outline: none; border-color: var(--pages-accent-9, #6366f1); background: var(--pages-neutral-1, #fafafa); }
    .panel-path {
      flex: 1;
      font-size: 10px;
      color: var(--pages-neutral-8, #9ca3af);
      font-family: 'SFMono-Regular', Consolas, monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .panel-path.loaded { color: var(--sepia, var(--pages-neutral-11, #6b7280)); }

    button {
      background: var(--chrome, var(--pages-neutral-2, #f5f5f5));
      color: var(--sepia, var(--pages-neutral-11, #6b7280));
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: 2px;
      padding: 5px 12px;
      cursor: pointer;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      transition: all .15s;
    }
    button:hover { background: var(--pages-neutral-1, #fafafa); border-color: var(--pages-neutral-8, #9ca3af); color: var(--pages-neutral-12, #111); }
    button:disabled { opacity: .35; cursor: default; }

    .panel-body {
      flex: 1;
      overflow: auto;
      position: relative;
    }

    .panel-empty {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: var(--pages-neutral-8, #9ca3af);
      text-align: center;
      padding: 40px;
      pointer-events: none;
    }
    .panel-empty.hidden { display: none; }
    .panel-empty-icon { font-size: 32px; opacity: .4; }
    .panel-empty-hint { font-size: 12px; line-height: 1.6; }

    .panel-body.drag-over { outline: 2px dashed var(--pages-accent-9, #6366f1); outline-offset: -4px; }

    .md-wrap {
      padding: 28px 36px;
      max-width: 820px;
      margin: 0 auto;
      line-height: 1.75;
      position: relative;
    }

    .section-highlight-bar {
      position: absolute;
      left: 8px;
      width: 3px;
      background: var(--pages-accent-9, #6366f1);
      border-radius: 2px;
      pointer-events: none;
    }
    .md-wrap h1, .md-wrap h2 {
      border-bottom: 1px solid var(--pages-neutral-5, #d4d4d4);
      padding-bottom: .3em;
      margin: 1.5em 0 .6em;
      color: var(--pages-neutral-12, #111);
    }
    .md-wrap h3, .md-wrap h4 { margin: 1.2em 0 .4em; color: var(--pages-accent-9, #6366f1); }
    .md-wrap p   { margin: .7em 0; color: var(--sepia, var(--pages-neutral-11, #6b7280)); }
    .md-wrap a   { color: var(--pages-accent-9, #6366f1); }
    .md-wrap code {
      background: var(--chrome, var(--pages-neutral-2, #f5f5f5));
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: 2px;
      padding: 2px 6px;
      font-size: .875em;
      color: var(--sepia, var(--pages-neutral-11, #6b7280));
    }
    .md-wrap pre {
      background: var(--chrome, var(--pages-neutral-2, #f5f5f5));
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: 2px;
      padding: 0;
      overflow-x: auto;
      margin: 1em 0;
    }
    .md-wrap pre code {
      background: none;
      border: none;
      padding: 16px;
      display: block;
      color: var(--pages-neutral-12, #111);
      font-size: .875em;
    }
    .md-wrap blockquote {
      border-left: 3px solid var(--pages-neutral-5, #d4d4d4);
      margin: 1em 0;
      padding: .5em 1em;
      color: var(--pages-neutral-8, #9ca3af);
    }
    .md-wrap ul, .md-wrap ol { margin: .7em 0 .7em 1.5em; }
    .md-wrap li  { margin: .3em 0; }
    .md-wrap img {
      max-width: 100%;
      border-radius: 2px;
      margin: 1em 0;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
    }
    .md-wrap table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    .md-wrap th, .md-wrap td { border: 1px solid var(--pages-neutral-5, #d4d4d4); padding: 6px 13px; }
    .md-wrap th  { background: var(--chrome, var(--pages-neutral-2, #f5f5f5)); }

    @keyframes scroll-flash {
      0%   { background: rgba(217, 164, 6, 0.35); }
      100% { background: transparent; }
    }
    .scroll-target {
      animation: scroll-flash 1.5s ease-out;
      border-radius: 2px;
    }

    .diff-del {
      border-top: 2px solid #ef4444;
      border-bottom: 2px solid #ef4444;
      background: rgba(239, 68, 68, 0.05);
    }
    .diff-ins {
      border-top: 2px solid #22c55e;
      border-bottom: 2px solid #22c55e;
      background: rgba(34, 197, 94, 0.05);
    }

    mark.diff-word-a { background: rgba(239,68,68,0.35); border-radius: 2px; padding: 0 1px; color: inherit; }
    mark.diff-word-b { background: rgba(34,197,94,0.35); border-radius: 2px; padding: 0 1px; color: inherit; }

    .diff-unified-del {
      border-left: 3px solid #ef4444;
      padding: 4px 12px 4px 28px;
      margin: 4px 0;
      background: rgba(239, 68, 68, 0.06);
      position: relative;
    }
    .diff-unified-ins {
      border-left: 3px solid #22c55e;
      padding: 4px 12px 4px 28px;
      margin: 4px 0;
      background: rgba(34, 197, 94, 0.06);
      position: relative;
    }
    .diff-unified-del::before {
      content: '−';
      position: absolute;
      left: 10px;
      top: 4px;
      color: #ef4444;
      font-weight: 700;
      font-size: 11px;
    }
    .diff-unified-ins::before {
      content: '+';
      position: absolute;
      left: 10px;
      top: 4px;
      color: #22c55e;
      font-weight: 700;
      font-size: 11px;
    }

    .thread-highlight-flash {
      animation: thread-flash 1.5s ease-out;
    }

    @keyframes thread-flash {
      0% { background: var(--pages-accent-3, #c7d2fe); }
      100% { background: transparent; }
    }
  `;

  override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = super.createRenderRoot();
    (root as ShadowRoot).innerHTML = `
      <div class="panel" id="panel-a">
        <div class="panel-header">
          <input class="panel-label" id="label-a" value="File A" title="Click to rename">
          <span class="panel-path" id="path-a">No file selected</span>
          <button id="choose-a">Choose…</button>
        </div>
        <div class="panel-body" id="body-a">
          <div class="panel-empty" id="empty-a">
            <div class="panel-empty-icon">📄</div>
            <div class="panel-empty-hint">Drop a .md file here<br>or click Choose…</div>
          </div>
          <div class="md-wrap" id="render-a"></div>
        </div>
      </div>
      <div id="divider"><canvas id="diff-map"></canvas></div>
      <div class="panel" id="panel-b">
        <div class="panel-header">
          <input class="panel-label" id="label-b" value="File B" title="Click to rename">
          <span class="panel-path" id="path-b">No file selected</span>
          <button id="choose-b">Choose…</button>
        </div>
        <div class="panel-body" id="body-b">
          <div class="panel-empty" id="empty-b">
            <div class="panel-empty-icon">📄</div>
            <div class="panel-empty-hint">Drop a .md file here<br>or click Choose…</div>
          </div>
          <div class="md-wrap" id="render-b"></div>
        </div>
      </div>
    `;
    return root;
  }

  configure(props: Record<string, unknown>): void {
    if (props.apiBaseUrl != null) this.apiBaseUrl = props.apiBaseUrl as string;
    if (props.labelA) this._panels.a.label = props.labelA as string;
    if (props.labelB) this._panels.b.label = props.labelB as string;
    if (this._connected) {
      this._syncPanelMeta('a');
      this._syncPanelMeta('b');
      if (props.pathA) this.loadFile('a', props.pathA as string);
      if (props.pathB) this.loadFile('b', props.pathB as string);
    } else {
      this._pendingPathA = (props.pathA as string) || null;
      this._pendingPathB = (props.pathB as string) || null;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Document diff');
    this._connected = true;

    this._$('choose-a').addEventListener('click', () => this.selectFile('a'));
    this._$('choose-b').addEventListener('click', () => this.selectFile('b'));

    this._cleanups.push(
      onPagesEvent<{ path: string }>(document, 'file-changed', (payload) => {
        if (this._pathA && payload.path === this._pathA) this.loadFile('a', payload.path);
        if (this._pathB && payload.path === this._pathB) this.loadFile('b', payload.path);
      }),
      onPagesEvent<{ threadId: string; anchor: any; createdBy: string }>(
        document, 'thread-created', (payload) => {
          if (payload.anchor && payload.anchor.side) {
            this._threadAnchors.push({
              threadId: payload.threadId,
              side: payload.anchor.side,
              startLine: payload.anchor.startLine,
              endLine: payload.anchor.endLine,
              status: 'OPEN',
            });
            this._renderThreadGutterMarkers();
          }
        },
      ),
      onPagesEvent<{ threadId: string }>(document, 'thread-resolved', (payload) => {
        const anchor = this._threadAnchors.find(a => a.threadId === payload.threadId);
        if (anchor) {
          anchor.status = 'RESOLVED';
          this._renderThreadGutterMarkers();
        }
      }),
    );

    const onThreadFocused = (e: Event) => {
      const { side, startLine } = (e as CustomEvent).detail;
      const panelKey = side === 'A' ? 'a' : 'b';
      const render = this._$(`render-${panelKey}`);
      if (!render) return;
      const children = [...render.children];
      if (startLine >= 0 && startLine < children.length) {
        children[startLine].scrollIntoView({ behavior: 'smooth', block: 'center' });
        children[startLine].classList.add('thread-highlight-flash');
        setTimeout(() => children[startLine].classList.remove('thread-highlight-flash'), 1500);
      }
    };
    document.addEventListener('thread-focused', onThreadFocused);
    this._cleanups.push(() => document.removeEventListener('thread-focused', onThreadFocused));

    for (const p of ['a', 'b'] as const) {
      this._$(`label-${p}`).addEventListener('input', () => {
        this._panels[p].label = (this._$(`label-${p}`) as HTMLInputElement).value;
      });
    }

    this._syncPanelMeta('a');
    this._syncPanelMeta('b');

    this._setupScrollSync();
    this._setupDropZone('a');
    this._setupDropZone('b');
    this._setupDividerDrag();

    this._resizeObserver = new ResizeObserver(() => this._updateDiffMap());
    this._resizeObserver.observe(this._$('divider'));

    this._$('diff-map').addEventListener('click', (e) => this._onDiffMapClick(e as MouseEvent));

    for (const side of ['a', 'b'] as const) {
      this._$(`render-${side}`).addEventListener('mouseup', () => {
        const sel = (this.renderRoot as any).getSelection
          ? (this.renderRoot as any).getSelection()
          : document.getSelection();
        if (!sel || sel.isCollapsed) return;
        const range = sel.getRangeAt(0);
        const render = this._$(`render-${side}`);
        if (!render.contains(range.startContainer)) return;
        const children = [...render.children];
        let startLine = 0, endLine = 0;
        for (let i = 0; i < children.length; i++) {
          if (children[i].contains(range.startContainer) ||
              children[i] === range.startContainer) startLine = i;
          if (children[i].contains(range.endContainer) ||
              children[i] === range.endContainer) endLine = i;
        }
        let reportedSide = side.toUpperCase();
        if (this._viewMode === 'unified') {
          let node: Node | null = range.startContainer;
          while (node && node !== render) {
            if ((node as Element).classList) {
              if ((node as Element).classList.contains('diff-unified-del')) { reportedSide = 'A'; break; }
              if ((node as Element).classList.contains('diff-unified-ins')) { reportedSide = 'B'; break; }
            }
            node = node.parentNode;
          }
        }
        this.dispatchEvent(new CustomEvent('selection-changed', {
          bubbles: true,
          detail: { side: reportedSide, startLine, endLine, selectedText: sel.toString() },
        }));
      });
    }

    const onTimelineChanged = async (e: Event) => {
      const { sessionId, indexA, indexB, labelA, labelB } = (e as CustomEvent).detail;
      try {
        const [contentA, contentB] = await Promise.all([
          fetch(`${this.apiBaseUrl}/api/debate/${sessionId}/snapshot/${indexA}`).then(r => r.ok ? r.text() : null),
          fetch(`${this.apiBaseUrl}/api/debate/${sessionId}/snapshot/${indexB}`).then(r => r.ok ? r.text() : null),
        ]);
        if (contentA != null) this.loadContent('a', contentA, labelA);
        if (contentB != null) this.loadContent('b', contentB, labelB);
      } catch (err) {
        console.error('Timeline snapshot fetch failed:', err);
      }
    };
    document.addEventListener('timeline-comparison-changed', onTimelineChanged);
    this._cleanups.push(() => document.removeEventListener('timeline-comparison-changed', onTimelineChanged));

    if (this._pendingPathA) this.loadFile('a', this._pendingPathA);
    if (this._pendingPathB) this.loadFile('b', this._pendingPathB);
    this._pendingPathA = null;
    this._pendingPathB = null;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._connected = false;
    this._cleanups.forEach(fn => fn());
    this._cleanups = [];
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  toggleSync(): boolean {
    this._syncEnabled = !this._syncEnabled;
    if (this._syncEnabled) {
      const bodyA = this._$('body-a'), bodyB = this._$('body-b');
      bodyB.scrollTop = this._scrollAnchors.length >= 2
        ? this._interp(bodyA.scrollTop, 'a', 'b')
        : this._scrollPercent(bodyA) * (bodyB.scrollHeight - bodyB.clientHeight);
    }
    return this._syncEnabled;
  }

  get syncEnabled(): boolean { return this._syncEnabled; }

  nextDiff(): DiffSummary {
    const idx = this._nonEqIndices();
    if (idx.length) {
      if (this._currentChunkIdx === -1) {
        this._currentChunkIdx = idx[0];
      } else if (this._chunkOutOfView(this._currentChunkIdx)) {
        const bodyA = this._$('body-a');
        const centre = bodyA.getBoundingClientRect().top + bodyA.clientHeight / 2;
        const found = idx.find(ci => {
          const el = this._$('render-a').querySelector(`[data-diff-chunk="${ci}"]`) ||
                     this._$('render-b').querySelector(`[data-diff-chunk="${ci}"]`);
          return el && el.getBoundingClientRect().top >= centre;
        });
        this._currentChunkIdx = found ?? idx[0];
      } else {
        const pos = idx.indexOf(this._currentChunkIdx);
        this._currentChunkIdx = idx[(pos + 1) % idx.length];
      }
      this._scrollToChunk(this._currentChunkIdx);
    }
    return this.getDiffSummary();
  }

  prevDiff(): DiffSummary {
    const idx = this._nonEqIndices();
    if (idx.length) {
      if (this._currentChunkIdx === -1) {
        this._currentChunkIdx = idx[idx.length - 1];
      } else if (this._chunkOutOfView(this._currentChunkIdx)) {
        const bodyA = this._$('body-a');
        const centre = bodyA.getBoundingClientRect().top + bodyA.clientHeight / 2;
        const found = [...idx].reverse().find(ci => {
          const el = this._$('render-a').querySelector(`[data-diff-chunk="${ci}"]`) ||
                     this._$('render-b').querySelector(`[data-diff-chunk="${ci}"]`);
          return el && el.getBoundingClientRect().bottom <= centre;
        });
        this._currentChunkIdx = found ?? idx[idx.length - 1];
      } else {
        const pos = idx.indexOf(this._currentChunkIdx);
        this._currentChunkIdx = idx[(pos - 1 + idx.length) % idx.length];
      }
      this._scrollToChunk(this._currentChunkIdx);
    }
    return this.getDiffSummary();
  }

  swapPanels(): void {
    if (!this._panels.a.path || !this._panels.b.path) return;
    [this._panels.a, this._panels.b] = [this._panels.b, this._panels.a];
    for (const p of ['a', 'b'] as const) {
      this._syncPanelMeta(p);
      this._syncPanelContent(p);
    }
    this._$('body-a').scrollTop = 0;
    this._$('body-b').scrollTop = 0;
    this._updateDiffMap();
  }

  getDiffSummary(): DiffSummary {
    const modified = this._lastChunks.filter(c => c.op === 'mod').length;
    const deleted = this._lastChunks.filter(c => c.op === 'del').length;
    const inserted = this._lastChunks.filter(c => c.op === 'ins').length;
    const idx = this._nonEqIndices();
    const pos = idx.indexOf(this._currentChunkIdx);
    return {
      modified, deleted, inserted,
      currentIdx: pos >= 0 ? pos : -1,
      totalDiffs: idx.length,
    };
  }

  scrollToLocation(location: string): void {
    if (!location) return;
    for (const side of ['a', 'b']) {
      const headings = [...this.renderRoot.querySelectorAll(
        `#render-${side} h1, #render-${side} h2, #render-${side} h3, #render-${side} h4`
      )] as HTMLElement[];
      const target = this._findHeading(headings, location);
      if (target) {
        const body = this._$(`body-${side}`);
        const delta = target.getBoundingClientRect().top - body.getBoundingClientRect().top - 24;
        body.scrollBy({ top: delta, behavior: 'instant' });
        target.classList.remove('scroll-target');
        void target.offsetWidth;
        target.classList.add('scroll-target');
        target.addEventListener('animationend', () => target.classList.remove('scroll-target'), { once: true });
      }
    }
  }

  highlightSection(location: string): void {
    this.clearHighlight();
    if (!location) return;
    for (const side of ['a', 'b']) {
      const wrap = this.renderRoot.querySelector(`#render-${side}`);
      if (!wrap) continue;
      const headings = [...wrap.querySelectorAll('h1, h2, h3, h4')] as HTMLElement[];
      const target = this._findHeading(headings, location);
      if (!target) continue;
      const targetLevel = parseInt(target.tagName[1], 10);
      const idx = headings.indexOf(target);
      const nextHeading = headings.find((h, i) => i > idx && parseInt(h.tagName[1], 10) <= targetLevel);
      const top = target.offsetTop;
      const bottom = nextHeading ? nextHeading.offsetTop : wrap.scrollHeight;
      const bar = document.createElement('div');
      bar.className = 'section-highlight-bar';
      bar.style.top = `${top}px`;
      bar.style.height = `${bottom - top}px`;
      wrap.appendChild(bar);
    }
  }

  clearHighlight(): void {
    this.renderRoot.querySelectorAll('.section-highlight-bar').forEach(el => el.remove());
  }

  private _renderThreadGutterMarkers(): void {
    this.renderRoot.querySelectorAll('.thread-gutter-marker').forEach(el => el.remove());
    for (const anchor of this._threadAnchors) {
      const panelKey = anchor.side === 'A' ? 'a' : 'b';
      const render = this._$(`render-${panelKey}`);
      if (!render) continue;
      const children = [...render.children];
      if (anchor.startLine >= children.length) continue;
      const target = children[anchor.startLine];
      const marker = document.createElement('div');
      marker.className = 'thread-gutter-marker';
      marker.dataset.threadId = anchor.threadId;
      marker.style.cssText = `position:absolute;left:-18px;width:12px;height:${Math.max(1, anchor.endLine - anchor.startLine + 1) * 1.5}em;border-radius:2px;cursor:pointer;background:${anchor.status === 'OPEN' ? 'var(--pages-accent-9, #6366f1)' : 'var(--pages-neutral-5, #d4d4d4)'};opacity:0.6;`;
      marker.title = `Thread ${anchor.status === 'OPEN' ? '(open)' : '(resolved)'}`;
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('thread-selected', {
          bubbles: true,
          composed: true,
          detail: { threadId: anchor.threadId },
        }));
      });
      (target as HTMLElement).style.position = 'relative';
      target.appendChild(marker);
    }
  }

  async selectFile(panel: 'a' | 'b'): Promise<void> {
    const isElectron = typeof (window as any).compare !== 'undefined';
    const path = isElectron
      ? await (window as any).compare.selectFile()
      : prompt('Enter file path:');
    if (path) await this.loadFile(panel, path);
  }

  currentPath(slot: 'a' | 'b'): string | null {
    return this._panels[slot]?.path || null;
  }

  get viewMode(): 'split' | 'unified' { return this._viewMode; }

  setViewMode(mode: 'split' | 'unified'): void {
    if (mode !== 'split' && mode !== 'unified') return;
    if (mode === this._viewMode) return;
    this._viewMode = mode;
    const panelB = this._$('panel-b');
    const divider = this._$('divider');
    if (mode === 'unified') {
      panelB.style.display = 'none';
      divider.style.display = 'none';
    } else {
      panelB.style.display = '';
      divider.style.display = '';
      this._syncPanelContent('a');
      this._syncPanelContent('b');
    }
    this._updateDiffMap();
  }

  async loadFile(panel: 'a' | 'b', path: string): Promise<void> {
    this._panels[panel].path = path;
    this._panels[panel].label = path.split('/').pop()!;
    this._syncPanelMeta(panel);
    if (panel === 'a') this._pathA = path;
    if (panel === 'b') this._pathB = path;
    try {
      const content = await this._fetchFile(path);
      this._renderMarkdown(panel, content);
    } catch (err: any) {
      this._panels[panel].content = null;
      this._syncPanelContent(panel);
      this._$(`render-${panel}`).innerHTML =
        `<p style="color:var(--pages-error-9, #dc2626);padding:24px">Could not read file: ${err.message}</p>`;
    }
    this._updateSwapButton();
  }

  loadContent(panel: 'a' | 'b', content: string, label?: string): void {
    this._panels[panel].path = null;
    this._panels[panel].label = label || 'Snapshot';
    this._panels[panel].content = content;
    this._syncPanelMeta(panel);
    this._syncPanelContent(panel);
    if (panel === 'a') this._pathA = null;
    if (panel === 'b') this._pathB = null;
    this._updateSwapButton();
    this._updateDiffMap();
  }

  private async _fetchFile(filePath: string): Promise<string> {
    const res = await fetch(`${this.apiBaseUrl}/api/file?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  private _syncPanelMeta(panel: 'a' | 'b'): void {
    const s = this._panels[panel];
    (this._$(`label-${panel}`) as HTMLInputElement).value = s.label;
    this._$(`path-${panel}`).textContent = s.path || s.label || 'No file selected';
    this._$(`path-${panel}`).classList.toggle('loaded', !!(s.path || s.content));
  }

  private _syncPanelContent(panel: 'a' | 'b'): void {
    const s = this._panels[panel];
    if (s.content) {
      this._$(`render-${panel}`).innerHTML = marked.parse(s.content) as string;
      this._$(`empty-${panel}`).classList.add('hidden');
    } else {
      this._$(`render-${panel}`).innerHTML = '';
      this._$(`empty-${panel}`).classList.remove('hidden');
    }
  }

  private _renderMarkdown(panel: 'a' | 'b', content: string): void {
    this._panels[panel].content = content;
    this._syncPanelContent(panel);
    this._updateDiffMap();
  }

  private _renderUnified(aLines: string[], bLines: string[], chunks: DiffChunk[]): void {
    const renderA = this._$('render-a');
    const renderB = this._$('render-b');
    renderB.innerHTML = '';
    this._$('empty-b').classList.add('hidden');
    this._$('empty-a').classList.add('hidden');

    let htmlStr = '';
    chunks.forEach((c, ci) => {
      if (c.op === 'eq') {
        const text = bLines.slice(c.bStart, c.bEnd).join('\n');
        htmlStr += marked.parse(text);
      } else if (c.op === 'del') {
        const text = aLines.slice(c.aStart, c.aEnd).join('\n');
        htmlStr += `<div class="diff-unified-del" data-diff-chunk="${ci}">${marked.parse(text)}</div>`;
      } else if (c.op === 'ins') {
        const text = bLines.slice(c.bStart, c.bEnd).join('\n');
        htmlStr += `<div class="diff-unified-ins" data-diff-chunk="${ci}">${marked.parse(text)}</div>`;
      } else if (c.op === 'mod') {
        const delText = aLines.slice(c.aStart, c.aEnd).join('\n');
        const insText = bLines.slice(c.bStart, c.bEnd).join('\n');
        htmlStr += `<div class="diff-unified-del" data-diff-chunk="${ci}">${marked.parse(delText)}</div>`;
        htmlStr += `<div class="diff-unified-ins" data-diff-chunk="${ci}">${marked.parse(insText)}</div>`;
      }
    });
    renderA.innerHTML = htmlStr;

    chunks.forEach((c, ci) => {
      if (c.op !== 'mod') return;
      const els = renderA.querySelectorAll(`[data-diff-chunk="${ci}"]`);
      if (els.length < 2) return;
      const elDel = els[0] as HTMLElement;
      const elIns = els[1] as HTMLElement;
      if (elDel.tagName === 'PRE' || elIns.tagName === 'PRE') return;
      const { rangesA, rangesB } = this._wordDiff(elDel.textContent!, elIns.textContent!);
      this._applyWordHighlights(elDel, rangesA, 'diff-word-a');
      this._applyWordHighlights(elIns, rangesB, 'diff-word-b');
    });
  }

  private _updateSwapButton(): void {}

  private _lineDiff(textA: string, textB: string): { a: string[]; b: string[]; chunks: DiffChunk[] } {
    const a = textA.split('\n');
    const b = textB.split('\n');
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
    for (let i = m - 1; i >= 0; i--)
      for (let j = n - 1; j >= 0; j--)
        dp[i][j] = a[i] === b[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);

    const raw: DiffChunk[] = [];
    let i = 0, j = 0;
    while (i < m || j < n) {
      const last = raw[raw.length - 1];
      if (i < m && j < n && a[i] === b[j]) {
        if (last?.op === 'eq') { last.aEnd++; last.bEnd++; }
        else raw.push({ op: 'eq', aStart: i, aEnd: i+1, bStart: j, bEnd: j+1 });
        i++; j++;
      } else if (i < m && (j >= n || dp[i+1][j] >= dp[i][j+1])) {
        if (last?.op === 'del') { last.aEnd++; }
        else raw.push({ op: 'del', aStart: i, aEnd: i+1, bStart: j, bEnd: j });
        i++;
      } else {
        if (last?.op === 'ins') { last.bEnd++; }
        else raw.push({ op: 'ins', aStart: i, aEnd: i, bStart: j, bEnd: j+1 });
        j++;
      }
    }
    const chunks: DiffChunk[] = [];
    for (let k = 0; k < raw.length; k++) {
      if (raw[k].op === 'del' && raw[k+1]?.op === 'ins') {
        chunks.push({ op: 'mod', aStart: raw[k].aStart, aEnd: raw[k].aEnd,
                                 bStart: raw[k+1].bStart, bEnd: raw[k+1].bEnd });
        k++;
      } else { chunks.push(raw[k]); }
    }
    return { a, b, chunks };
  }

  private _tokenize(text: string): { text: string; word: boolean; start?: number; end?: number }[] {
    const tokens: { text: string; word: boolean; start?: number; end?: number }[] = [];
    let pos = 0;
    for (const m of text.matchAll(/\S+/g)) {
      if (m.index! > pos) tokens.push({ text: text.slice(pos, m.index!), word: false });
      tokens.push({ text: m[0], word: true, start: m.index!, end: m.index! + m[0].length });
      pos = m.index! + m[0].length;
    }
    if (pos < text.length) tokens.push({ text: text.slice(pos), word: false });
    return tokens;
  }

  private _wordDiff(textA: string, textB: string): { rangesA: number[][]; rangesB: number[][] } {
    const ta = this._tokenize(textA).filter(t => t.word);
    const tb = this._tokenize(textB).filter(t => t.word);
    const m = ta.length, n = tb.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
    for (let i = m - 1; i >= 0; i--)
      for (let j = n - 1; j >= 0; j--)
        dp[i][j] = ta[i].text === tb[j].text ? dp[i+1][j+1] + 1
                                              : Math.max(dp[i+1][j], dp[i][j+1]);
    const rangesA: number[][] = [], rangesB: number[][] = [];
    let i = 0, j = 0;
    while (i < m || j < n) {
      if (i < m && j < n && ta[i].text === tb[j].text) { i++; j++; }
      else if (j >= n || (i < m && dp[i+1][j] >= dp[i][j+1])) {
        rangesA.push([ta[i].start!, ta[i].end!]); i++;
      } else {
        rangesB.push([tb[j].start!, tb[j].end!]); j++;
      }
    }
    return { rangesA, rangesB };
  }

  private _applyWordHighlights(el: HTMLElement, changedRanges: number[][], markClass: string): void {
    if (!changedRanges.length) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number; end: number }[] = [];
    let node: Text | null, off = 0;
    while ((node = walker.nextNode() as Text | null)) {
      if ((node.parentNode as HTMLElement).tagName === 'CODE') { off += node.length; continue; }
      nodes.push({ node, start: off, end: off + node.length });
      off += node.length;
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      const { node: n, start, end } = nodes[i];
      const overlaps = changedRanges.filter(([rs, re]) => re > start && rs < end);
      if (!overlaps.length) continue;
      const segs: { t: string; ch: boolean }[] = [];
      let pos = start;
      for (const [rs, re] of overlaps) {
        if (rs > pos) segs.push({ t: n.data.slice(pos - start, rs - start), ch: false });
        segs.push({ t: n.data.slice(Math.max(rs, start) - start, Math.min(re, end) - start), ch: true });
        pos = re;
      }
      if (pos < end) segs.push({ t: n.data.slice(pos - start), ch: false });
      const frag = document.createDocumentFragment();
      for (const s of segs) {
        if (s.ch) {
          const mark = document.createElement('mark');
          mark.className = markClass;
          mark.textContent = s.t;
          frag.appendChild(mark);
        } else {
          frag.appendChild(document.createTextNode(s.t));
        }
      }
      n.parentNode!.replaceChild(frag, n);
    }
  }

  private _annotateWordDiffs(chunks: DiffChunk[]): void {
    this.renderRoot.querySelectorAll('mark.diff-word-a, mark.diff-word-b').forEach(m => {
      m.replaceWith(document.createTextNode(m.textContent!));
    });
    chunks.forEach((c, ci) => {
      if (c.op !== 'mod') return;
      const elA = this._$('render-a').querySelector(`[data-diff-chunk="${ci}"]`) as HTMLElement | null;
      const elB = this._$('render-b').querySelector(`[data-diff-chunk="${ci}"]`) as HTMLElement | null;
      if (!elA || !elB || elA.tagName === 'PRE' || elB.tagName === 'PRE') return;
      const { rangesA, rangesB } = this._wordDiff(elA.textContent!, elB.textContent!);
      this._applyWordHighlights(elA, rangesA, 'diff-word-a');
      this._applyWordHighlights(elB, rangesB, 'diff-word-b');
    });
  }

  private _drawDiffMap(totalA: number, totalB: number, chunks: DiffChunk[]): void {
    const canvas = this._$('diff-map') as HTMLCanvasElement;
    const divider = this._$('divider');
    const h = divider.clientHeight, w = divider.clientWidth;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const mid = Math.floor(w / 2);
    ctx.fillStyle = '#ede7d9'; ctx.fillRect(0, 0, w, h);
    for (const c of chunks) {
      if (c.op === 'eq') continue;
      if (c.op === 'del' || c.op === 'mod') {
        const y1 = Math.floor((c.aStart / totalA) * h);
        const y2 = Math.ceil( (c.aEnd   / totalA) * h);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(1, y1, mid - 2, Math.max(2, y2 - y1));
      }
      if (c.op === 'ins' || c.op === 'mod') {
        const y1 = Math.floor((c.bStart / totalB) * h);
        const y2 = Math.ceil( (c.bEnd   / totalB) * h);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(mid + 1, y1, w - mid - 2, Math.max(2, y2 - y1));
      }
    }
    ctx.fillStyle = '#c8baa0'; ctx.fillRect(mid, 0, 1, h);
  }

  private _annotateRendered(panel: 'a' | 'b', content: string, chunks: DiffChunk[]): void {
    const render = this._$(`render-${panel}`);
    const elements = [...render.children] as HTMLElement[];
    const startKey = panel === 'a' ? 'aStart' : 'bStart';
    const endKey   = panel === 'a' ? 'aEnd'   : 'bEnd';
    elements.forEach(el => {
      el.removeAttribute('data-diff-chunk');
      el.classList.remove('diff-del', 'diff-ins');
    });
    const tokens = marked.lexer(content);
    let line = 0, elIdx = 0;
    for (const token of tokens) {
      const rawLines = token.raw.split('\n').length - 1;
      const tokenEnd = line + rawLines;
      if (token.type !== 'space') {
        const el = elements[elIdx++];
        if (el) {
          const endForCheck = Math.max(tokenEnd, line + 1);
          const ci = chunks.findIndex(c =>
            c.op !== 'eq' && (c as any)[startKey] < endForCheck && (c as any)[endKey] > line);
          if (ci >= 0) {
            el.dataset.diffChunk = String(ci);
            el.classList.add(panel === 'a' ? 'diff-del' : 'diff-ins');
          }
        }
      }
      line = tokenEnd;
    }
  }

  private _updateDiffMap(): void {
    if (!this._panels.a.content || !this._panels.b.content) {
      this._lastChunks = [];
      this._scrollAnchors = [];
      return;
    }
    const { a, b, chunks } = this._lineDiff(this._panels.a.content, this._panels.b.content);
    this._lastChunks = chunks;
    this._lastTotalA = a.length;
    this._lastTotalB = b.length;

    if (this._viewMode === 'unified') {
      this._renderUnified(a, b, chunks);
    } else {
      this._drawDiffMap(a.length, b.length, chunks);
      this._annotateRendered('a', this._panels.a.content, chunks);
      this._annotateRendered('b', this._panels.b.content, chunks);
      this._annotateWordDiffs(chunks);
      this._buildScrollAnchors();
    }

    this._currentChunkIdx = -1;
    this.dispatchEvent(new CustomEvent('diff-updated', {
      bubbles: true,
      detail: { chunks, totalA: a.length, totalB: b.length },
    }));
  }

  private _nonEqIndices(): number[] {
    return this._lastChunks.reduce<number[]>((acc, c, i) => {
      if (c.op !== 'eq') acc.push(i);
      return acc;
    }, []);
  }

  private _chunkOutOfView(ci: number): boolean {
    for (const p of ['a', 'b']) {
      const el = this._$(`render-${p}`).querySelector(`[data-diff-chunk="${ci}"]`);
      if (!el) continue;
      const br = this._$(`body-${p}`).getBoundingClientRect();
      const er = el.getBoundingClientRect();
      return er.bottom < br.top || er.top > br.bottom;
    }
    return true;
  }

  private _scrollToChunk(ci: number): void {
    for (const p of ['a', 'b']) {
      const el = this._$(`render-${p}`).querySelector(`[data-diff-chunk="${ci}"]`);
      if (!el) continue;
      const body = this._$(`body-${p}`);
      const delta = el.getBoundingClientRect().top - body.getBoundingClientRect().top - 24;
      if (Math.abs(delta) > 1) body.scrollBy({ top: delta, behavior: 'instant' });
    }
  }

  private _findHeading(headings: HTMLElement[], location: string): HTMLElement | null {
    if (!location) return null;
    const ref = location.startsWith('§') ? location.slice(1).trim() : location.trim();
    if (!ref) return null;
    const numMatch = ref.match(/^(\d+)(?:\.(\d+))?(?:\s|$)/);
    if (numMatch) {
      const major = parseInt(numMatch[1], 10);
      const minor = numMatch[2] ? parseInt(numMatch[2], 10) : null;
      const topLevel = headings.filter(h => h.tagName === 'H2' || h.tagName === 'H1');
      if (major >= 1 && major <= topLevel.length) {
        if (minor === null) {
          return topLevel[major - 1];
        } else {
          const start = headings.indexOf(topLevel[major - 1]);
          const nextTop = topLevel[major] ? headings.indexOf(topLevel[major]) : headings.length;
          const subHeadings = headings.slice(start + 1, nextTop);
          if (minor >= 1 && minor <= subHeadings.length) return subHeadings[minor - 1];
        }
      }
    }
    const lower = ref.toLowerCase();
    const found = headings.find(h => h.textContent!.toLowerCase().includes(lower));
    if (found) return found;
    const normalized = this._normalizeLocation(lower);
    if (normalized !== lower) {
      const norm = headings.find(h => h.textContent!.toLowerCase().includes(normalized));
      if (norm) return norm;
    }
    const sepMatch = ref.match(/\s+(?:\/|-|—|and|or)\s+/i);
    if (sepMatch) {
      for (const part of ref.split(/\s+(?:\/|-|—|and|or)\s+/i)) {
        const cleaned = part.trim().toLowerCase();
        if (!cleaned) continue;
        const match = headings.find(h => h.textContent!.toLowerCase().includes(cleaned));
        if (match) return match;
      }
    }
    const words = normalized.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 2) {
      let best: HTMLElement | null = null, bestScore = 0;
      for (const h of headings) {
        const ht = h.textContent!.toLowerCase();
        const score = words.filter(w => ht.includes(w)).length;
        if (score > bestScore) { bestScore = score; best = h; }
      }
      if (best && bestScore >= Math.ceil(words.length / 2)) return best;
    }
    return null;
  }

  private _normalizeLocation(text: string): string {
    const quoteRe = new RegExp('^[\\x22\\x27\\u201C\\u201D\\u2018\\u2019]+|[\\x22\\x27\\u201C\\u201D\\u2018\\u2019]+$', 'g');
    let s = text.replace(quoteRe, '');
    s = s.replace(/^(?:section|heading|under|in the|in|the)\s*[:.]?\s*/i, '');
    s = s.replace(/\s+(?:section|heading|area|part)$/i, '');
    return s.trim();
  }

  private _normHead(t: string): string {
    return t.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/).slice(0, 6).join(' ');
  }

  private _scrollPercent(el: HTMLElement): number {
    const max = el.scrollHeight - el.clientHeight;
    return max <= 0 ? 0 : Math.min(1, el.scrollTop / max);
  }

  private _interp(pos: number, fk: string, tk: string): number {
    const a = this._scrollAnchors;
    if (a.length < 2) return pos;
    let i = a.length - 2;
    while (i > 0 && a[i][fk] > pos) i--;
    const lo = a[i]!, hi = a[i + 1]!;
    if (hi[fk] === lo[fk]) return lo[tk]!;
    return lo[tk]! + Math.max(0, Math.min(1, (pos - lo[fk]!) / (hi[fk]! - lo[fk]!)))
                  * (hi[tk]! - lo[tk]!);
  }

  private _buildScrollAnchors(): void {
    const bodyA = this._$('body-a'), bodyB = this._$('body-b');
    const maxA = bodyA.scrollHeight - bodyA.clientHeight;
    const maxB = bodyB.scrollHeight - bodyB.clientHeight;
    if (maxA <= 0 || maxB <= 0) { this._scrollAnchors = []; return; }

    const brA = bodyA.getBoundingClientRect();
    const brB = bodyB.getBoundingClientRect();

    const aHds = [... Array.from(this._$('render-a').querySelectorAll('h2,h3,h4'))]
      .map(el => ({ text: this._normHead(el.textContent!),
                    pos: el.getBoundingClientRect().top - brA.top + bodyA.scrollTop }));
    const bHds = [... Array.from(this._$('render-b').querySelectorAll('h2,h3,h4'))]
      .map(el => ({ text: this._normHead(el.textContent!),
                    pos: el.getBoundingClientRect().top - brB.top + bodyB.scrollTop }));

    const anchors: ScrollAnchor[] = [{ a: 0, b: 0 }];
    const usedB = new Set<number>();
    for (const ah of aHds) {
      let bi = bHds.findIndex((bh, i) => !usedB.has(i) && bh.text === ah.text);
      if (bi < 0) bi = bHds.findIndex((bh, i) => !usedB.has(i) && (
        (ah.text.length >= 18 && bh.text.startsWith(ah.text.slice(0, 18)))
        || (bh.text.length >= 18 && ah.text.startsWith(bh.text.slice(0, 18)))));
      if (bi >= 0) {
        usedB.add(bi);
        anchors.push({ a: ah.pos, b: bHds[bi]!.pos });
      }
    }
    anchors.push({ a: maxA, b: maxB });

    anchors.sort((x, y) => x.a - y.a);
    this._scrollAnchors = anchors.filter((an, i) => i === 0 || an.a > anchors[i - 1]!.a);
  }

  private _setupScrollSync(): void {
    const bodyA = this._$('body-a'), bodyB = this._$('body-b');
    bodyA.addEventListener('scroll', () => {
      if (!this._syncEnabled || this._syncing) return;
      this._syncing = true;
      bodyB.scrollTop = this._scrollAnchors.length >= 2
        ? this._interp(bodyA.scrollTop, 'a', 'b')
        : this._scrollPercent(bodyA) * (bodyB.scrollHeight - bodyB.clientHeight);
      requestAnimationFrame(() => requestAnimationFrame(() => { this._syncing = false; }));
    }, { passive: true });
    bodyB.addEventListener('scroll', () => {
      if (!this._syncEnabled || this._syncing) return;
      this._syncing = true;
      bodyA.scrollTop = this._scrollAnchors.length >= 2
        ? this._interp(bodyB.scrollTop, 'b', 'a')
        : this._scrollPercent(bodyB) * (bodyA.scrollHeight - bodyA.clientHeight);
      requestAnimationFrame(() => requestAnimationFrame(() => { this._syncing = false; }));
    }, { passive: true });
  }

  private _setupDividerDrag(): void {
    const divider = this._$('divider');
    divider.addEventListener('mousedown', () => { this._dragging = true; });
    const onMouseMove = (e: MouseEvent) => {
      if (!this._dragging) return;
      const r = this.getBoundingClientRect();
      const pct = Math.max(20, Math.min(80, (e.clientX - r.left) / r.width * 100));
      const pa = this._$('panel-a'), pb = this._$('panel-b');
      pa.style.flex = 'none'; pa.style.width = pct + '%';
      pb.style.flex = '1';    pb.style.width = '';
    };
    const onMouseUp = () => { this._dragging = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    this._cleanups.push(
      () => document.removeEventListener('mousemove', onMouseMove),
      () => document.removeEventListener('mouseup', onMouseUp),
    );
  }

  private _setupDropZone(panel: 'a' | 'b'): void {
    const body = this._$(`body-${panel}`);
    body.addEventListener('dragover', e => {
      e.preventDefault();
      e.stopPropagation();
      body.classList.add('drag-over');
    });
    body.addEventListener('dragleave', e => {
      e.preventDefault();
      e.stopPropagation();
      body.classList.remove('drag-over');
    });
    body.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      body.classList.remove('drag-over');
      const file = (e as DragEvent).dataTransfer?.files[0];
      if (file && (file as any).path) this.loadFile(panel, (file as any).path);
    });
  }

  private _onDiffMapClick(e: MouseEvent): void {
    if (!this._lastChunks.length) return;
    const canvas = this._$('diff-map') as HTMLCanvasElement;
    const yFrac    = e.offsetY / canvas.height;
    const leftSide = e.offsetX < canvas.width / 2;
    const total    = leftSide ? this._lastTotalA : this._lastTotalB;
    const startKey = leftSide ? 'aStart' : 'bStart';
    const endKey   = leftSide ? 'aEnd'   : 'bEnd';
    const clickLine = Math.floor(yFrac * total);
    const ci = this._lastChunks.findIndex(c =>
      c.op !== 'eq' && (c as any)[startKey] <= clickLine && (c as any)[endKey] > clickLine);
    if (ci < 0) return;
    this._scrollToChunk(ci);
    this._currentChunkIdx = ci;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'document-diff': DocumentDiff;
  }
}
