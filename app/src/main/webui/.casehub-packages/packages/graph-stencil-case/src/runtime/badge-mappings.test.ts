import { describe, it, expect } from 'vitest';
import {
  TERMINAL_SEVERITY,
  isActiveStatus,
} from './badge-mappings.js';

describe('TERMINAL_SEVERITY', () => {
  it('ranks FAULTED highest', () => {
    expect(TERMINAL_SEVERITY['FAULTED']!).toBeGreaterThan(TERMINAL_SEVERITY['REJECTED']!);
    expect(TERMINAL_SEVERITY['REJECTED']!).toBeGreaterThan(TERMINAL_SEVERITY['CANCELLED']!);
    expect(TERMINAL_SEVERITY['CANCELLED']!).toBeGreaterThan(TERMINAL_SEVERITY['OBSOLETE']!);
    expect(TERMINAL_SEVERITY['OBSOLETE']!).toBeGreaterThan(TERMINAL_SEVERITY['COMPLETED']!);
  });
});

describe('isActiveStatus', () => {
  it('returns true for active states', () => {
    for (const s of ['PENDING', 'RUNNING', 'DELEGATED', 'SUSPENDED']) {
      expect(isActiveStatus(s)).toBe(true);
    }
  });

  it('returns false for terminal states', () => {
    for (const s of ['COMPLETED', 'FAULTED', 'REJECTED', 'OBSOLETE', 'CANCELLED']) {
      expect(isActiveStatus(s)).toBe(false);
    }
  });

  it('returns false for unknown states', () => {
    expect(isActiveStatus('UNKNOWN')).toBe(false);
  });
});
