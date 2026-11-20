import { describe, it, expect } from 'vitest';
import {
  commitmentLifecycleStrategy,
  type CommitmentLifecycleData,
} from './commitment-lifecycle.js';
import { QHORUS_STAGES } from './state-progression.js';
import type { StageConfig } from '../types.js';

describe('commitmentLifecycleStrategy', () => {
  describe('default stages (QHORUS_STAGES)', () => {
    it('uses all 7 qhorus stages', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'OPEN',
        transitions: [{ state: 'OPEN' }],
      });
      expect(nodes).toHaveLength(7);
      expect(nodes.map(n => n.key)).toEqual([
        'OPEN', 'ACKNOWLEDGED', 'FULFILLED', 'DECLINED', 'FAILED', 'DELEGATED', 'EXPIRED',
      ]);
    });

    it('marks current non-terminal stage as active', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'ACKNOWLEDGED',
        transitions: [{ state: 'OPEN' }, { state: 'ACKNOWLEDGED' }],
      });
      expect(nodes.find(n => n.key === 'ACKNOWLEDGED')!.status).toBe('active');
    });

    it('marks visited stages as completed', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'ACKNOWLEDGED',
        transitions: [{ state: 'OPEN' }, { state: 'ACKNOWLEDGED' }],
      });
      expect(nodes.find(n => n.key === 'OPEN')!.status).toBe('completed');
    });

    it('marks FULFILLED as completed (terminal success)', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'FULFILLED',
        transitions: [{ state: 'OPEN' }, { state: 'ACKNOWLEDGED' }, { state: 'FULFILLED' }],
      });
      expect(nodes.find(n => n.key === 'FULFILLED')!.status).toBe('completed');
    });

    it('marks FAILED as failed (terminal failure)', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'FAILED',
        transitions: [{ state: 'OPEN' }, { state: 'ACKNOWLEDGED' }, { state: 'FAILED' }],
      });
      expect(nodes.find(n => n.key === 'FAILED')!.status).toBe('failed');
    });

    it('marks DELEGATED as completed (terminal transfer)', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'DELEGATED',
        transitions: [{ state: 'OPEN' }, { state: 'DELEGATED' }],
      });
      expect(nodes.find(n => n.key === 'DELEGATED')!.status).toBe('completed');
    });

    it('handles non-linear path: OPEN → DECLINED skipping ACKNOWLEDGED', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'DECLINED',
        transitions: [{ state: 'OPEN' }, { state: 'DECLINED' }],
      });
      expect(nodes.find(n => n.key === 'OPEN')!.status).toBe('completed');
      expect(nodes.find(n => n.key === 'ACKNOWLEDGED')!.status).toBe('skipped');
      expect(nodes.find(n => n.key === 'DECLINED')!.status).toBe('failed');
    });

    it('populates actor and timestamp from transitions', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'ACKNOWLEDGED',
        transitions: [
          { state: 'OPEN', actor: 'requester', timestamp: '2026-01-01T00:00:00Z' },
          { state: 'ACKNOWLEDGED', actor: 'agent-1', timestamp: '2026-01-01T01:00:00Z' },
        ],
      });
      expect(nodes.find(n => n.key === 'OPEN')!.actor).toBe('requester');
      expect(nodes.find(n => n.key === 'OPEN')!.timestamp).toBe('2026-01-01T00:00:00Z');
      expect(nodes.find(n => n.key === 'ACKNOWLEDGED')!.actor).toBe('agent-1');
    });

    it('leaves actor/timestamp undefined for non-visited stages', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'OPEN',
        transitions: [{ state: 'OPEN' }],
      });
      expect(nodes.find(n => n.key === 'FULFILLED')!.actor).toBeUndefined();
      expect(nodes.find(n => n.key === 'FULFILLED')!.timestamp).toBeUndefined();
    });
  });

  describe('transformData', () => {
    it('is defined', () => {
      expect(commitmentLifecycleStrategy().transformData).toBeDefined();
    });

    it('maps CommitmentLifecycleData to StateData', () => {
      const strategy = commitmentLifecycleStrategy();
      const raw: CommitmentLifecycleData = {
        id: 'c1',
        currentStage: 'ACKNOWLEDGED',
        stages: [
          { key: 'OPEN', status: 'completed', actor: 'sys', timestamp: '2026-01-01T00:00:00Z' },
          { key: 'ACKNOWLEDGED', status: 'active', actor: 'agent-1', timestamp: '2026-01-01T01:00:00Z' },
        ],
      };
      const transformed = strategy.transformData!(raw);
      expect(transformed).toEqual({
        currentState: 'ACKNOWLEDGED',
        transitions: [
          { state: 'OPEN', actor: 'sys', timestamp: '2026-01-01T00:00:00Z' },
          { state: 'ACKNOWLEDGED', actor: 'agent-1', timestamp: '2026-01-01T01:00:00Z' },
        ],
      });
    });

    it('handles empty stages array', () => {
      const strategy = commitmentLifecycleStrategy();
      const transformed = strategy.transformData!({
        id: 'c1',
        currentStage: 'OPEN',
        stages: [],
      });
      expect(transformed).toEqual({
        currentState: 'OPEN',
        transitions: [],
      });
    });

    it('does not include messages in transformed output', () => {
      const strategy = commitmentLifecycleStrategy();
      const raw: CommitmentLifecycleData = {
        id: 'c1',
        currentStage: 'OPEN',
        stages: [],
        messages: [{ sender: 'user', content: 'hello', timestamp: '2026-01-01T00:00:00Z' }],
      };
      const transformed = strategy.transformData!(raw);
      expect(transformed).not.toHaveProperty('messages');
    });
  });

  describe('custom stages', () => {
    it('uses custom stage definitions', () => {
      const customStages: StageConfig[] = [
        { key: 'REQUESTED', label: 'Requested' },
        { key: 'IN_PROGRESS', label: 'In Progress' },
        { key: 'COMPLETED', label: 'Completed', terminal: 'success' },
      ];
      const strategy = commitmentLifecycleStrategy({ stages: customStages });
      const nodes = strategy.toNodes({
        currentState: 'IN_PROGRESS',
        transitions: [{ state: 'REQUESTED' }, { state: 'IN_PROGRESS' }],
      });
      expect(nodes).toHaveLength(3);
      expect(nodes[1]!.label).toBe('In Progress');
      expect(nodes[1]!.status).toBe('active');
    });
  });

  describe('custom resolveStatus', () => {
    it('uses custom resolver', () => {
      const strategy = commitmentLifecycleStrategy({
        resolveStatus: () => 'completed',
      });
      const nodes = strategy.toNodes({ currentState: 'OPEN', transitions: [] });
      expect(nodes.every(n => n.status === 'completed')).toBe(true);
    });
  });

  describe('defaultLayout', () => {
    it('is horizontal', () => {
      expect(commitmentLifecycleStrategy().defaultLayout).toBe('horizontal');
    });
  });

  describe('edge cases', () => {
    it('handles unknown currentState — all pending', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({ currentState: 'NONEXISTENT', transitions: [] });
      expect(nodes.every(n => n.status === 'pending')).toBe(true);
    });

    it('handles duplicate transitions gracefully', () => {
      const strategy = commitmentLifecycleStrategy();
      const nodes = strategy.toNodes({
        currentState: 'ACKNOWLEDGED',
        transitions: [
          { state: 'OPEN', timestamp: '2026-01-01T00:00:00Z' },
          { state: 'OPEN', timestamp: '2026-01-01T00:01:00Z' },
          { state: 'ACKNOWLEDGED' },
        ],
      });
      expect(nodes.find(n => n.key === 'OPEN')!.status).toBe('completed');
    });
  });
});
