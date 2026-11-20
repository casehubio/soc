import { html, nothing, type TemplateResult } from 'lit-html';

export type OnChange = (field: (string | number)[], value: unknown) => void;

export function renderAuthConfig(
  auth: Record<string, unknown> | undefined,
  onChange: OnChange,
): TemplateResult {
  const authType = String(auth?.['type'] ?? 'none');
  const tokenKey = String(auth?.['tokenConfigKey'] ?? '');

  return html`
    <div style="margin-top: 6px; padding: 8px; background: var(--pages-surface-raised, #f5f5f5); border-radius: 4px;">
      <label style="font-size: 11px; color: var(--pages-text-secondary, #666); font-weight: 600;">Auth</label>
      <label style="font-size: 12px; color: var(--pages-text-color, #333); display: block; margin-top: 4px;">Type
        <select style="width: 100%; font-size: 12px; padding: 4px; margin-top: 2px;"
          @change=${(e: Event) => {
            const val = (e.target as HTMLSelectElement).value;
            onChange(['auth', 'type'], val);
            if (val === 'none') onChange(['auth', 'tokenConfigKey'], undefined);
          }}>
          <option value="none" ?selected=${authType === 'none'}>None</option>
          <option value="bearer" ?selected=${authType === 'bearer'}>Bearer</option>
          <option value="api-key" ?selected=${authType === 'api-key'}>API Key</option>
        </select>
      </label>
      ${authType !== 'none' ? html`
        <label style="font-size: 12px; color: var(--pages-text-color, #333); display: block; margin-top: 4px;">Token Config Key
          <input type="text" style="width: 100%; font-size: 12px; padding: 4px; margin-top: 2px; box-sizing: border-box;"
            .value=${tokenKey}
            @blur=${(e: Event) => {
              const v = (e.target as HTMLInputElement).value;
              onChange(['auth', 'tokenConfigKey'], v || undefined);
            }}>
        </label>
      ` : nothing}
    </div>
  `;
}
