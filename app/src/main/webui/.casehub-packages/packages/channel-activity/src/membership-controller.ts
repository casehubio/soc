import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PushController, DatasetOp } from './push-controller.js';
import type { ChannelStateController } from './channel-state-controller.js';
import type { ChannelMember, PresenceState } from './types.js';

export class MembershipController implements ReactiveController {
  members: ChannelMember[] = [];
  presence: PresenceState[] = [];

  private _host: ReactiveControllerHost;
  private _channels: ChannelStateController;

  constructor(host: ReactiveControllerHost, push: PushController, channels: ChannelStateController) {
    this._host = host;
    this._channels = channels;
    host.addController(this);
    push.registerDatasetHandler('members', (op) => { this._applyMembers(op); this._host.requestUpdate(); });
    push.registerDatasetHandler('presence', (op) => { this._applyPresence(op); this._host.requestUpdate(); });
  }

  filteredMembers(): ChannelMember[] {
    if (!this._channels.selectedChannelId) return [];
    return this.members.filter(m => m.channelId === this._channels.selectedChannelId);
  }

  private _applyMembers(op: DatasetOp) {
    if (op.op === 'snapshot') {
      this.members = (op.rows ?? []).map(r => this._toMember(r));
    } else if (op.op === 'append' && op.rows) {
      this.members = [...this.members, ...op.rows.map(r => this._toMember(r))];
    } else if (op.op === 'remove' && op.key) {
      const sep = op.key.indexOf(':');
      if (sep >= 0) {
        const chId = op.key.substring(0, sep);
        const memId = op.key.substring(sep + 1);
        this.members = this.members.filter(m => !(m.channelId === chId && m.memberId === memId));
      } else {
        this.members = this.members.filter(m => m.memberId !== op.key);
      }
    }
  }

  private _toMember(row: unknown[]): ChannelMember {
    return {
      channelId: row[1] as string,
      memberId: row[2] as string,
      displayName: row[3] as string,
      role: (row[4] as ChannelMember['role']) || 'PARTICIPANT',
    };
  }

  private _applyPresence(op: DatasetOp) {
    if (op.op === 'snapshot') {
      this.presence = (op.rows ?? []).map(r => this._toPresence(r));
    } else if (op.op === 'replace' && op.row) {
      this.presence = this.presence.map(p =>
        p.memberId === op.row![0]
          ? this._toPresence(op.row!)
          : p
      );
    }
  }

  private _toPresence(row: unknown[]): PresenceState {
    const p: PresenceState = {
      memberId: row[0] as string,
      status: row[1] as PresenceState['status'],
    };
    const lastSeen = row[2] as string;
    if (lastSeen) (p as { lastSeenAt: string }).lastSeenAt = lastSeen;
    return p;
  }

  hostConnected() {}
  hostDisconnected() {}
}
