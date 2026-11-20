import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ChannelMember, PresenceState } from './types.js';
import '@casehubio/pages-ui-components';

interface MemberWithPresence {
  member: ChannelMember;
  presence: PresenceState;
}

@customElement('agency-channel-member-panel')
export class ChannelMemberPanelElement extends LitElement {
  static override readonly styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family);
      color: var(--pages-neutral-12);
      background: var(--pages-neutral-1);
    }
    .empty-state {
      padding: var(--pages-space-4);
      text-align: center;
      color: var(--pages-neutral-9);
      font-size: var(--pages-font-size-sm);
    }
    .section-header {
      padding: var(--pages-space-2) var(--pages-space-3);
      font-size: var(--pages-font-size-xs);
      font-weight: var(--pages-font-weight-semibold);
      color: var(--pages-neutral-11);
      text-transform: uppercase;
      background: var(--pages-neutral-2);
      border-bottom: 1px solid var(--pages-neutral-4);
    }
    .member-item {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2);
      padding: var(--pages-space-2) var(--pages-space-3);
      border-bottom: 1px solid var(--pages-neutral-3);
    }
    .member-item:hover { background: var(--pages-neutral-2); }
    pages-status-dot {
      margin-top: 1px;
    }
    .role-badge {
      font-size: var(--pages-font-size-sm);
      line-height: 1;
    }
    .member-info {
      flex: 1;
      min-width: 0;
    }
    .member-name {
      font-size: var(--pages-font-size-sm);
      font-weight: var(--pages-font-weight-medium);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status-message {
      font-size: var(--pages-font-size-xs);
      color: var(--pages-neutral-9);
      margin-top: var(--pages-space-1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;

  @property({ type: Array }) members: ChannelMember[] = [];
  @property({ type: Array }) presence: PresenceState[] = [];

  private getPresence(memberId: string): PresenceState {
    return this.presence.find((p) => p.memberId === memberId) || {
      memberId,
      status: 'OFFLINE',
    };
  }

  private getSortedMembers(): MemberWithPresence[] {
    const membersWithPresence = this.members.map((member) => ({
      member,
      presence: this.getPresence(member.memberId),
    }));
    const statusOrder = { ONLINE: 0, AVAILABLE: 1, BUSY: 2, AWAY: 3, OFFLINE: 4 };
    return membersWithPresence.sort((a, b) => {
      const statusDiff = statusOrder[a.presence.status] - statusOrder[b.presence.status];
      if (statusDiff !== 0) return statusDiff;
      return a.member.displayName.localeCompare(b.member.displayName);
    });
  }

  private groupMembers(members: MemberWithPresence[]): Map<string, MemberWithPresence[]> {
    const groups = new Map<string, MemberWithPresence[]>();
    groups.set('Online', []);
    groups.set('Away', []);
    groups.set('Offline', []);

    members.forEach((m) => {
      const status = m.presence.status;
      if (status === 'ONLINE' || status === 'AVAILABLE' || status === 'BUSY') {
        groups.get('Online')!.push(m);
      } else if (status === 'AWAY') {
        groups.get('Away')!.push(m);
      } else {
        groups.get('Offline')!.push(m);
      }
    });
    return groups;
  }

  private getPresenceVariant(status: PresenceState['status']): 'success' | 'warning' | 'danger' | 'neutral' {
    if (status === 'ONLINE' || status === 'AVAILABLE') return 'success';
    if (status === 'BUSY') return 'danger';
    if (status === 'AWAY') return 'warning';
    return 'neutral';
  }

  private getRoleBadge(role: ChannelMember['role']): string {
    switch (role) {
      case 'MODERATOR': return '🛡️';
      case 'OBSERVER': return '👁️';
      case 'PARTICIPANT': return '';
    }
  }

  override render() {
    if (this.members.length === 0) {
      return html`<div class="empty-state">No members</div>`;
    }

    const sortedMembers = this.getSortedMembers();
    const groups = this.groupMembers(sortedMembers);

    return html`
      ${Array.from(groups.entries()).map(
        ([groupName, groupMembers]) =>
          groupMembers.length > 0
            ? html`
                <div class="section-header">${groupName}</div>
                ${groupMembers.map(
                  ({ member, presence }) => html`
                    <div class="member-item">
                      <pages-status-dot variant="${this.getPresenceVariant(presence.status)}"></pages-status-dot>
                      <span class="role-badge">${this.getRoleBadge(member.role)}</span>
                      <div class="member-info">
                        <div class="member-name">${member.displayName}</div>
                        ${presence.statusMessage
                          ? html`<div class="status-message">${presence.statusMessage}</div>`
                          : ''}
                      </div>
                    </div>
                  `
                )}
              `
            : ''
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-channel-member-panel': ChannelMemberPanelElement;
  }
}
