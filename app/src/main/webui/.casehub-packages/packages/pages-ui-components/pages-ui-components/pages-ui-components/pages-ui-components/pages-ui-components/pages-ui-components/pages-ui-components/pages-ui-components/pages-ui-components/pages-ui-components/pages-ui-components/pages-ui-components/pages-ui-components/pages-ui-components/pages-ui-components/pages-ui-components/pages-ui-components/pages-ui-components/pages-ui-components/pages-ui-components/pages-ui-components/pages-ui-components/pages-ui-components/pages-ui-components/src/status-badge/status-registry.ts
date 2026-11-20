export type StateCategory = 'active' | 'info' | 'success' | 'danger'
  | 'neutral' | 'transfer' | 'warning';

export interface StatusDescriptor {
  readonly category: StateCategory;
  readonly icon: string;
  readonly label?: string;
  readonly pulse?: boolean;
  readonly border?: boolean;
}

export const FALLBACK_DESCRIPTOR: StatusDescriptor = { category: 'neutral', icon: '?' };

const REGISTRY = new Map<string, StatusDescriptor>([
  ['*:PENDING',    { category: 'neutral', icon: '○' }],
  ['*:RUNNING',    { category: 'success', icon: '▶', pulse: true, border: true }],
  ['*:COMPLETED',  { category: 'success', icon: '✓' }],
  ['*:FAULTED',    { category: 'danger',  icon: '!' }],
  ['*:CANCELLED',  { category: 'neutral', icon: '/' }],
  ['*:SUSPENDED',  { category: 'warning', icon: '⏸', border: true }],
]);

export function registerStatus(domain: string, state: string, descriptor: StatusDescriptor): void {
  REGISTRY.set(`${domain}:${state}`, descriptor);
}

export function lookupStatus(domain: string | undefined, state: string): StatusDescriptor {
  if (domain) {
    const exact = REGISTRY.get(`${domain}:${state}`);
    if (exact) return exact;
  }
  return REGISTRY.get(`*:${state}`) ?? FALLBACK_DESCRIPTOR;
}
