import { describe, it, expect } from 'vitest';
import {
  COMMITMENT_STATES,
  commitmentStateCategory,
  isTerminalCommitmentState,
  toCommitmentRecord,
  toCommitmentMap,
  type CommitmentState,
  type RawCommitment,
} from './commitment.js';

describe('commitment types', () => {
  describe('COMMITMENT_STATES', () => {
    it('has 7 states', () => {
      expect(COMMITMENT_STATES).toHaveLength(7);
    });

    it('includes all expected states', () => {
      expect(COMMITMENT_STATES).toEqual([
        'OPEN', 'ACKNOWLEDGED', 'FULFILLED', 'FAILED',
        'DECLINED', 'DELEGATED', 'EXPIRED',
      ]);
    });
  });

  describe('commitmentStateCategory', () => {
    it('maps OPEN to active', () => {
      expect(commitmentStateCategory('OPEN')).toBe('active');
    });

    it('maps ACKNOWLEDGED to info', () => {
      expect(commitmentStateCategory('ACKNOWLEDGED')).toBe('info');
    });

    it('maps FULFILLED to success', () => {
      expect(commitmentStateCategory('FULFILLED')).toBe('success');
    });

    it('maps FAILED to danger', () => {
      expect(commitmentStateCategory('FAILED')).toBe('danger');
    });

    it('maps DECLINED to neutral', () => {
      expect(commitmentStateCategory('DECLINED')).toBe('neutral');
    });

    it('maps DELEGATED to transfer', () => {
      expect(commitmentStateCategory('DELEGATED')).toBe('transfer');
    });

    it('maps EXPIRED to warning', () => {
      expect(commitmentStateCategory('EXPIRED')).toBe('warning');
    });
  });

  describe('isTerminalCommitmentState', () => {
    it('returns false for OPEN', () => {
      expect(isTerminalCommitmentState('OPEN')).toBe(false);
    });

    it('returns false for ACKNOWLEDGED', () => {
      expect(isTerminalCommitmentState('ACKNOWLEDGED')).toBe(false);
    });

    it.each([
      'FULFILLED', 'FAILED', 'DECLINED', 'DELEGATED', 'EXPIRED',
    ] as CommitmentState[])('returns true for %s', (state) => {
      expect(isTerminalCommitmentState(state)).toBe(true);
    });
  });

  describe('toCommitmentRecord', () => {
    const base: RawCommitment = {
      id: 'c1',
      correlationId: 'corr-1',
      state: 'OPEN',
      createdAt: '2026-01-01T00:00:00Z',
    };

    it('maps state from raw', () => {
      const record = toCommitmentRecord(base);
      expect(record.state).toBe('OPEN');
    });

    it('preserves createdAt', () => {
      const record = toCommitmentRecord(base);
      expect(record.createdAt).toBe('2026-01-01T00:00:00Z');
    });

    it('maps expiresAt to deadline', () => {
      const record = toCommitmentRecord({ ...base, expiresAt: '2026-01-02T00:00:00Z' });
      expect(record.deadline).toBe('2026-01-02T00:00:00Z');
    });

    it('preserves acknowledgedAt', () => {
      const record = toCommitmentRecord({ ...base, acknowledgedAt: '2026-01-01T01:00:00Z' });
      expect(record.acknowledgedAt).toBe('2026-01-01T01:00:00Z');
    });

    it('preserves resolvedAt', () => {
      const record = toCommitmentRecord({ ...base, resolvedAt: '2026-01-01T02:00:00Z' });
      expect(record.resolvedAt).toBe('2026-01-01T02:00:00Z');
    });

    it('computes updatedAt as max of timestamps', () => {
      const record = toCommitmentRecord({
        ...base,
        acknowledgedAt: '2026-01-01T01:00:00Z',
        resolvedAt: '2026-01-01T02:00:00Z',
      });
      expect(record.updatedAt).toBe('2026-01-01T02:00:00Z');
    });

    it('omits optional fields when null in raw', () => {
      const record = toCommitmentRecord({ ...base, expiresAt: null, acknowledgedAt: null, resolvedAt: null });
      expect(record.deadline).toBeUndefined();
      expect(record.acknowledgedAt).toBeUndefined();
      expect(record.resolvedAt).toBeUndefined();
    });
  });

  describe('toCommitmentMap', () => {
    it('keys by correlationId', () => {
      const map = toCommitmentMap([
        { id: 'c1', correlationId: 'corr-1', state: 'OPEN', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'c2', correlationId: 'corr-2', state: 'FULFILLED', createdAt: '2026-01-01T00:00:00Z' },
      ]);
      expect(map.has('corr-1')).toBe(true);
      expect(map.has('corr-2')).toBe(true);
      expect(map.has('c1')).toBe(false);
    });

    it('returns empty map for empty input', () => {
      const map = toCommitmentMap([]);
      expect(map.size).toBe(0);
    });
  });
});
