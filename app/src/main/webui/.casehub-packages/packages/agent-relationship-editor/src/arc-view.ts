import { LitElement, html, css, nothing, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AgentRelationship, RelationshipKind } from '@casehubio/mosaic-graph-stencil-org';
import { lookupRelationshipType } from '@casehubio/mosaic-core';
import type { AgentRosterEntry } from './types.js';

function kindToRegistryKey(kind: RelationshipKind): string {
  return kind.toLowerCase();
}

@customElement('arc-view')
export class ArcView extends LitElement {
  static override styles = css`
    :host { display: block; }
    svg { width: 100%; }
    .arc-label {
      font-size: 11px;
      fill: var(--pages-neutral-11, #262626);
    }
    .arc-label-ego {
      font-weight: 700;
    }
  `;

  @property({ type: String, attribute: 'agent-id' }) agentId = '';
  @property({ attribute: false }) relationships: AgentRelationship[] = [];
  @property({ attribute: false }) roster: AgentRosterEntry[] = [];

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', 'Relationship arc diagram');
  }

  private _getAgentName(agentId: string): string {
    const entry = this.roster.find(r => r.agentId === agentId);
    return entry?.name ?? agentId;
  }

  private _getConnectedAgents(): string[] {
    const connected = new Set<string>();
    for (const rel of this.relationships) {
      if (rel.sourceAgentId === this.agentId) connected.add(rel.targetAgentId);
      if (rel.targetAgentId === this.agentId) connected.add(rel.sourceAgentId);
    }
    return [...connected];
  }

  override render() {
    const connected = this._getConnectedAgents();
    if (connected.length === 0) return html`<div>No connections.</div>`;

    const padding = 20;
    const rowHeight = 28;
    const egoY = padding;
    const svgHeight = padding + rowHeight * (connected.length + 1) + padding;
    const svgWidth = 400;
    const egoX = 60;
    const otherX = 260;

    return html`
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <text class="arc-label arc-label-ego" x="${egoX}" y="${egoY + 14}" text-anchor="middle">
          ${this._getAgentName(this.agentId)}
        </text>

        ${connected.map((agentId, i) => {
          const otherY = padding + rowHeight * (i + 1);
          const midY = (egoY + otherY) / 2;

          const outgoing = this.relationships.filter(
            r => r.sourceAgentId === this.agentId && r.targetAgentId === agentId
          );
          const incoming = this.relationships.filter(
            r => r.targetAgentId === this.agentId && r.sourceAgentId === agentId
          );

          return svg`
            <text class="arc-label" x="${otherX}" y="${otherY + 14}" text-anchor="middle">
              ${this._getAgentName(agentId)}
            </text>

            ${outgoing.map(rel => {
              const desc = lookupRelationshipType(kindToRegistryKey(rel.kind));
              const arcRadius = Math.abs(otherY - egoY) / 2 + 30;
              return svg`
                <path
                  d="M ${egoX + 40} ${egoY + 10} Q ${(egoX + otherX) / 2} ${midY - arcRadius} ${otherX - 40} ${otherY + 10}"
                  fill="none"
                  stroke="${desc.color}"
                  stroke-width="1.5"
                  stroke-dasharray="${desc.style === 'dashed' ? '4,3' : desc.style === 'dotted' ? '2,3' : 'none'}"
                />
              `;
            })}

            ${incoming.map(rel => {
              const desc = lookupRelationshipType(kindToRegistryKey(rel.kind));
              const arcRadius = Math.abs(otherY - egoY) / 2 + 30;
              return svg`
                <path
                  d="M ${otherX - 40} ${otherY + 10} Q ${(egoX + otherX) / 2} ${midY + arcRadius} ${egoX + 40} ${egoY + 10}"
                  fill="none"
                  stroke="${desc.color}"
                  stroke-width="1.5"
                  stroke-dasharray="${desc.style === 'dashed' ? '4,3' : desc.style === 'dotted' ? '2,3' : 'none'}"
                />
              `;
            })}
          `;
        })}
      </svg>
    `;
  }
}
