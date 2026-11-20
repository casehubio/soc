import { html, nothing, type TemplateResult } from 'lit-html';
import type { OnChange } from './render-auth-config.js';
import { detectModelProvider } from '../detect.js';
import { MODEL_PROVIDERS } from '../types.js';

export function renderAgentForm(
  data: Record<string, unknown>,
  readonly: boolean,
  onChange: OnChange,
  onPopOut: (value: string) => void,
): TemplateResult {
  const systemPrompt = String(data['systemPrompt'] ?? '');
  const inputProjection = String(data['inputProjection'] ?? '');
  const outputProjection = String(data['outputProjection'] ?? '');
  const userMessageTemplate = String(data['userMessageTemplate'] ?? '');
  const model = (data['model'] ?? {}) as Record<string, unknown>;
  const provider = detectModelProvider(model);
  const providerConfig = provider ? (model[provider] ?? {}) as Record<string, unknown> : {};

  return html`
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">System Prompt
        <div style="display: flex; gap: 4px; align-items: flex-start;">
          <textarea rows="3" style="flex: 1; font-family: monospace; font-size: 12px; padding: 4px; resize: vertical;" ?disabled=${readonly}
            .value=${systemPrompt}
            @blur=${(e: Event) => onChange(['systemPrompt'], (e.target as HTMLTextAreaElement).value)}></textarea>
          <button type="button" style="border: 1px solid var(--pages-border-color, #ddd); background: var(--pages-surface-color, #fff); cursor: pointer; padding: 2px 6px; font-size: 11px; border-radius: 3px;" title="Pop out editor"
            @click=${() => onPopOut(systemPrompt)}>⤢</button>
        </div>
      </label>

      <label style="font-size: 12px; color: var(--pages-text-color, #333);">Input Projection
        <input type="text" style="width: 100%; font-family: monospace; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
          .value=${inputProjection}
          @blur=${(e: Event) => onChange(['inputProjection'], (e.target as HTMLInputElement).value)}>
      </label>

      <label style="font-size: 12px; color: var(--pages-text-color, #333);">Output Projection
        <input type="text" style="width: 100%; font-family: monospace; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
          .value=${outputProjection}
          @blur=${(e: Event) => onChange(['outputProjection'], (e.target as HTMLInputElement).value)}>
      </label>

      <label style="font-size: 12px; color: var(--pages-text-color, #333);">User Message Template
        <textarea rows="2" style="width: 100%; font-family: monospace; font-size: 12px; padding: 4px; box-sizing: border-box; resize: vertical;" ?disabled=${readonly}
          .value=${userMessageTemplate}
          @blur=${(e: Event) => {
            const v = (e.target as HTMLTextAreaElement).value;
            onChange(['userMessageTemplate'], v || undefined);
          }}></textarea>
      </label>

      <label style="font-size: 12px; color: var(--pages-text-color, #333); font-weight: 600;">Model</label>
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">Provider
        <select style="width: 100%; font-size: 12px; padding: 4px;" ?disabled=${readonly}
          @change=${(e: Event) => {
            const newProvider = (e.target as HTMLSelectElement).value;
            onChange(['model'], { [newProvider]: { modelName: '' } });
          }}>
          ${MODEL_PROVIDERS.map(p => html`<option value=${p} ?selected=${p === provider}>${p}</option>`)}
        </select>
      </label>

      ${provider ? renderProviderFields(providerConfig, readonly, (field, value) => {
        onChange(['model', provider, ...field], value);
      }) : nothing}
    </div>
  `;
}

function renderProviderFields(
  config: Record<string, unknown>,
  readonly: boolean,
  onChange: OnChange,
): TemplateResult {
  const modelName = String(config['modelName'] ?? '');
  const apiKey = String(config['apiKey'] ?? '');
  const temperature = config['temperature'] as number | undefined;
  const maxTokens = config['maxTokens'] as number | undefined;
  const topP = config['topP'] as number | undefined;

  return html`
    <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 8px; border-left: 2px solid var(--pages-border-color, #ddd);">
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">Model Name *
        <input type="text" style="width: 100%; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
          .value=${modelName}
          @blur=${(e: Event) => onChange(['modelName'], (e.target as HTMLInputElement).value)}>
      </label>
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">API Key
        <input type="text" style="width: 100%; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
          .value=${apiKey}
          @blur=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value;
            onChange(['apiKey'], v || undefined);
          }}>
      </label>
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">Temperature
        <input type="number" min="0" max="2" step="0.1" style="width: 100%; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
          .value=${String(temperature ?? '')}
          @blur=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value;
            onChange(['temperature'], v === '' ? undefined : Number(v));
          }}>
      </label>
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">Max Tokens
        <input type="number" min="1" style="width: 100%; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
          .value=${String(maxTokens ?? '')}
          @blur=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value;
            onChange(['maxTokens'], v === '' ? undefined : Number(v));
          }}>
      </label>
      <label style="font-size: 12px; color: var(--pages-text-color, #333);">Top P
        <input type="number" min="0" max="1" step="0.05" style="width: 100%; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
          .value=${String(topP ?? '')}
          @blur=${(e: Event) => {
            const v = (e.target as HTMLInputElement).value;
            onChange(['topP'], v === '' ? undefined : Number(v));
          }}>
      </label>
    </div>
  `;
}
