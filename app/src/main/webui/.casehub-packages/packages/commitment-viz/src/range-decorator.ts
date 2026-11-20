import type { CommitmentRecord } from '@casehubio/mosaic-core';
import { commitmentStateCategory, isTerminalCommitmentState } from '@casehubio/mosaic-core';
import type { DecorableMessage, RangeDecoration } from './types.js';

export function decorateCommitmentRanges(
  messages: readonly DecorableMessage[],
  commitments: ReadonlyMap<string, CommitmentRecord>,
): RangeDecoration[] {
  const grouped = new Map<string, string[]>();

  for (const msg of messages) {
    if (!msg.correlationId) continue;
    if (!commitments.has(msg.correlationId)) continue;
    const list = grouped.get(msg.correlationId);
    if (list) {
      list.push(msg.id);
    } else {
      grouped.set(msg.correlationId, [msg.id]);
    }
  }

  const decorations: RangeDecoration[] = [];

  for (const [correlationId, messageIds] of grouped) {
    const record = commitments.get(correlationId)!;
    const isTerminal = isTerminalCommitmentState(record.state);

    decorations.push({
      correlationId,
      state: record.state,
      category: commitmentStateCategory(record.state),
      startMessageId: messageIds[0]!,
      endMessageId: isTerminal ? messageIds[messageIds.length - 1]! : undefined,
      messageIds,
    });
  }

  return decorations;
}
