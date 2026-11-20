import { LitElement, html, css, nothing } from 'lit';
import { applyTheme, getTheme, listThemes } from './runtime.js';

interface ThemeFamily {
  readonly name: string;
  readonly displayName: string;
  readonly hasLight: boolean;
  readonly hasDark: boolean;
}

function extractFamilies(themes: string[]): ThemeFamily[] {
  const familyMap = new Map<string, { hasLight: boolean; hasDark: boolean }>();
  for (const theme of themes) {
    const lightMatch = theme.match(/^(.+)-light$/);
    const darkMatch = theme.match(/^(.+)-dark$/);
    const family = lightMatch?.[1] ?? darkMatch?.[1] ?? theme;
    const entry = familyMap.get(family) ?? { hasLight: false, hasDark: false };
    if (lightMatch) entry.hasLight = true;
    if (darkMatch) entry.hasDark = true;
    if (!lightMatch && !darkMatch) { entry.hasLight = true; entry.hasDark = true; }
    familyMap.set(family, entry);
  }
  return [...familyMap.entries()].map(([name, v]) => ({
    name,
    displayName: name.split('-').map(w => w[0]!.toUpperCase() + w.slice(1)).join(' '),
    ...v,
  }));
}

function parseCurrentTheme(current: string): { family: string; mode: 'light' | 'dark' } {
  const lightMatch = current.match(/^(.+)-light$/);
  const darkMatch = current.match(/^(.+)-dark$/);
  return {
    family: lightMatch?.[1] ?? darkMatch?.[1] ?? current,
    mode: darkMatch ? 'dark' : 'light',
  };
}

export class PagesThemePickerElement extends LitElement {
  static override styles = css`
    :host { display: inline-flex; align-items: center; gap: 8px; anchor-scope: all; }
    select {
      background: var(--pages-surface-secondary, #222);
      color: var(--pages-text-secondary, #ccc);
      border: 1px solid var(--pages-border-default, #444);
      border-radius: var(--pages-radius-sm, 4px);
      padding: 4px 8px;
      font: inherit;
    }
    .mode-toggle { display: inline-flex; gap: 0; }
    .mode-toggle button {
      background: var(--pages-surface-secondary, #222);
      color: var(--pages-text-secondary, #ccc);
      border: 1px solid var(--pages-border-default, #444);
      padding: 4px 12px;
      cursor: pointer;
      font: inherit;
    }
    .mode-toggle button:first-child { border-radius: var(--pages-radius-sm, 4px) 0 0 var(--pages-radius-sm, 4px); }
    .mode-toggle button:last-child { border-radius: 0 var(--pages-radius-sm, 4px) var(--pages-radius-sm, 4px) 0; border-left: none; }
    .mode-toggle button[aria-pressed="true"] {
      background: var(--pages-interactive, #4a9eff);
      color: var(--pages-surface-primary, #111);
    }
    .compact-trigger {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--pages-surface-secondary, #222);
      color: var(--pages-text-secondary, #ccc);
      border: 1px solid var(--pages-border-default, #444);
      border-radius: var(--pages-radius-sm, 4px);
      padding: 6px;
      cursor: pointer;
      anchor-name: --theme-picker-trigger;
    }
    .compact-trigger:hover { background: var(--pages-surface-hover, #333); }
    .accent-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--pages-accent-9, #4a9eff);
      border: 1px solid var(--pages-surface-secondary, #222);
    }
    .theme-popover {
      position: fixed;
      position-anchor: --theme-picker-trigger;
      position-area: block-end span-inline-end;
      position-try-fallbacks: flip-block;
      margin: 0;
      margin-block-start: var(--pages-space-1, 4px);
      background: var(--pages-surface-primary, #111);
      border: 1px solid var(--pages-border-default, #444);
      border-radius: var(--pages-radius-md, 8px);
      box-shadow: var(--pages-shadow-2, 0 4px 12px rgba(0,0,0,0.3));
      padding: var(--pages-space-3, 12px);
      min-width: 160px;
      color: var(--pages-text-primary, #eee);
      font: inherit;
    }
    .family-fieldset { border: none; padding: 0; margin: 0 0 var(--pages-space-2, 8px) 0; }
    .family-legend {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-text-muted, #888);
      font-weight: var(--pages-font-weight-medium, 500);
      margin-bottom: var(--pages-space-1, 4px);
      padding: 0;
    }
    .family-option {
      display: flex;
      align-items: center;
      gap: var(--pages-space-1-5, 6px);
      padding: var(--pages-space-0-5, 2px) 0;
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-text-primary, #eee);
      cursor: pointer;
    }
    .family-option input[type="radio"] { accent-color: var(--pages-interactive, #4a9eff); }
    .customize-btn {
      background: var(--pages-surface-secondary, #222);
      color: var(--pages-text-secondary, #ccc);
      border: 1px solid var(--pages-border-default, #444);
      border-radius: var(--pages-radius-sm, 4px);
      padding: 4px 8px;
      cursor: pointer;
      font: inherit;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .customize-btn:hover { background: var(--pages-surface-hover, #333); }
  `;

  static override properties = {
    target: { attribute: false },
    compact: { type: Boolean },
    _family: { state: true },
    _mode: { state: true },
    _families: { state: true },
  };

  declare target: HTMLElement;
  declare compact: boolean;
  declare _family: string;
  declare _mode: 'light' | 'dark';
  declare _families: ThemeFamily[];

  constructor() {
    super();
    this.target = document.documentElement;
    this.compact = false;
    this._family = '';
    this._mode = 'dark';
    this._families = [];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._families = extractFamilies(listThemes());
    const current = getTheme(this.target);
    if (current) {
      const parsed = parseCurrentTheme(current);
      this._family = parsed.family;
      this._mode = parsed.mode;
    } else if (this._families.length > 0) {
      this._family = this._families[0]!.name;
    }
  }

  override render() {
    if (this.compact) return this._renderCompact();
    return html`
      <select @change=${(e: Event) => { this._onFamilyChange(e); }}>
        ${this._families.map(f => html`
          <option value=${f.name} ?selected=${f.name === this._family}>${f.displayName}</option>
        `)}
      </select>
      <div class="mode-toggle">
        <button aria-pressed=${String(this._mode === 'light')} @click=${() => { this._setMode('light'); }}>Light</button>
        <button aria-pressed=${String(this._mode === 'dark')} @click=${() => { this._setMode('dark'); }}>Dark</button>
      </div>
      <button class="customize-btn" aria-label="Customize theme" @click=${() => { this._openDesigner(); }}>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path d="M13.5 2.5l-1-1-9 9-.5 2 2-.5 9-9z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
  }

  private _renderCompact() {
    const multiFam = this._families.length > 1;
    return html`
      <button
        class="compact-trigger"
        popovertarget="theme-popover"
        aria-haspopup="dialog"
        aria-label="Theme settings"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8s2.9 6.5 6.5 6.5c.6 0 1-.4 1-1 0-.3-.1-.5-.2-.7-.2-.2-.3-.5-.3-.8 0-.6.4-1 1-1H11c1.9 0 3.5-1.6 3.5-3.5C14.5 4 11.6 1.5 8 1.5z" stroke="currentColor" stroke-width="1.2"/>
          <circle cx="5" cy="6.5" r="1" fill="currentColor"/>
          <circle cx="8" cy="4.5" r="1" fill="currentColor"/>
          <circle cx="11" cy="6" r="1" fill="currentColor"/>
        </svg>
        <span class="accent-dot"></span>
      </button>
      <div id="theme-popover" class="theme-popover" popover="auto" role="group" aria-label="Theme settings">
        ${multiFam ? html`
          <fieldset class="family-fieldset">
            <legend class="family-legend">Theme</legend>
            ${this._families.length > 5 ? html`
              <select @change=${(e: Event) => { this._family = (e.target as HTMLSelectElement).value; this._apply(); }}>
                ${this._families.map(f => html`
                  <option value=${f.name} ?selected=${f.name === this._family}>${f.displayName}</option>
                `)}
              </select>
            ` : html`
              ${this._families.map(f => html`
                <label class="family-option">
                  <input
                    type="radio"
                    name="theme-family"
                    .value=${f.name}
                    .checked=${f.name === this._family}
                    @change=${() => { this._family = f.name; this._apply(); }}
                  />
                  ${f.displayName}
                </label>
              `)}
            `}
          </fieldset>
        ` : nothing}
        <div class="mode-toggle">
          <button aria-pressed=${String(this._mode === 'light')} @click=${() => { this._setMode('light'); }}>☀ Light</button>
          <button aria-pressed=${String(this._mode === 'dark')} @click=${() => { this._setMode('dark'); }}>☾ Dark</button>
        </div>
        <button class="customize-btn" aria-label="Customize theme" @click=${() => { this._openDesigner(); }}>
          Customize...
        </button>
      </div>
    `;
  }

  private _openDesigner(): void {
    let designer = document.querySelector('pages-theme-designer') as any;
    if (!designer) {
      void import('./theme-designer.js');
      designer = document.createElement('pages-theme-designer');
      designer.target = this.target;
      document.body.appendChild(designer);
    }
    designer.open = true;
  }

  private _onFamilyChange(e: Event): void {
    this._family = (e.target as HTMLSelectElement).value;
    this._apply();
  }

  private _setMode(mode: 'light' | 'dark'): void {
    this._mode = mode;
    this._apply();
  }

  private _apply(): void {
    const themeName = `${this._family}-${this._mode}`;
    const available = listThemes();
    if (available.includes(themeName)) {
      applyTheme(themeName, this.target);
    }
  }
}

customElements.define('pages-theme-picker', PagesThemePickerElement);
