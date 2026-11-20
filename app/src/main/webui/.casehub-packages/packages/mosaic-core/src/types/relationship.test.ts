import { describe, it, expect } from 'vitest';
import { lookupRelationshipType, registerRelationshipType, FALLBACK_RELATIONSHIP } from './relationship.js';

describe('lookupRelationshipType', () => {
  it('returns built-in parent_child', () => {
    const d = lookupRelationshipType('parent_child');
    expect(d.style).toBe('solid');
    expect(d.directed).toBe(true);
    expect(d.label).toBe('Parent/Child');
  });

  it('returns built-in supersedes', () => {
    const d = lookupRelationshipType('supersedes');
    expect(d.color).toBe('#f59e0b');
    expect(d.directed).toBe(true);
  });

  it('returns built-in coordination', () => {
    const d = lookupRelationshipType('coordination');
    expect(d.style).toBe('dashed');
    expect(d.directed).toBe(true);
  });

  it('returns fallback for unknown type', () => {
    const d = lookupRelationshipType('unknown_type');
    expect(d).toBe(FALLBACK_RELATIONSHIP);
    expect(d.style).toBe('dotted');
    expect(d.directed).toBe(true);
  });
});

describe('registerRelationshipType', () => {
  it('registers a custom type', () => {
    registerRelationshipType('_test_blocks', {
      color: '#ef4444', style: 'solid', directed: true, label: 'Blocks',
    });
    const d = lookupRelationshipType('_test_blocks');
    expect(d.color).toBe('#ef4444');
    expect(d.label).toBe('Blocks');
  });

  it('overrides existing registration', () => {
    registerRelationshipType('_test_override', {
      color: '#111', style: 'solid', directed: true,
    });
    registerRelationshipType('_test_override', {
      color: '#222', style: 'dashed', directed: false,
    });
    const d = lookupRelationshipType('_test_override');
    expect(d.color).toBe('#222');
    expect(d.style).toBe('dashed');
  });
});
