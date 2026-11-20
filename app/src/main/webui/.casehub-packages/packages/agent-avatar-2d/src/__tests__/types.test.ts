import { describe, it, expect } from 'vitest';
import type {
  AvatarPayload, PartAssignment, FamilyPalette, AvatarModifiers,
  PartModifiers, AxisExpression, PartsCollection, FixedCollection,
} from '../types.js';
import { ARCHETYPE_FAMILIES, AVATAR_SIZES, DetailLevel, isFixedCollection } from '../types.js';

describe('types', () => {
  it('ARCHETYPE_FAMILIES contains all 12 families', () => {
    expect(ARCHETYPE_FAMILIES).toHaveLength(12);
    expect(ARCHETYPE_FAMILIES).toContain('Sage');
    expect(ARCHETYPE_FAMILIES).toContain('Hero');
    expect(ARCHETYPE_FAMILIES).toContain('Magician');
    expect(ARCHETYPE_FAMILIES).toContain('Rebel');
    expect(ARCHETYPE_FAMILIES).toContain('Explorer');
    expect(ARCHETYPE_FAMILIES).toContain('Creator');
    expect(ARCHETYPE_FAMILIES).toContain('Innocent');
    expect(ARCHETYPE_FAMILIES).toContain('Caregiver');
    expect(ARCHETYPE_FAMILIES).toContain('Jester');
    expect(ARCHETYPE_FAMILIES).toContain('Lover');
    expect(ARCHETYPE_FAMILIES).toContain('Sovereign');
    expect(ARCHETYPE_FAMILIES).toContain('Everyman');
  });

  it('AVATAR_SIZES maps to pixel values', () => {
    expect(AVATAR_SIZES.xs).toBe(24);
    expect(AVATAR_SIZES.sm).toBe(40);
    expect(AVATAR_SIZES.md).toBe(64);
    expect(AVATAR_SIZES.lg).toBe(128);
  });

  it('DetailLevel enum orders correctly', () => {
    expect(DetailLevel.XS).toBeLessThan(DetailLevel.SM);
    expect(DetailLevel.SM).toBeLessThan(DetailLevel.MD);
    expect(DetailLevel.MD).toBeLessThan(DetailLevel.LG);
  });

  it('AvatarPayload type is structurally sound', () => {
    const payload: AvatarPayload = {
      family: 'Sage',
      subArchetype: 'Detective',
      collection: 'mythic',
    };
    expect(payload.family).toBe('Sage');
    expect(payload.subArchetype).toBe('Detective');
  });

  it('PartAssignment has all required part categories', () => {
    const assignment: PartAssignment = {
      head: 'oval',
      hair: 'bald-sides',
      facialHair: 'none',
      costume: 'blazer-tie',
      eyebrows: 'thin-arched',
      glasses: 'round-wire',
      hat: null,
      expression: null,
      props: ['magnifying-glass', 'notebook'],
      accessories: [],
    };
    expect(assignment.head).toBe('oval');
    expect(assignment.props).toHaveLength(2);
    expect(assignment.hat).toBeNull();
  });

  it('FamilyPalette has colour fields', () => {
    const palette: FamilyPalette = {
      primary: '#2c3e6b',
      secondary: '#4a6fa5',
      accent: '#e8e4dc',
      skin: '#d4a574',
      hairColor: '#3a2a1a',
    };
    expect(palette.primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.skin).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('isFixedCollection returns true for fixed collections', () => {
    const coll: FixedCollection = {
      id: 'test', label: 'Test', type: 'fixed',
      fixedSvgs: new Map([['Sage/Detective', '<svg></svg>']]),
    };
    expect(isFixedCollection(coll)).toBe(true);
  });

  it('isFixedCollection returns false for parts collections', () => {
    const coll: PartsCollection = {
      id: 'test', label: 'Test', type: 'parts',
      partsUrl: '', previewUrl: '',
      parts: new Map([['head:oval', '<ellipse/>']]),
    };
    expect(isFixedCollection(coll)).toBe(false);
  });
});
