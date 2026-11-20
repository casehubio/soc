import type { EntityReader, ResponseReader } from './types.js';

export const DEFAULT_READER: EntityReader = {
  id: (e) => e.id,
  type: (e) => e.type,
  summary: (e) => e.summary,
  status: (e) => e.status,
  createdAt: (e) => e.createdAt,
  updatedAt: (e) => e.updatedAt,
  state: (e) => e.state,
  commands: (e) => e.availableCommands ?? [],
};

export const DEFAULT_RESPONSE_READER: ResponseReader = {
  entities: (r) => r.entities,
  nextCursor: (r) => r.nextCursor,
  totalCount: (r) => r.totalCount,
};

export const offsetPaginationReader: ResponseReader = {
  entities: (r) => r.items,
  nextCursor: (r) => (r.page < r.totalPages ? String(r.page + 1) : undefined),
  totalCount: (r) => r.total,
};
