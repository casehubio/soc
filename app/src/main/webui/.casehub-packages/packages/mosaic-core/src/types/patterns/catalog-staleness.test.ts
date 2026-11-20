import { describe, it, expect } from 'vitest';
import catalog from './capability-catalog.json';

type CatalogEntry = { name: string; category: string; hasYamlRoot: boolean };
type CatalogCategory = { name: string };

/**
 * All TS type entries across all categories.
 * This list MUST match the Java CapabilityType enum 1:1.
 * If this test fails, either:
 *   1. Java added/removed a CapabilityType value → update this list AND the TS interfaces
 *   2. TS added/removed an entry → update Java CapabilityType enum
 */
function getAllTsTypeEntries(): string[] {
  const orchestration = ['supervisor', 'choreography', 'saga', 'decomposition'];
  const deliberation = ['voting', 'debate', 'negotiation', 'coalition', 'normative'];
  const perception = ['summarisation', 'narrative', 'observation'];
  const communication = ['channel-execution', 'channel-summary'];
  const governance = ['judgment', 'oversight', 'attestation', 'trust'];
  const optimisation = ['prompt-optimisation'];
  const social = ['memory-hygiene', 'cognition', 'reflection'];
  const playbook = ['sequence', 'parallel', 'loop', 'conditional', 'match', 'try-catch'];

  return [
    ...orchestration, ...deliberation, ...perception, ...communication,
    ...governance, ...optimisation, ...social, ...playbook,
  ];
}

describe('capability catalog staleness', () => {
  const catalogEntries: CatalogEntry[] = catalog.capabilities;
  const catalogCategories: CatalogCategory[] = catalog.categories;

  it('catalog has expected version', () => {
    expect(catalog.version).toBe(1);
  });

  it('every catalog category has a matching TS category', () => {
    const tsCategories = [
      'orchestration', 'deliberation', 'perception',
      'communication', 'governance', 'optimisation', 'social', 'playbook',
    ];
    for (const cat of catalogCategories) {
      expect(tsCategories, `Missing TS category for catalog category '${cat.name}'`).toContain(cat.name);
    }
    expect(catalogCategories.length).toBe(tsCategories.length);
  });

  it('every catalog entry has a matching TS type entry', () => {
    const allTsTypes = getAllTsTypeEntries();
    for (const entry of catalogEntries) {
      expect(allTsTypes, `Missing TS type for catalog entry '${entry.name}'`).toContain(entry.name);
    }
  });

  it('every TS type entry has a matching catalog entry', () => {
    const catalogNames = catalogEntries.map(e => e.name);
    const allTsTypes = getAllTsTypeEntries();
    for (const tsType of allTsTypes) {
      expect(catalogNames, `Missing catalog entry for TS type '${tsType}'`).toContain(tsType);
    }
  });

  it('catalog and TS have same entry count', () => {
    const allTsTypes = getAllTsTypeEntries();
    expect(allTsTypes.length).toBe(catalogEntries.length);
  });
});
