import { html, type TemplateResult } from 'lit-html';
import type { OnChange } from './render-auth-config.js';
import { renderAuthConfig } from './render-auth-config.js';

export function renderA2AForm(
  data: Record<string, unknown>,
  readonly: boolean,
  onChange: OnChange,
): TemplateResult {
  const endpoint = String(data['endpoint'] ?? '');
  const skill = String(data['skill'] ?? '');
  const streaming = Boolean(data['streaming']);
  const auth = data['auth'] as Record<string, unknown> | undefined;

  return html`
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">Endpoint *
        <input type="text" style="width: 100%; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
          .value=${endpoint}
          @blur=${(e: Event) => onChange(['endpoint'], (e.target as HTMLInputElement).value)}>
      </label>

      <label style="font-size: 12px; color: var(--pages-text-color, #333);">Skill
        <input type="text" style="width: 100%; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
          .value=${skill}
          @blur=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value;
            onChange(['skill'], v || undefined);
          }}>
      </label>

      <label style="font-size: 12px; display: flex; align-items: center; gap: 6px; color: var(--pages-text-color, #333);">
        <input type="checkbox" ?checked=${streaming} ?disabled=${readonly}
          @change=${(e: Event) => onChange(['streaming'], (e.target as HTMLInputElement).checked || undefined)}>
        Streaming
      </label>

      ${renderAuthConfig(auth, onChange)}
    </div>
  `;
}
