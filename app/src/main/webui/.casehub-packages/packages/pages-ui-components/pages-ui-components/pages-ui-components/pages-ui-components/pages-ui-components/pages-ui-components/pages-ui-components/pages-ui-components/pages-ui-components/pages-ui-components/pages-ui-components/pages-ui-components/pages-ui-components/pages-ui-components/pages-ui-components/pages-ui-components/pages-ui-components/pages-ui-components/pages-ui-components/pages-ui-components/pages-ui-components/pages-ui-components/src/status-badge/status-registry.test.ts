import { describe, it, expect } from 'vitest';
import { registerStatus, lookupStatus, FALLBACK_DESCRIPTOR } from './status-registry.js';
import type { StatusDescriptor } from './status-registry.js';

describe('status-registry', () => {
  it('returns fallback for unknown domain/state', () => {
    expect(lookupStatus('unknown', 'UNKNOWN')).toBe(FALLBACK_DESCRIPTOR);
  });

  it('returns wildcard match when no domain-specific entry exists', () => {
    const result = lookupStatus('anything', 'RUNNING');
    expect(result.category).toBe('success');
    expect(result.icon).toBe('▶');
  });

  it('returns domain-specific match when registered', () => {
    const descriptor: StatusDescriptor = { category: 'danger', icon: '💥' };
    registerStatus('myDomain', 'EXPLODED', descriptor);
    expect(lookupStatus('myDomain', 'EXPLODED')).toBe(descriptor);
  });

  it('falls back to wildcard when domain has no match', () => {
    registerStatus('myDomain', 'CUSTOM', { category: 'info', icon: '★' });
    expect(lookupStatus('myDomain', 'PENDING').category).toBe('neutral');
  });

  it('returns wildcard when domain is undefined', () => {
    const result = lookupStatus(undefined, 'COMPLETED');
    expect(result.category).toBe('success');
  });
});
