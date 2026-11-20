import { describe, it, expect } from 'vitest';
import { CATALOG_TEMPLATES, FEATURED_TEMPLATES, buildDescriptor } from './catalog-templates.js';

describe('catalog-templates', () => {
  it('generates templates from all profession preset variants', () => {
    expect(CATALOG_TEMPLATES.length).toBeGreaterThan(100);
    for (const t of CATALOG_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.profession).toBeTruthy();
      expect(t.role).toBeTruthy();
      expect(t.variant.archetype).toMatch(/\w+\/\w+/);
    }
  });

  it('assigns unique IDs', () => {
    const ids = CATALOG_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('featured templates is a subset with 3-5 entries', () => {
    expect(FEATURED_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    expect(FEATURED_TEMPLATES.length).toBeLessThanOrEqual(5);
    for (const ft of FEATURED_TEMPLATES) {
      expect(ft.featured).toBe(true);
      expect(CATALOG_TEMPLATES).toContain(ft);
    }
  });

  it('buildDescriptor produces valid FullAgentDescriptor', () => {
    const template = CATALOG_TEMPLATES.find(t => t.profession === 'Software' && t.role === 'Architect')!;
    expect(template).toBeTruthy();
    const desc = buildDescriptor(template);
    expect(desc.agentId).toBe('');
    expect(desc.name).toBe(template.variant.label);
    expect(desc.tenancyId).toBe('');
    expect(desc.archetypeFamily).toBeTruthy();
    expect(desc.subArchetype).toBeTruthy();
    expect(desc.personality?.mbti).toBeTruthy();
    expect(desc.profession).toBe('Software');
    expect(desc.role).toBe('Architect');
    expect(desc.preferredAlias).toBeTruthy();
  });

  it('every template has a preferredAlias', () => {
    for (const t of CATALOG_TEMPLATES) {
      expect(t.preferredAlias, `${t.id} missing alias`).toBeTruthy();
    }
  });
});
