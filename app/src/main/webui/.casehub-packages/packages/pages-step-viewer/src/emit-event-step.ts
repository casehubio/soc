import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { EmitEventStep } from '@casehubio/yaml-core/step';
import type { DiffState, FieldChange } from '@casehubio/yaml-core/step/diff';
import { diffTokenStyles, diffMarkerStyles, renderDiffMarker, renderFieldChanges } from './diff-shared.js';

@customElement('emit-event-step')
export class EmitEventStepComponent extends LitElement {
  @property({ attribute: false }) step!: EmitEventStep;
  @property({ reflect: true, attribute: 'diff-state' }) diffState?: DiffState;
  @property({ attribute: false }) fieldChanges: FieldChange[] = [];

  static override styles = [diffTokenStyles, diffMarkerStyles, css`
    :host {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 12px; color: #cdd6f4;
      font-size: 12px; font-family: Inter, system-ui, sans-serif;
    }
    .icon { font-size: 14px; }
    .type-pill {
      background: rgba(137, 180, 250, 0.15); color: #89b4fa;
      padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
    }
    .count-badge {
      background: rgba(137, 180, 250, 0.25); color: #89b4fa;
      padding: 1px 6px; border-radius: 8px;
      font-size: 10px; font-weight: 700;
    }
    .emit-to-badge {
      background: rgba(166, 227, 161, 0.15); color: #a6e3a1;
      padding: 1px 6px; border-radius: 8px;
      font-size: 10px;
    }
    .batch { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  `];

  override render() {
    const { events, emitTo } = this.step;
    const isBatch = events.length > 1;

    return html`
      <span class="icon">&#x26A1;</span>
      ${isBatch
        ? html`
          <span class="count-badge">${events.length}</span>
          <span class="batch">
            ${events.map(e => html`<span class="type-pill">${e.type}</span>`)}
          </span>`
        : html`<span class="type-pill">${events[0]?.type ?? ''}</span>`
      }
      ${emitTo !== 'both' ? html`<span class="emit-to-badge">${emitTo}</span>` : nothing}
      ${renderDiffMarker(this.diffState)}
      ${renderFieldChanges(this.fieldChanges)}
    `;
  }
}
