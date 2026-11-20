const ACTIVE_STATES = new Set(['PENDING', 'RUNNING', 'DELEGATED', 'SUSPENDED']);

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATES.has(status);
}

export const TERMINAL_SEVERITY: Record<string, number> = {
  COMPLETED: 1,
  OBSOLETE: 2,
  CANCELLED: 3,
  REJECTED: 4,
  FAULTED: 5,
};

export const ACTIVE_WORST_PRIORITY: Record<string, number> = {
  PENDING: 1,
  RUNNING: 2,
  DELEGATED: 3,
  SUSPENDED: 4,
};
