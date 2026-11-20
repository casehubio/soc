import { describe, it, expect, vi } from 'vitest';
import { PushController, ALL_TOPICS } from './push-controller.js';
import type { DatasetOp } from './push-controller.js';

class MockHost {
  controllers: any[] = [];
  updateCount = 0;
  addController(c: any) { this.controllers.push(c); }
  removeController() {}
  requestUpdate() { this.updateCount++; }
  get updateComplete() { return Promise.resolve(true); }
}

describe('PushController', () => {
  it('starts with disconnected status', () => {
    const ctrl = new PushController(new MockHost() as any);
    expect(ctrl.connectionStatus).toBe('disconnected');
  });

  it('registers itself with the host', () => {
    const host = new MockHost();
    const ctrl = new PushController(host as any);
    expect(host.controllers).toContain(ctrl);
  });

  it('dispatches dataset ops to registered handlers', () => {
    const ctrl = new PushController(new MockHost() as any);
    const received: DatasetOp[] = [];
    ctrl.registerDatasetHandler('channels', (op) => received.push(op));

    const op: DatasetOp = { op: 'snapshot', dataset: 'channels', rows: [['ch-1', 'general']] };
    ctrl.applyOp(op);

    expect(received).toHaveLength(1);
    expect(received[0]!.op).toBe('snapshot');
    expect(received[0]!.rows).toEqual([['ch-1', 'general']]);
  });

  it('dispatches to multiple handlers for the same dataset', () => {
    const ctrl = new PushController(new MockHost() as any);
    const a: DatasetOp[] = [];
    const b: DatasetOp[] = [];
    ctrl.registerDatasetHandler('channels', (op) => a.push(op));
    ctrl.registerDatasetHandler('channels', (op) => b.push(op));

    ctrl.applyOp({ op: 'snapshot', dataset: 'channels', rows: [] });

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it('silently ignores ops for unregistered datasets', () => {
    const ctrl = new PushController(new MockHost() as any);
    expect(() => {
      ctrl.applyOp({ op: 'snapshot', dataset: 'unknown', rows: [] });
    }).not.toThrow();
  });

  it('routes ops to the correct dataset handler', () => {
    const ctrl = new PushController(new MockHost() as any);
    const channels: DatasetOp[] = [];
    const messages: DatasetOp[] = [];
    ctrl.registerDatasetHandler('channels', (op) => channels.push(op));
    ctrl.registerDatasetHandler('messages', (op) => messages.push(op));

    ctrl.applyOp({ op: 'snapshot', dataset: 'channels', rows: [] });
    ctrl.applyOp({ op: 'append', dataset: 'messages', rows: [['row']] });

    expect(channels).toHaveLength(1);
    expect(messages).toHaveLength(1);
    expect(channels[0]!.dataset).toBe('channels');
    expect(messages[0]!.dataset).toBe('messages');
  });

  it('setConnectionStatus updates status and triggers host update', () => {
    const host = new MockHost();
    const ctrl = new PushController(host as any);

    ctrl.setConnectionStatus('connected');
    expect(ctrl.connectionStatus).toBe('connected');
    expect(host.updateCount).toBe(1);

    ctrl.setConnectionStatus('reconnecting');
    expect(ctrl.connectionStatus).toBe('reconnecting');
    expect(host.updateCount).toBe(2);
  });

  it('ALL_TOPICS includes all 7 push dataset topics', () => {
    expect(ALL_TOPICS).toHaveLength(7);
    expect(ALL_TOPICS).toContain('chat:channels');
    expect(ALL_TOPICS).toContain('chat:topics');
    expect(ALL_TOPICS).toContain('chat:messages');
    expect(ALL_TOPICS).toContain('chat:members');
    expect(ALL_TOPICS).toContain('chat:presence');
    expect(ALL_TOPICS).toContain('chat:reactions');
    expect(ALL_TOPICS).toContain('chat:commitments');
  });

  it('handles all op types without error', () => {
    const ctrl = new PushController(new MockHost() as any);
    const received: DatasetOp[] = [];
    ctrl.registerDatasetHandler('channels', (op) => received.push(op));

    ctrl.applyOp({ op: 'snapshot', dataset: 'channels', rows: [] });
    ctrl.applyOp({ op: 'append', dataset: 'channels', rows: [['new']] });
    ctrl.applyOp({ op: 'replace', dataset: 'channels', row: ['updated'], key: 'ch-1' });
    ctrl.applyOp({ op: 'remove', dataset: 'channels', key: 'ch-1' });

    expect(received).toHaveLength(4);
    expect(received.map(r => r.op)).toEqual(['snapshot', 'append', 'replace', 'remove']);
  });
});
