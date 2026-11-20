import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { buildAvatar } from './builder.js';
import { decodeCode } from './code.js';
import { getCollection } from './collections/registry.js';
import { ARCHETYPE_CONFIGS } from './config-table.js';
import { FAMILY_PALETTES } from './palettes.js';
import type { AvatarSize, FixedCollection } from './types.js';
import { AVATAR_SIZES, isFixedCollection } from './types.js';

export interface AgentAvatarProps {
  archetype?: { family: string; subArchetype: string };
  code?: string;
  size?: AvatarSize;
  collection?: string;
}

@customElement('agent-avatar')
export class AgentAvatar extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      line-height: 0;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `;

  @property({ type: Object }) archetype?: { family: string; subArchetype: string };
  @property({ type: String }) code?: string;
  @property({ type: String }) size: AvatarSize = 'md';
  @property({ type: String }) collection: string = 'mythic';

  private _userAriaLabel = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'img');
    }
    if (this.hasAttribute('aria-label')) {
      this._userAriaLabel = true;
    }
  }

  protected override willUpdate(): void {
    if (!this._userAriaLabel) {
      const label = this._computeAriaLabel();
      this.setAttribute('aria-label', label);
    }
    const px = AVATAR_SIZES[this.size] ?? AVATAR_SIZES.md;
    this.style.width = `${px}px`;
    this.style.height = `${Math.round(px * 1.2)}px`;
  }

  private _computeAriaLabel(): string {
    if (this.archetype) {
      return `${this.archetype.family} ${this.archetype.subArchetype} avatar`;
    }
    if (this.code) {
      return `Avatar ${this.code}`;
    }
    return 'Avatar';
  }

  private _buildSvg(): string {
    const coll = getCollection(this.collection);
    if (!coll) return this._fallbackSvg();

    if (isFixedCollection(coll)) {
      return this._renderFixed(coll);
    }

    if (this.archetype) {
      const key = `${this.archetype.family}/${this.archetype.subArchetype}`;
      const config = ARCHETYPE_CONFIGS[key];
      const palette = FAMILY_PALETTES[this.archetype.family as keyof typeof FAMILY_PALETTES];
      if (config && palette) {
        return buildAvatar(config, palette, this.size, coll);
      }
    }

    if (this.code) {
      const decoded = decodeCode(this.code);
      const key = decoded.archetypeKey ?? Object.keys(ARCHETYPE_CONFIGS)[0]!;
      const family = key.split('/')[0]!;
      const palette = FAMILY_PALETTES[family as keyof typeof FAMILY_PALETTES];
      if (palette) {
        return buildAvatar(decoded.assignment, palette, this.size, coll);
      }
    }

    return this._fallbackSvg();
  }

  private _renderFixed(coll: FixedCollection): string {
    const key = this.archetype
      ? `${this.archetype.family}/${this.archetype.subArchetype}`
      : null;
    if (!key) return this._fallbackSvg();
    return coll.fixedSvgs.get(key) ?? this._fallbackSvg();
  }

  private _fallbackSvg(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"><circle cx="100" cy="100" r="40" fill="#ccc"/></svg>';
  }

  protected override render() {
    return html`${unsafeHTML(this._buildSvg())}`;
  }
}
