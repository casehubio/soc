import { describe, it, expect } from 'vitest';
import { toCommitmentRecord, toCommitmentMap } from './commitment.js';
import type { RawCommitment } from './commitment.js';

describe('commitment', () => {
  it('maps commitment response to CommitmentRecord', () => {
    const raw: RawCommitment = {
      id: 'uuid-1', correlationId: 'corr-1', state: 'OPEN',
      requester: 'human:alice', obligor: 'agent-1',
      expiresAt: '2026-08-01T00:00:00Z', acknowledgedAt: null,
      resolvedAt: null, createdAt: '2026-07-19T10:00:00Z',
    };
    const record = toCommitmentRecord(raw);
    expect(record.state).toBe('OPEN');
    expect(record.deadline).toBe('2026-08-01T00:00:00Z');
    expect(record.createdAt).toBe('2026-07-19T10:00:00Z');
    expect(record.updatedAt).toBe('2026-07-19T10:00:00Z');
  });

  it('updatedAt is max of resolvedAt, acknowledgedAt, createdAt', () => {
    const raw: RawCommitment = {
      id: 'uuid-2', correlationId: 'corr-2', state: 'FULFILLED',
      requester: 'human:alice', obligor: 'agent-1',
      acknowledgedAt: '2026-07-19T11:00:00Z',
      resolvedAt: '2026-07-19T12:00:00Z',
      createdAt: '2026-07-19T10:00:00Z',
    };
    const record = toCommitmentRecord(raw);
    expect(record.updatedAt).toBe('2026-07-19T12:00:00Z');
  });

  it('toCommitmentMap keys by correlationId', () => {
    const commitments: RawCommitment[] = [
      { id: 'u1', correlationId: 'c1', state: 'OPEN', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'u2', correlationId: 'c2', state: 'FULFILLED', createdAt: '2026-01-02T00:00:00Z' },
    ];
    const map = toCommitmentMap(commitments);
    expect(map.size).toBe(2);
    expect(map.get('c1')?.state).toBe('OPEN');
    expect(map.get('c2')?.state).toBe('FULFILLED');
  });

  it('handles null optional fields', () => {
    const raw: RawCommitment = {
      id: 'uuid-3', correlationId: 'corr-3', state: 'OPEN',
      expiresAt: null, acknowledgedAt: null, resolvedAt: null, createdAt: null,
    };
    const record = toCommitmentRecord(raw);
    expect(record.deadline).toBeUndefined();
    expect(record.acknowledgedAt).toBeUndefined();
    expect(record.createdAt).toBeDefined();
  });
});
