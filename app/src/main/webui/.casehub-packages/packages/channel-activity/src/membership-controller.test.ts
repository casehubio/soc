import { describe, it, expect } from 'vitest';
import { MembershipController } from './membership-controller.js';
import { ChannelStateController } from './channel-state-controller.js';
import { PushController } from './push-controller.js';
import { ChannelEventTopics } from './events.js';

class MockHost {
  controllers: any[] = [];
  updateCount = 0;
  addController(c: any) { this.controllers.push(c); }
  removeController() {}
  requestUpdate() { this.updateCount++; }
  get updateComplete() { return Promise.resolve(true); }
}

function setup() {
  const host = new MockHost();
  const push = new PushController(host as any);
  const channels = new ChannelStateController(host as any, push);
  const ctrl = new MembershipController(host as any, push, channels);
  return { host, push, channels, ctrl };
}

function memberRow(membershipId: string, channelId: string, memberId: string, displayName: string, role = 'PARTICIPANT'): unknown[] {
  return [membershipId, channelId, memberId, displayName, role];
}

function presenceRow(memberId: string, status: string, lastActiveAt = ''): unknown[] {
  return [memberId, status, lastActiveAt];
}

describe('MembershipController', () => {
  describe('member ops', () => {
    it('applies member snapshot', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'members',
        rows: [memberRow('m-1', 'ch-1', 'alice', 'Alice')],
      });
      expect(ctrl.members).toHaveLength(1);
      expect(ctrl.members[0]!.memberId).toBe('alice');
      expect(ctrl.members[0]!.displayName).toBe('Alice');
      expect(ctrl.members[0]!.channelId).toBe('ch-1');
      expect(ctrl.members[0]!.role).toBe('PARTICIPANT');
    });

    it('appends members', () => {
      const { push, ctrl } = setup();
      push.applyOp({ op: 'snapshot', dataset: 'members', rows: [memberRow('m-1', 'ch-1', 'alice', 'Alice')] });
      push.applyOp({ op: 'append', dataset: 'members', rows: [memberRow('m-2', 'ch-1', 'bob', 'Bob')] });
      expect(ctrl.members).toHaveLength(2);
    });

    it('removes member by composite key (channelId:memberId)', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'members',
        rows: [memberRow('m-1', 'ch-1', 'alice', 'Alice'), memberRow('m-2', 'ch-1', 'bob', 'Bob')],
      });
      push.applyOp({ op: 'remove', dataset: 'members', key: 'ch-1:alice' });
      expect(ctrl.members).toHaveLength(1);
      expect(ctrl.members[0]!.memberId).toBe('bob');
    });

    it('removes member by simple key', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'members',
        rows: [memberRow('m-1', 'ch-1', 'alice', 'Alice')],
      });
      push.applyOp({ op: 'remove', dataset: 'members', key: 'alice' });
      expect(ctrl.members).toHaveLength(0);
    });
  });

  describe('presence ops', () => {
    it('applies presence snapshot', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'presence',
        rows: [presenceRow('alice', 'ONLINE', '2026-01-01T00:00:00Z')],
      });
      expect(ctrl.presence).toHaveLength(1);
      expect(ctrl.presence[0]!.memberId).toBe('alice');
      expect(ctrl.presence[0]!.status).toBe('ONLINE');
    });

    it('replaces presence state', () => {
      const { push, ctrl } = setup();
      push.applyOp({ op: 'snapshot', dataset: 'presence', rows: [presenceRow('alice', 'ONLINE')] });
      push.applyOp({ op: 'replace', dataset: 'presence', row: ['alice', 'AWAY', '2026-01-01T01:00:00Z'] });
      expect(ctrl.presence).toHaveLength(1);
      expect(ctrl.presence[0]!.status).toBe('AWAY');
    });
  });

  describe('filteredMembers', () => {
    it('returns members for selected channel only', () => {
      const { push, channels, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'members',
        rows: [
          memberRow('m-1', 'ch-1', 'alice', 'Alice'),
          memberRow('m-2', 'ch-2', 'bob', 'Bob'),
        ],
      });
      channels.handleEvent(ChannelEventTopics.SELECT_CHANNEL, { channelId: 'ch-1' });
      const filtered = ctrl.filteredMembers();
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.memberId).toBe('alice');
    });

    it('returns empty when no channel selected', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'members',
        rows: [memberRow('m-1', 'ch-1', 'alice', 'Alice')],
      });
      expect(ctrl.filteredMembers()).toEqual([]);
    });
  });

  describe('host updates', () => {
    it('triggers host update on member snapshot', () => {
      const { host, push } = setup();
      const before = host.updateCount;
      push.applyOp({ op: 'snapshot', dataset: 'members', rows: [memberRow('m-1', 'ch-1', 'alice', 'Alice')] });
      expect(host.updateCount).toBeGreaterThan(before);
    });

    it('triggers host update on presence replace', () => {
      const { host, push } = setup();
      push.applyOp({ op: 'snapshot', dataset: 'presence', rows: [presenceRow('alice', 'ONLINE')] });
      const before = host.updateCount;
      push.applyOp({ op: 'replace', dataset: 'presence', row: ['alice', 'AWAY', ''] });
      expect(host.updateCount).toBeGreaterThan(before);
    });
  });
});
