import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { EventConnection } from '@casehubio/pages-data';
import { ScenarioConnectionController } from './scenario-connection-controller.js';
import { sanitizeHtml } from './html-sanitizer.js';
import { tokenizeYamlLine } from './yaml-highlighter.js';

export class PagesScenarioNarrative extends LitElement {
  static override styles = css`
    :host { display: block; }
    .narrative-content {
      padding: var(--pages-space-4, 16px);
      max-width: 680px;
      line-height: 1.6;
      font-size: var(--pages-font-size-base, 14px);
      font-family: var(--pages-font-family, system-ui, sans-serif);
      color: var(--pages-neutral-12, #1a1a1a);
    }
    .narrative-content h1 { font-size: 1.5em; margin: 0.5em 0; font-weight: 600; }
    .narrative-content h2 { font-size: 1.25em; margin: 0.5em 0; font-weight: 600; }
    .narrative-content h3 { font-size: 1.1em; margin: 0.5em 0; font-weight: 600; }
    .narrative-content p { margin: 0.5em 0; }
    .narrative-content strong { font-weight: 600; }
    .narrative-content em { font-style: italic; }
    .narrative-content code {
      background: var(--pages-neutral-3, #f5f5f5);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }
    .narrative-content pre {
      background: var(--pages-neutral-3, #f5f5f5);
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 6px;
      padding: 12px 16px;
      overflow-x: auto;
      margin: 0.75em 0;
    }
    .narrative-content pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: 0.85em;
      line-height: 1.5;
      color: var(--pages-neutral-12, #1a1a1a);
    }
    .narrative-content .yaml-key { color: #7dd3fc; }
    .narrative-content .yaml-string { color: #86efac; }
    .narrative-content .yaml-comment { color: #6b7280; font-style: italic; }
    .narrative-content .yaml-literal { color: #fbbf24; }
    .narrative-content .yaml-punct { color: #94a3b8; }
    .narrative-content .yaml-plain { color: var(--pages-neutral-12, #ededed); }
    .narrative-content ul { margin: 0.5em 0; padding-left: 1.5em; }
    .narrative-content li { margin: 0.25em 0; }
    .slide-ref {
      padding: var(--pages-space-4, 16px);
      color: var(--pages-neutral-8, #999);
      font-style: italic;
    }
  `;

  @property({ attribute: false }) connection?: EventConnection;
  @property({ attribute: false }) eventTarget?: EventTarget;
  @property() baseUrl?: string;
  @property() contentBase?: string;
  @property({ type: String }) htmlMode: 'escape' | 'sanitized' = 'escape';

  private _conn!: ScenarioConnectionController;
  private _templateCache = new Map<string, string>();
  @state() private _templateContent: string | null = null;
  private _lastTemplatePath: string | null = null;
  @state() private _directContent: { type: string; markdown?: string; path?: string; section?: string } | null = null;

  private _onNarrative = (e: Event): void => {
    this._directContent = (e as CustomEvent).detail as { type: string; markdown?: string; path?: string; section?: string };
  };

  private _onNarrativeDismiss = (): void => {
    this._directContent = null;
  };

  private _boundTarget: EventTarget | null = null;

  override connectedCallback(): void {
    this._conn = new ScenarioConnectionController(this, {
      connection: this.connection,
      eventTarget: this.eventTarget,
      baseUrl: this.baseUrl,
      onState: () => { this._onContentChange(); },
    });
    super.connectedCallback();
    this._bindEventTarget(this.eventTarget);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._bindEventTarget(null);
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('eventTarget')) {
      this._bindEventTarget(this.eventTarget);
    }
  }

  private _bindEventTarget(target: EventTarget | undefined | null): void {
    if (this._boundTarget) {
      this._boundTarget.removeEventListener('scenario-narrative', this._onNarrative);
      this._boundTarget.removeEventListener('scenario-narrative-dismiss', this._onNarrativeDismiss);
      this._boundTarget = null;
    }
    if (target) {
      target.addEventListener('scenario-narrative', this._onNarrative);
      target.addEventListener('scenario-narrative-dismiss', this._onNarrativeDismiss);
      this._boundTarget = target;
    }
  }

  private _onContentChange(): void {
    const content = this._conn?.state?.content;
    if (content?.type === 'template' && content.path) {
      const cacheKey = content.path;
      if (cacheKey !== this._lastTemplatePath) {
        this._lastTemplatePath = cacheKey;
        if (this._templateCache.has(cacheKey)) {
          this._templateContent = this._extractSection(this._templateCache.get(cacheKey)!, content.section);
        } else {
          this._templateContent = null;
          void this._fetchTemplate(content.path, content.section);
        }
      }
    } else {
      this._lastTemplatePath = null;
      this._templateContent = null;
    }
  }

  private async _fetchTemplate(path: string, section?: string): Promise<void> {
    try {
      const url = this.contentBase
        ? `${this.contentBase}/${path}`
        : `${this._conn.restBase}/scenario/content?path=${encodeURIComponent(path)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const text = await resp.text();
        this._templateCache.set(path, text);
        this._templateContent = this._extractSection(text, section);
      }
    } catch {
      // Ignore — show loading state
    }
  }

  private _extractSection(markdown: string, section?: string): string {
    if (!section) return markdown;
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

  override render(): TemplateResult | typeof nothing {
    if (this._directContent) {
      if (this._directContent.type === 'template' && this._directContent.path) {
        const cached = this._templateCache.get(this._directContent.path);
        if (cached) return this._renderMarkdown(this._extractSection(cached, this._directContent.section));
        void this._fetchTemplate(this._directContent.path, this._directContent.section);
        return html`<div class="narrative-content"><em>Loading...</em></div>`;
      }
      const md = this._directContent.markdown ?? '';
      return this._renderMarkdown(this._directContent.section ? this._extractSection(md, this._directContent.section) : md);
    }

    const content = this._conn?.state?.content;
    if (!content) return nothing;

    switch (content.type) {
      case 'inline':
        return this._renderMarkdown(content.markdown ?? '');
      case 'template':
        if (this._templateContent !== null) {
          return this._renderMarkdown(this._templateContent);
        }
        return html`<div class="narrative-content"><em>Loading...</em></div>`;
      case 'slide':
        return html`<div class="slide-ref">Slide: ${String(content.ref)}</div>`;
      default:
        return nothing;
    }
  }

  private _renderMarkdown(md: string): TemplateResult {
    let processed: string;

    const codeBlocks: string[] = [];
    const withoutCode = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_match: string, lang: string, code: string) => {
      let rendered: string;
      if (lang === 'yaml') {
        const lines = code.split('\n');
        rendered = lines.map(line => {
          const tokens = tokenizeYamlLine(line);
          return tokens.map(t => {
            const escaped = t.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<span class="yaml-${t.type}">${escaped}</span>`;
          }).join('');
        }).join('\n');
      } else {
        rendered = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      const cls = lang ? ` class="language-${lang}"` : '';
      codeBlocks.push(`<pre><code${cls}>${rendered}</code></pre>`);
      return `\n\n__CODE_BLOCK_${codeBlocks.length - 1}__\n\n`;
    });

    if (this.htmlMode === 'sanitized') {
      const svgBlocks: string[] = [];
      const textWithPlaceholders = withoutCode.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
        svgBlocks.push(match);
        return `\n\n__SVG_BLOCK_${svgBlocks.length - 1}__\n\n`;
      });

      processed = textWithPlaceholders
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hulo])(.+)$/gm, '<p>$1</p>');

      for (let i = 0; i < svgBlocks.length; i++) {
        processed = processed.replace(
          new RegExp(`(?:<p>)?__SVG_BLOCK_${i}__(?:</p>)?`),
          svgBlocks[i],
        );
      }
      processed = sanitizeHtml(processed);
    } else {
      const escaped = withoutCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      processed = escaped
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hulo])(.+)$/gm, '<p>$1</p>');
    }

    for (let i = 0; i < codeBlocks.length; i++) {
      processed = processed.replace(
        new RegExp(`(?:<p>)?__CODE_BLOCK_${i}__(?:</p>)?`),
        codeBlocks[i],
      );
    }

    const container = document.createElement('div');
    container.className = 'narrative-content';
    container.innerHTML = processed;
    return html`${container}`;
  }
}

if (!customElements.get('pages-scenario-narrative')) {
  customElements.define('pages-scenario-narrative', PagesScenarioNarrative);
}
