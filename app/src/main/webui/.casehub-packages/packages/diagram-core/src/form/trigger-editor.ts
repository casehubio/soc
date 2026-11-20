import { html, nothing, type TemplateResult } from 'lit-html';

export type TriggerType = 'contextChange' | 'cloudEvent' | 'schedule' | 'scopeActivated';
const TRIGGER_TYPES: TriggerType[] = ['contextChange', 'cloudEvent', 'schedule', 'scopeActivated'];
const TRIGGER_LABELS: Record<TriggerType, string> = {
  contextChange: 'Context Change',
  cloudEvent: 'Cloud Event',
  schedule: 'Schedule',
  scopeActivated: 'Scope Activated',
};

export function detectTriggerType(on: Record<string, unknown>): TriggerType | null {
  for (const t of TRIGGER_TYPES) {
    if (on[t] !== undefined) return t;
  }
  return null;
}

export function renderTriggerEditor(
  data: Record<string, unknown>,
  onChange: (value: Record<string, unknown>) => void,
): TemplateResult {
  const current = detectTriggerType(data);

  const handleTypeChange = (type: TriggerType) => {
    const newTrigger: Record<string, unknown> = {};
    if (type === 'contextChange') newTrigger['contextChange'] = {};
    else if (type === 'cloudEvent') newTrigger['cloudEvent'] = '';
    else if (type === 'schedule') newTrigger['schedule'] = {};
    else if (type === 'scopeActivated') newTrigger['scopeActivated'] = {};
    onChange(newTrigger);
  };

  const handleSubFieldChange = (field: string, value: unknown) => {
    if (!current) return;
    const sub = (data[current] ?? {}) as Record<string, unknown>;
    const updated = { ...sub };
    if (value === undefined) {
      delete updated[field];
    } else {
      updated[field] = value;
    }
    onChange({ [current]: updated });
  };

  return html`
    <fieldset style="border: 1px solid var(--pages-border-color, #ddd); border-radius: 6px; padding: 8px; margin: 4px 0;">
      <legend style="font-size: 12px; font-weight: 600; color: var(--pages-text-secondary, #666);">Trigger</legend>
      <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
        ${TRIGGER_TYPES.map(t => html`
          <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; cursor: pointer;">
            <input type="radio" name="trigger-type" .checked=${current === t}
              @change=${() => handleTypeChange(t)}>
            ${TRIGGER_LABELS[t]}
          </label>
        `)}
      </div>
      ${current === 'contextChange' ? renderContextChangeSub(data['contextChange'] as Record<string, unknown> ?? {}, handleSubFieldChange) : nothing}
      ${current === 'cloudEvent' ? renderCloudEventSub(data['cloudEvent'], onChange) : nothing}
      ${current === 'schedule' ? renderScheduleSub(data['schedule'] as Record<string, unknown> ?? {}, handleSubFieldChange) : nothing}
    </fieldset>
  `;
}

function renderContextChangeSub(
  sub: Record<string, unknown>,
  onChange: (field: string, value: unknown) => void,
): TemplateResult {
  return html`
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <label style="font-size: 11px; color: var(--pages-text-secondary, #666);">Filter
        <textarea rows="2" style="width: 100%; font-family: monospace; font-size: 12px;"
          .value=${String(sub['filter'] ?? '')}
          @blur=${(e: Event) => onChange('filter', (e.target as HTMLTextAreaElement).value || undefined)}
        ></textarea>
      </label>
      <label style="font-size: 11px; color: var(--pages-text-secondary, #666);">Listen Layer
        <input type="text" style="width: 100%; font-size: 12px;"
          .value=${String(sub['listenLayer'] ?? '')}
          @blur=${(e: Event) => onChange('listenLayer', (e.target as HTMLInputElement).value || undefined)}
        >
      </label>
    </div>
  `;
}

function renderCloudEventSub(
  sub: unknown,
  onFullChange: (value: Record<string, unknown>) => void,
): TemplateResult {
  if (typeof sub === 'string') {
    return html`
      <label style="font-size: 11px; color: var(--pages-text-secondary, #666);">Event Type
        <input type="text" style="width: 100%; font-size: 12px;"
          .value=${sub}
          @blur=${(e: Event) => onFullChange({ cloudEvent: (e.target as HTMLInputElement).value })}
        >
      </label>
    `;
  }
  const obj = (sub ?? {}) as Record<string, unknown>;
  const updateField = (field: string, value: unknown) => {
    const updated = { ...obj };
    if (value === undefined) {
      delete updated[field];
    } else {
      updated[field] = value;
    }
    onFullChange({ cloudEvent: updated });
  };
  return html`
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <label style="font-size: 11px;">Type
        <input type="text" style="width: 100%; font-size: 12px;" .value=${String(obj['type'] ?? '')}
          @blur=${(e: Event) => updateField('type', (e.target as HTMLInputElement).value)}>
      </label>
      <label style="font-size: 11px;">Source
        <input type="text" style="width: 100%; font-size: 12px;" .value=${String(obj['source'] ?? '')}
          @blur=${(e: Event) => updateField('source', (e.target as HTMLInputElement).value || undefined)}>
      </label>
      <label style="font-size: 11px;">Filter
        <textarea rows="2" style="width: 100%; font-family: monospace; font-size: 12px;" .value=${String(obj['filter'] ?? '')}
          @blur=${(e: Event) => updateField('filter', (e.target as HTMLTextAreaElement).value || undefined)}>
        </textarea>
      </label>
    </div>
  `;
}

function renderScheduleSub(
  sub: Record<string, unknown>,
  onChange: (field: string, value: unknown) => void,
): TemplateResult {
  const hasCron = sub['cron'] !== undefined;
  return html`
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; gap: 8px;">
        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
          <input type="radio" name="schedule-mode" .checked=${hasCron}
            @change=${() => { onChange('every', undefined); if (!sub['cron']) onChange('cron', ''); }}>
          Cron
        </label>
        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
          <input type="radio" name="schedule-mode" .checked=${!hasCron}
            @change=${() => { onChange('cron', undefined); if (!sub['every']) onChange('every', ''); }}>
          Every
        </label>
      </div>
      ${hasCron
        ? html`<input type="text" style="width: 100%; font-size: 12px;" placeholder="*/5 * * * *"
            .value=${String(sub['cron'] ?? '')}
            @blur=${(e: Event) => onChange('cron', (e.target as HTMLInputElement).value)}>`
        : html`<input type="text" style="width: 100%; font-size: 12px;" placeholder="PT5M"
            .value=${String(sub['every'] ?? '')}
            @blur=${(e: Event) => onChange('every', (e.target as HTMLInputElement).value)}>`
      }
      <label style="font-size: 11px;">Timezone
        <input type="text" style="width: 100%; font-size: 12px;" placeholder="America/Vancouver"
          .value=${String(sub['timezone'] ?? '')}
          @blur=${(e: Event) => onChange('timezone', (e.target as HTMLInputElement).value || undefined)}>
      </label>
    </div>
  `;
}
