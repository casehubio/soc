import { html, nothing, type TemplateResult } from 'lit-html';
import type { OnChange } from './render-auth-config.js';
import type { McpTransportType } from '../types.js';
import { detectMcpTransport } from '../detect.js';
import { renderAuthConfig } from './render-auth-config.js';

export function renderMcpForm(
  data: Record<string, unknown>,
  readonly: boolean,
  onChange: OnChange,
  onTransportSwitch: (transport: McpTransportType) => void,
): TemplateResult {
  const transport = detectMcpTransport(data);
  const command = (data['command'] as string[] | undefined) ?? [];
  const env = data['env'] as Record<string, string> | undefined;
  const url = String(data['url'] ?? '');
  const auth = data['auth'] as Record<string, unknown> | undefined;

  const envText = env ? Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') : '';

  return html`
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="font-size: 12px; color: var(--pages-text-color, #333); font-weight: 600;">Transport</div>
      <div style="display: flex; gap: 12px; font-size: 12px;">
        <label style="display: flex; align-items: center; gap: 4px;">
          <input type="radio" name="mcp-transport" value="stdio" ?checked=${transport === 'stdio'} ?disabled=${readonly}
            @change=${() => onTransportSwitch('stdio')}>
          Stdio
        </label>
        <label style="display: flex; align-items: center; gap: 4px;">
          <input type="radio" name="mcp-transport" value="http" ?checked=${transport === 'http'} ?disabled=${readonly}
            @change=${() => onTransportSwitch('http')}>
          HTTP
        </label>
      </div>

      ${transport === 'stdio' ? html`
        <label style="font-size: 12px; color: var(--pages-text-color, #333);">Command
          <textarea rows="3" style="width: 100%; font-size: 12px; padding: 4px; font-family: monospace; box-sizing: border-box; resize: vertical;" ?disabled=${readonly}
            .value=${command.join('\n')}
            @blur=${(e: Event) => {
              const lines = (e.target as HTMLTextAreaElement).value.split('\n').filter(l => l.trim());
              onChange(['command'], lines.length > 0 ? lines : []);
            }}></textarea>
          <span style="font-size: 10px; color: var(--pages-text-tertiary, #999);">One argument per line</span>
        </label>

        <label style="font-size: 12px; color: var(--pages-text-color, #333);">Environment
          <textarea rows="2" style="width: 100%; font-size: 12px; padding: 4px; font-family: monospace; box-sizing: border-box; resize: vertical;" ?disabled=${readonly}
            .value=${envText}
            @blur=${(e: Event) => {
              const text = (e.target as HTMLTextAreaElement).value;
              const entries = text.split('\n').filter(l => l.includes('='));
              if (entries.length === 0) {
                onChange(['env'], undefined);
              } else {
                const obj: Record<string, string> = {};
                for (const line of entries) {
                  const eqIdx = line.indexOf('=');
                  obj[line.slice(0, eqIdx).trim()] = line.slice(eqIdx + 1).trim();
                }
                onChange(['env'], obj);
              }
            }}></textarea>
          <span style="font-size: 10px; color: var(--pages-text-tertiary, #999);">KEY=VALUE per line</span>
        </label>
      ` : nothing}

      ${transport === 'http' ? html`
        <label style="font-size: 12px; color: var(--pages-text-color, #333);">URL *
          <input type="text" style="width: 100%; font-size: 12px; padding: 4px; box-sizing: border-box;" ?disabled=${readonly}
            .value=${url}
            @blur=${(e: Event) => onChange(['url'], (e.target as HTMLInputElement).value)}>
        </label>
        ${renderAuthConfig(auth, onChange)}
      ` : nothing}

      ${transport === null ? html`
        <div style="font-size: 11px; color: var(--pages-text-tertiary, #999); font-style: italic;">Malformed MCP config — neither command nor url present</div>
      ` : nothing}
    </div>
  `;
}
