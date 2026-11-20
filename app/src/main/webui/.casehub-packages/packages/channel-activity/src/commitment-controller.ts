import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PushController, DatasetOp } from './push-controller.js';
import type { ChannelStateController } from './channel-state-controller.js';
import type { CommitmentState } from './types.js';
import type { CommitmentRecord } from '@casehubio/mosaic-core';
import { ChannelEventTopics } from './events.js';
import type { MessageSelectedPayload } from './events.js';

export class CommitmentController implements ReactiveController {
  commitments: Map<string, CommitmentRecord> = new Map();
  selectedMessageId?: string;

  private _host: ReactiveControllerHost;
  private _channels: ChannelStateController;

  constructor(host: ReactiveControllerHost, push: PushController, channels: ChannelStateController) {
    this._host = host;
    this._channels = channels;
    host.addController(this);
    push.registerDatasetHandler('commitments', (op) => { this._applyCommitments(op); this._host.requestUpdate(); });
  }

  handleEvent(topic: string, payload: unknown) {
    if (topic === ChannelEventTopics.MESSAGE_SELECTED) {
      this.selectedMessageId = (payload as MessageSelectedPayload).message.id;
      this._host.requestUpdate();
    }
  }

  private _applyCommitments(op: DatasetOp) {
    if (op.op === 'snapshot') {
      this.commitments = new Map();
      for (const r of op.rows ?? []) {
        this.commitments.set(r[0] as string, this._parseRow(r));
      }
    } else if (op.op === 'replace' && op.row) {
      this.commitments = new Map(this.commitments);
      this.commitments.set(op.row[0] as string, this._parseRow(op.row));
    } else if (op.op === 'append' && op.rows) {
      this.commitments = new Map(this.commitments);
      for (const r of op.rows) {
        this.commitments.set(r[0] as string, this._parseRow(r));
      }
    }
  }

  private _parseRow(r: unknown[]): CommitmentRecord {
    const resolvedAt = (r[5] as string) || undefined;
    const acknowledgedAt = (r[4] as string) || undefined;
    const createdAt = r[6] as string;
    const timestamps = [resolvedAt, acknowledgedAt, createdAt].filter((t): t is string => t != null);
    const updatedAt = timestamps.reduce((a, b) => a > b ? a : b, createdAt);
    const record: CommitmentRecord = {
      state: r[2] as CommitmentState,
      createdAt,
      updatedAt,
    };
    if (r[3] as string) (record as { deadline: string }).deadline = r[3] as string;
    if (acknowledgedAt) (record as { acknowledgedAt: string }).acknowledgedAt = acknowledgedAt;
    if (resolvedAt) (record as { resolvedAt: string }).resolvedAt = resolvedAt;
    return record;
  }

  hostConnected() {}
  hostDisconnected() {}
}
