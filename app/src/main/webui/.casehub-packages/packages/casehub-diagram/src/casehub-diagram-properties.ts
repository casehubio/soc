import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property as litProp } from 'lit/decorators.js';
import { renderPropertyForm, emitPropertyChange } from '@casehubio/diagram-core';
import {
  detectFunctionType,
  FUNCTION_TYPE_KEYS,
  renderAgentForm, renderA2AForm, renderMcpForm,
  renderSequenceForm, renderUnknownForm,
} from '@casehubio/graph-stencil-case';
import type { WorkerFunctionType, McpTransportType } from '@casehubio/graph-stencil-case';

export { renderPropertyForm, emitPropertyChange };

const FUNCTION_TYPE_LABELS: Record<WorkerFunctionType, string> = {
  agent: 'Agent', flow: 'Flow', a2a: 'A2A', mcp: 'MCP',
  sequence: 'Sequence', external: 'External (none)', unknown: 'Unknown',
};

@customElement('casehub-diagram-properties')
export class CasehubDiagramProperties extends LitElement {
  @litProp({ attribute: false }) schema: Record<string, unknown> = {};
  @litProp({ attribute: false }) data: Record<string, unknown> = {};
  @litProp({ type: Boolean }) readonly = false;
  @litProp({ type: String }) selectedType = '';
  @litProp({ attribute: false }) workerNames: string[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', 'Diagram properties');
  }

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui, sans-serif); }
    .panel { padding: 12px; overflow-y: auto; height: 100%; box-sizing: border-box; }
    .panel-header { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--pages-text-color, #333); }
  `;

  private _currentTargetType(): string | null {
    if (this.data['capability'] !== undefined) return 'capability';
    if (this.data['subCase'] !== undefined) return 'subCase';
    if (this.data['humanTask'] !== undefined) return 'humanTask';
    return null;
  }

  private _renderTargetSelector(): TemplateResult | typeof nothing {
    const targetType = this._currentTargetType();
    if (!targetType) return nothing;

    return html`
      <label style="font-size: 12px; color: var(--pages-text-color, #333); margin-bottom: 8px; display: block;">
        Target type
        <select style="width: 100%; font-size: 12px; padding: 4px; margin-top: 2px;"
          ?disabled=${this.readonly}
          @change=${(e: Event) => {
            const newType = (e.target as HTMLSelectElement).value as 'capability' | 'subCase' | 'humanTask';
            if (newType !== targetType) {
              this.dispatchEvent(new CustomEvent('target-type-change', {
                bubbles: true, composed: true, detail: { targetType: newType },
              }));
            }
          }}>
          <option value="capability" ?selected=${targetType === 'capability'}>Capability</option>
          <option value="subCase" ?selected=${targetType === 'subCase'}>SubCase</option>
          <option value="humanTask" ?selected=${targetType === 'humanTask'}>HumanTask</option>
        </select>
      </label>
    `;
  }

  private _filteredSchema(): Record<string, unknown> {
    if (this.selectedType !== 'worker') return this.schema;
    const props = (this.schema.properties ?? {}) as Record<string, unknown>;
    const filtered = Object.fromEntries(
      Object.entries(props).filter(([k]) => !(FUNCTION_TYPE_KEYS as readonly string[]).includes(k)),
    );
    return { ...this.schema, properties: filtered };
  }

  private _renderFunctionTypeSection(): TemplateResult | typeof nothing {
    if (this.selectedType !== 'worker') return nothing;

    const fnType = detectFunctionType(this.data);
    const onChange = (field: (string | number)[], value: unknown): void => {
      this.dispatchEvent(emitPropertyChange(field, value));
    };

    return html`
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--pages-border-color, #ddd);">
        <div style="font-size: 12px; font-weight: 600; color: var(--pages-text-color, #333); margin-bottom: 6px;">Function</div>
        <label style="font-size: 12px; color: var(--pages-text-color, #333); display: block; margin-bottom: 8px;">Type
          <select style="width: 100%; font-size: 12px; padding: 4px; margin-top: 2px;"
            ?disabled=${this.readonly || fnType === 'unknown'}
            @change=${(e: Event) => {
              const newType = (e.target as HTMLSelectElement).value as WorkerFunctionType;
              if (newType !== fnType) {
                this.dispatchEvent(new CustomEvent('function-type-change', {
                  bubbles: true, composed: true, detail: { newType },
                }));
              }
            }}>
            ${(Object.keys(FUNCTION_TYPE_LABELS) as WorkerFunctionType[]).map(t => html`
              <option value=${t} ?selected=${t === fnType} ?disabled=${t === 'unknown'}>${FUNCTION_TYPE_LABELS[t]}</option>
            `)}
          </select>
        </label>
        ${this._renderFunctionForm(fnType, onChange)}
      </div>
    `;
  }

  private _renderFunctionForm(fnType: WorkerFunctionType, onChange: (field: (string | number)[], value: unknown) => void): TemplateResult | typeof nothing {
    switch (fnType) {
      case 'agent': {
        const agentData = (this.data['agent'] ?? {}) as Record<string, unknown>;
        return renderAgentForm(
          agentData, this.readonly,
          (field, value) => onChange(['agent', ...field], value),
          (value: string) => {
            this.dispatchEvent(new CustomEvent('prompt-editor-open', {
              bubbles: true, composed: true, detail: { value },
            }));
          },
        );
      }
      case 'a2a': {
        const a2aData = (this.data['a2a'] ?? {}) as Record<string, unknown>;
        return renderA2AForm(
          a2aData, this.readonly,
          (field, value) => onChange(['a2a', ...field], value),
        );
      }
      case 'mcp': {
        const mcpData = (this.data['mcp'] ?? {}) as Record<string, unknown>;
        return renderMcpForm(
          mcpData, this.readonly,
          (field, value) => onChange(['mcp', ...field], value),
          (transport: McpTransportType) => {
            this.dispatchEvent(new CustomEvent('mcp-transport-change', {
              bubbles: true, composed: true, detail: { transport },
            }));
          },
        );
      }
      case 'sequence': {
        const seqData = (this.data['sequence'] ?? []) as string[];
        return renderSequenceForm(
          seqData, this.readonly,
          (_field, value) => onChange(['sequence'], value),
          this.workerNames,
        );
      }
      case 'flow':
        return html`<div style="font-size: 11px; color: var(--pages-text-tertiary, #999); font-style: italic;">Edit via SWF diagram drill-down (⤢ on stencil)</div>`;
      case 'unknown':
        return renderUnknownForm(this.data);
      case 'external':
        return nothing;
    }
  }

  override render() {
    const nodeName = String(this.data['name'] ?? this.data['type'] ?? 'Properties');

    return html`
      <div class="panel">
        <div class="panel-header">${nodeName}</div>
        ${this._renderTargetSelector()}
        ${renderPropertyForm(this._filteredSchema(), this.data, this.readonly, (field, value) => {
          this.dispatchEvent(emitPropertyChange(field, value));
        })}
        ${this._renderFunctionTypeSection()}
      </div>
    `;
  }
}
