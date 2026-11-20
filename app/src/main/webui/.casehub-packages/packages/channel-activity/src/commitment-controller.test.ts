import { describe, it, expect } from 'vitest';
import { CommitmentController } from './commitment-controller.js';
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
  const ctrl = new CommitmentController(host as any, push, channels);
  return { host, push, channels, ctrl };
}

function commitmentRow(correlationId: string, channelId: string, state: string, opts?: {
  deadline?: string; acknowledgedAt?: string; resolvedAt?: string; createdAt?: string;
}): unknown[] {
  return [
    correlationId, channelId, state,
    opts?.deadline ?? '', opts?.acknowledgedAt ?? '',
    opts?.resolvedAt ?? '', opts?.createdAt ?? '2026-01-01T00:00:00Z',
  ];
}

describe('CommitmentController', () => {
  describe('commitment ops', () => {
    it('applies commitment snapshot', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'commitments',
        rows: [commitmentRow('corr-1', 'ch-1', 'OPEN')],
      });
      expect(ctrl.commitments.size).toBe(1);
      expect(ctrl.commitments.get('corr-1')?.state).toBe('OPEN');
    });

    it('replaces commitment', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'commitments',
        rows: [commitmentRow('corr-1', 'ch-1', 'OPEN')],
      });
      push.applyOp({
        op: 'replace', dataset: 'commitments',
        row: ['corr-1', 'ch-1', 'ACKNOWLEDGED', '', '2026-01-02T00:00:00Z', '', '2026-01-01T00:00:00Z'],
      });
      expect(ctrl.commitments.get('corr-1')?.state).toBe('ACKNOWLEDGED');
      expect(ctrl.commitments.get('corr-1')?.acknowledgedAt).toBe('2026-01-02T00:00:00Z');
    });

    it('appends commitments', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'commitments',
        rows: [commitmentRow('corr-1', 'ch-1', 'OPEN')],
      });
      push.applyOp({
        op: 'append', dataset: 'commitments',
        rows: [commitmentRow('corr-2', 'ch-1', 'OPEN')],
      });
      expect(ctrl.commitments.size).toBe(2);
    });

    it('computes updatedAt from latest timestamp', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'commitments',
        rows: [commitmentRow('corr-1', 'ch-1', 'FULFILLED', {
          createdAt: '2026-01-01T00:00:00Z',
          acknowledgedAt: '2026-01-02T00:00:00Z',
          resolvedAt: '2026-01-03T00:00:00Z',
        })],
      });
      expect(ctrl.commitments.get('corr-1')?.updatedAt).toBe('2026-01-03T00:00:00Z');
    });

    it('handles empty optional fields', () => {
      const { push, ctrl } = setup();
      push.applyOp({
        op: 'snapshot', dataset: 'commitments',
        rows: [commitmentRow('corr-1', 'ch-1', 'OPEN')],
      });
      const record = ctrl.commitments.get('corr-1')!;
      expect(record.deadline).toBeUndefined();
      expect(record.acknowledgedAt).toBeUndefined();
      expect(record.resolvedAt).toBeUndefined();
    });
  });

  describe('selectedMessageId', () => {
    it('starts with no selection', () => {
      const { ctrl } = setup();
      expect(ctrl.selectedMessageId).toBeUndefined();
    });

    it('tracks selected message via handleEvent', () => {
      const { ctrl } = setup();
      ctrl.handleEvent(ChannelEventTopics.MESSAGE_SELECTED, {
        message: { id: 'msg-1', sender: 'alice' },
      });
      expect(ctrl.selectedMessageId).toBe('msg-1');
    });
  });

  describe('host updates', () => {
    it('triggers host update on commitment snapshot', () => {
      const { host, push } = setup();
      const before = host.updateCount;
      push.applyOp({
        op: 'snapshot', dataset: 'commitments',
        rows: [commitmentRow('corr-1', 'ch-1', 'OPEN')],
      });
      expect(host.updateCount).toBeGreaterThan(before);
    });
  });
});
