export interface ErasureReceipt {
  readonly erasureId?: string;
  readonly subjectId: string;
  readonly reason: string;
  readonly status: 'WITHDRAWN' | 'ALREADY_WITHDRAWN';
  readonly timestamp: string;
  readonly entryCount?: number;
}
