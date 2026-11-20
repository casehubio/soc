import { describe, it, expect } from 'vitest';
import { swfTaskSchema } from './swf-task-schema.js';

const defs = (swfTaskSchema as any).$defs as Record<string, any>;

describe('swf-task-schema x-group annotations', () => {
  const defNames = ['CallTask', 'SetTask', 'SwitchTask', 'RaiseTask', 'TryTask', 'TryCatchTask'];

  for (const defName of defNames) {
    it(`${defName} has x-group on all properties`, () => {
      const props = defs[defName].properties as Record<string, any>;
      for (const [key, prop] of Object.entries(props)) {
        expect(prop['x-group'], `${defName}.${key} missing x-group`).toBeDefined();
      }
    });

    it(`${defName} has x-order on all properties`, () => {
      const props = defs[defName].properties as Record<string, any>;
      for (const [key, prop] of Object.entries(props)) {
        expect(prop['x-order'], `${defName}.${key} missing x-order`).toBeDefined();
      }
    });

    it(`${defName} metadata is Advanced with x-visibility`, () => {
      const metadata = defs[defName].properties.metadata;
      expect(metadata['x-group']).toBe('Advanced');
      expect(metadata['x-visibility']).toBe('advanced');
    });
  }

  it('CallTask groups call as Identity and with/input/output as Configuration', () => {
    const props = defs.CallTask.properties;
    expect(props.call['x-group']).toBe('Identity');
    expect(props.with['x-group']).toBe('Configuration');
    expect(props.input['x-group']).toBe('Configuration');
    expect(props.output['x-group']).toBe('Configuration');
  });

  it('CallTask timeout is Advanced with x-visibility', () => {
    expect(defs.CallTask.properties.timeout['x-group']).toBe('Advanced');
    expect(defs.CallTask.properties.timeout['x-visibility']).toBe('advanced');
  });
});
