import { describe, it, expect } from 'vitest';
import { initProfile } from './profile-derivation.js';

describe('initProfile', () => {
  it('derives full personality profile for Caregiver/Angel', () => {
    const profile = initProfile('Caregiver/Angel');
    expect(profile.mbti).toBe('INFJ');
    expect(profile.enneagram).toBe('Type 2');
    expect(profile.disc).toBe('S');
    expect(profile.sdi).toBe('Blue');
    expect(profile.belbin?.primary).toBe('Co-ordinator');
    expect(profile.belbin?.secondaries).toContain('Teamworker');
    expect(profile.bigFive?.O).toBe('low');
    expect(profile.bigFive?.A).toBe('high');
  });

  it('derives profile for Hero/Warrior', () => {
    const profile = initProfile('Hero/Warrior');
    expect(profile.mbti).toBe('ENTJ');
    expect(profile.enneagram).toBe('Type 8');
    expect(profile.disc).toBe('D');
    expect(profile.sdi).toBe('Red');
  });

  it('returns empty profile for unknown archetype', () => {
    const profile = initProfile('Unknown/None');
    expect(profile.mbti).toBeUndefined();
    expect(profile.sdi).toBeUndefined();
  });
});
