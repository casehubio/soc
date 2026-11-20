import { describe, it, expect } from 'vitest';
import { dagNodeSchema } from './dag-node-schema.js';
import { primitivePlanItemSchema, compoundPlanItemSchema } from './plan-item-schema.js';

describe('dag-node-schema', () => {
  it('has id, taskId, taskDescription, executorName, dependsOn, joinType', () => {
    const props = dagNodeSchema.properties as Record<string, any>;
    expect(props.id).toBeDefined();
    expect(props.taskId).toBeDefined();
    expect(props.taskDescription).toBeDefined();
    expect(props.executorName).toBeDefined();
    expect(props.dependsOn).toBeDefined();
    expect(props.joinType).toBeDefined();
  });

  it('has x-group on all properties', () => {
    const props = dagNodeSchema.properties as Record<string, any>;
    for (const [key, prop] of Object.entries(props)) {
      expect(prop['x-group'], `${key} missing x-group`).toBeDefined();
    }
  });

  it('joinType is enum ALL_OF / ANY_OF', () => {
    const joinType = (dagNodeSchema.properties as any).joinType;
    expect(joinType.enum).toEqual(['ALL_OF', 'ANY_OF']);
  });

  it('marks id, taskId, dependsOn as readOnly', () => {
    const props = dagNodeSchema.properties as Record<string, any>;
    expect(props.id.readOnly).toBe(true);
    expect(props.taskId.readOnly).toBe(true);
    expect(props.dependsOn.readOnly).toBe(true);
  });
});

describe('primitive-plan-item-schema', () => {
  it('has required name', () => {
    expect(primitivePlanItemSchema.required).toContain('name');
  });

  it('has x-group on all properties', () => {
    const props = primitivePlanItemSchema.properties as Record<string, any>;
    for (const [key, prop] of Object.entries(props)) {
      expect(prop['x-group'], `${key} missing x-group`).toBeDefined();
    }
  });

  it('has executor with nested name and description', () => {
    const executor = (primitivePlanItemSchema.properties as any).executor;
    expect(executor.properties.name).toBeDefined();
    expect(executor.properties.description).toBeDefined();
  });

  it('groups entryCondition as Behaviour', () => {
    const props = primitivePlanItemSchema.properties as Record<string, any>;
    expect(props.entryCondition['x-group']).toBe('Behaviour');
  });
});

describe('compound-plan-item-schema', () => {
  it('has required name', () => {
    expect(compoundPlanItemSchema.required).toContain('name');
  });

  it('has x-group on all properties', () => {
    const props = compoundPlanItemSchema.properties as Record<string, any>;
    for (const [key, prop] of Object.entries(props)) {
      expect(prop['x-group'], `${key} missing x-group`).toBeDefined();
    }
  });

  it('has dispatchMode ORCHESTRATED/CHOREOGRAPHED', () => {
    const dm = (compoundPlanItemSchema.properties as any).dispatchMode;
    expect(dm.enum).toEqual(['ORCHESTRATED', 'CHOREOGRAPHED']);
  });

  it('has repeatable boolean', () => {
    const rep = (compoundPlanItemSchema.properties as any).repeatable;
    expect(rep.type).toBe('boolean');
  });

  it('groups planningStrategy and scopedBindings as Advanced', () => {
    const props = compoundPlanItemSchema.properties as Record<string, any>;
    expect(props.planningStrategy['x-group']).toBe('Advanced');
    expect(props.scopedBindings['x-group']).toBe('Advanced');
    expect(props.planningStrategy['x-visibility']).toBe('advanced');
    expect(props.scopedBindings['x-visibility']).toBe('advanced');
  });
});
