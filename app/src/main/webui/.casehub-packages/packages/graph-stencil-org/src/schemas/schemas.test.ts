import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearPropertySchemas, getPropertySchema, registerPropertySchema,
} from '@casehubio/pages-diagram-core';
import { orgUnitSchema, orgAgentSchema } from './index.js';

describe('property schemas', () => {
  beforeEach(() => {
    clearPropertySchemas();
  });

  it('orgUnitSchema has required fields', () => {
    expect(orgUnitSchema.properties).toHaveProperty('unitId');
    expect(orgUnitSchema.properties).toHaveProperty('name');
    expect(orgUnitSchema.properties).toHaveProperty('kind');
    expect(orgUnitSchema.properties).toHaveProperty('tenancyId');
  });

  it('orgAgentSchema has required fields', () => {
    expect(orgAgentSchema.properties).toHaveProperty('agentId');
    expect(orgAgentSchema.properties).toHaveProperty('role');
  });

  it('schemas can be registered and retrieved', () => {
    registerPropertySchema('org-unit', orgUnitSchema);
    registerPropertySchema('org-agent', orgAgentSchema);
    expect(getPropertySchema('org-unit')).toBe(orgUnitSchema);
    expect(getPropertySchema('org-agent')).toBe(orgAgentSchema);
  });

  it('orgUnitSchema fields have titles', () => {
    for (const [, field] of Object.entries(orgUnitSchema.properties)) {
      expect((field as { title?: string }).title).toBeDefined();
    }
  });

  it('orgAgentSchema fields have titles', () => {
    for (const [, field] of Object.entries(orgAgentSchema.properties)) {
      expect((field as { title?: string }).title).toBeDefined();
    }
  });
});
