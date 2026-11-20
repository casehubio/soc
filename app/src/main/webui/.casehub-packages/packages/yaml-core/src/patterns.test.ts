import { describe, it, expect } from 'vitest';
import type { PlaybookPatternType, PlaybookPatternCategory } from './patterns.js';

describe('PlaybookPatternCategory', () => {
  it('covers all 6 playbook pattern types', () => {
    const types: PlaybookPatternType[] = [
      'sequence', 'parallel', 'conditional', 'match', 'loop', 'try-catch',
    ];
    expect(types).toHaveLength(6);
  });

  it('discriminates on category field', () => {
    const pattern: PlaybookPatternCategory = {
      category: 'playbook',
      type: 'sequence',
      name: 'main-flow',
    };
    expect(pattern.category).toBe('playbook');
    expect(pattern.type).toBe('sequence');
  });

  it('accepts all optional fields', () => {
    const pattern: PlaybookPatternCategory = {
      category: 'playbook',
      type: 'parallel',
      name: 'fan-out',
      description: 'Parallel execution of independent tasks',
    };
    expect(pattern.name).toBe('fan-out');
    expect(pattern.description).toBeDefined();
  });
});
