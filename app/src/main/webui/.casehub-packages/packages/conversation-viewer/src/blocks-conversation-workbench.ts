import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeyboardShortcutMixin } from '@casehubio/pages-primitives/a11y';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import { onPagesEvent, emitPagesEvent } from '@casehubio/pages-data';
import type {
  ConversationState, ConversationPoint,
  SubTaskFinding, FlagEntry, ObligationChain,
  GroundedFact, ConversationEntry,
} from './types.js';
import '@casehubio/pages-ui-components/split-workbench';
import './blocks-convergence-indicator.js';
import './blocks-point-list.js';
import './blocks-point-detail.js';
import './blocks-common-ground-panel.js';

export interface ConversationWorkbenchProps {
  conversationState?: ConversationState;
  selectionTopic: string;
  factTopic: string;
}

@customElement('blocks-conversation-workbench')
export class ConversationWorkbench extends KeyboardShortcutMixin(LiveRegionMixin(LitElement)) {
  @property({ attribute: false }) conversationState?: ConversationState;
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = 'conversation-point';
  @property({ type: String, attribute: 'fact-topic' }) factTopic = 'common-ground-fact';
  @property({ attribute: false }) renderPoint?: (point: ConversationPoint) => TemplateResult | undefined;
  @property({ attribute: false }) renderEntry?: (entry: ConversationEntry) => TemplateResult | undefined;
  @property({ attribute: false }) renderFact?: (fact: GroundedFact) => TemplateResult | undefined;

  @state() _selectedPointId: string | null = null;
  @state() private _selectedPoint: ConversationPoint | undefined = undefined;
  @state() private _filteredFindings: SubTaskFinding[] = [];
  @state() private _filteredFlags: FlagEntry[] = [];
  @state() private _filteredObligations: ObligationChain[] = [];

  private _unsubs: Array<() => void> = [];

  static override styles = css`
    :host { display: block; height: 100%; font-family: var(--pages-font-family, system-ui); }
    pages-split-workbench { height: 100%; }
    .left-panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .left-panel blocks-convergence-indicator {
      flex-shrink: 0; position: sticky; top: 0; z-index: 1;
      background: var(--pages-neutral-1, #fafafa);
      border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4);
    }
    .left-panel blocks-point-list { flex: 1; overflow: hidden; }
    .detail-panel { height: 100%; overflow: hidden; }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-label', 'Conversation viewer');
    this._unsubs.push(
      onPagesEvent<{ pointId: string }>(document, `${this.selectionTopic}:selected`, (payload) => {
        this._selectedPointId = payload.pointId;
      }),
      onPagesEvent<{ pointId: string }>(document, `${this.selectionTopic}:deselected`, () => {
        this._selectedPointId = null;
      }),
    );
    this.registerShortcut('Escape', () => {
      if (this._selectedPointId) {
        this._selectedPointId = null;
        emitPagesEvent(this, `${this.selectionTopic}:deselected`, {});
      }
    }, { description: 'Deselect point' });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubs.forEach(u => u());
    this._unsubs = [];
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('_selectedPointId') || changed.has('conversationState')) {
      this._deriveSelection(changed.has('_selectedPointId'));
    }
  }

  private _deriveSelection(selectionChanged: boolean): void {
    if (!this.conversationState || this._selectedPointId == null) {
      if (selectionChanged && this._selectedPoint) {
        this.announce('Showing common ground');
      }
      this._selectedPoint = undefined;
      this._filteredFindings = [];
      this._filteredFlags = [];
      this._filteredObligations = [];
      return;
    }

    const point = this.conversationState.points.find(p => p.id === this._selectedPointId);
    if (!point) {
      this._selectedPointId = null;
      emitPagesEvent(this, `${this.selectionTopic}:deselected`, {});
      this.announce('Showing common ground');
      this._selectedPoint = undefined;
      this._filteredFindings = [];
      this._filteredFlags = [];
      this._filteredObligations = [];
      return;
    }

    this._selectedPoint = point;
    this._filteredFindings = this.conversationState.subTaskFindings.filter(f => f.pointId === this._selectedPointId);
    this._filteredFlags = this.conversationState.humanFlags.filter(f => f.pointId === this._selectedPointId);
    this._filteredObligations = this.conversationState.obligations.filter(o => o.pointId === this._selectedPointId);

    if (selectionChanged) {
      this.announce(`Showing point: ${point.topic}`);
    }
  }

  configure(props: { conversationState?: ConversationState; selectionTopic?: string }): void {
    if (props.conversationState !== undefined) this.conversationState = props.conversationState;
    if (props.selectionTopic !== undefined) this.selectionTopic = props.selectionTopic;
    this.requestUpdate();
  }

  override render(): TemplateResult {
    return html`
      <pages-split-workbench selection-topic=${this.selectionTopic}>
        <div slot="list" class="left-panel">
          <blocks-convergence-indicator
            .signal=${this.conversationState?.convergence}
            size="sm"
          ></blocks-convergence-indicator>
          <blocks-point-list
            .points=${this.conversationState?.points ?? []}
            .currentRound=${this.conversationState?.currentRound ?? 0}
            .selectionTopic=${this.selectionTopic}
            .renderPoint=${this.renderPoint}
          ></blocks-point-list>
        </div>
        <div slot="detail" class="detail-panel">
          ${this._renderRightPane()}
        </div>
      </pages-split-workbench>
    `;
  }

  private _renderRightPane(): TemplateResult {
    if (this._selectedPoint) {
      return html`
        <blocks-point-detail
          .point=${this._selectedPoint}
          .findings=${this._filteredFindings}
          .flags=${this._filteredFlags}
          .obligations=${this._filteredObligations}
          .renderEntry=${this.renderEntry}
        ></blocks-point-detail>
      `;
    }
    return html`
      <blocks-common-ground-panel
        .commonGround=${this.conversationState?.commonGround}
        .factTopic=${this.factTopic}
        .renderFact=${this.renderFact}
      ></blocks-common-ground-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-conversation-workbench': ConversationWorkbench;
  }
}
