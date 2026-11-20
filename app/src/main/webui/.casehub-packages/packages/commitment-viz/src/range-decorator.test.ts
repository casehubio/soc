import { describe, it, expect } from 'vitest';
import { decorateCommitmentRanges } from './range-decorator.js';
import type { DecorableMessage } from './types.js';
import type { CommitmentRecord } from '@casehubio/mosaic-core';

function msg(id: string, correlationId?: string): DecorableMessage {
  return { id, correlationId };
}

function record(state: string, resolvedAt?: string): CommitmentRecord {
  return {
    state: state as any,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...(resolvedAt ? { resolvedAt } : {}),
  };
}

describe('decorateCommitmentRanges', () => {
  it('returns empty array for empty inputs', () => {
    expect(decorateCommitmentRanges([], new Map())).toEqual([]);
  });

  it('ignores messages without correlationId', () => {
    const messages = [msg('m1'), msg('m2')];
    const result = decorateCommitmentRanges(messages, new Map());
    expect(result).toEqual([]);
  });

  it('ignores messages whose correlationId is not in the map', () => {
    const messages = [msg('m1', 'corr-1')];
    const result = decorateCommitmentRanges(messages, new Map());
    expect(result).toEqual([]);
  });

  it('creates a single range for one commitment', () => {
    const messages = [
      msg('m1', 'corr-1'),
      msg('m2', 'corr-1'),
    ];
    const commitments = new Map([['corr-1', record('OPEN')]]);
    const result = decorateCommitmentRanges(messages, commitments);
    expect(result).toHaveLength(1);
    expect(result[0]!.correlationId).toBe('corr-1');
    expect(result[0]!.state).toBe('OPEN');
    expect(result[0]!.category).toBe('active');
    expect(result[0]!.startMessageId).toBe('m1');
    expect(result[0]!.messageIds).toEqual(['m1', 'm2']);
  });

  it('sets endMessageId for terminal commitments', () => {
    const messages = [msg('m1', 'corr-1'), msg('m2', 'corr-1')];
    const commitments = new Map([['corr-1', record('FULFILLED')]]);
    const result = decorateCommitmentRanges(messages, commitments);
    expect(result[0]!.endMessageId).toBe('m2');
  });

  it('leaves endMessageId undefined for open commitments', () => {
    const messages = [msg('m1', 'corr-1')];
    const commitments = new Map([['corr-1', record('OPEN')]]);
    const result = decorateCommitmentRanges(messages, commitments);
    expect(result[0]!.endMessageId).toBeUndefined();
  });

  it('creates separate ranges for multiple commitments', () => {
    const messages = [
      msg('m1', 'corr-1'),
      msg('m2', 'corr-2'),
      msg('m3', 'corr-1'),
    ];
    const commitments = new Map([
      ['corr-1', record('OPEN')],
      ['corr-2', record('FULFILLED')],
    ]);
    const result = decorateCommitmentRanges(messages, commitments);
    expect(result).toHaveLength(2);
    const r1 = result.find(r => r.correlationId === 'corr-1')!;
    const r2 = result.find(r => r.correlationId === 'corr-2')!;
    expect(r1.messageIds).toEqual(['m1', 'm3']);
    expect(r2.messageIds).toEqual(['m2']);
  });

  it('mixes decorated and undecorated messages', () => {
    const messages = [
      msg('m1', 'corr-1'),
      msg('m2'),
      msg('m3', 'corr-1'),
      msg('m4'),
    ];
    const commitments = new Map([['corr-1', record('ACKNOWLEDGED')]]);
    const result = decorateCommitmentRanges(messages, commitments);
    expect(result).toHaveLength(1);
    expect(result[0]!.messageIds).toEqual(['m1', 'm3']);
  });

  it('maps state categories correctly', () => {
    const messages = [msg('m1', 'corr-1')];
    const commitments = new Map([['corr-1', record('FAILED')]]);
    const result = decorateCommitmentRanges(messages, commitments);
    expect(result[0]!.category).toBe('danger');
  });
});
