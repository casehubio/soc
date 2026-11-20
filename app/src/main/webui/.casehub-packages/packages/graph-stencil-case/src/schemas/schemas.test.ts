import { describe, it, expect } from 'vitest';
import { milestoneSchema } from './milestone-schema.js';
import { goalSchema } from './goal-schema.js';
import { subcaseSchema } from './subcase-schema.js';
import { bindingSchema } from './binding-schema.js';
import { workerSchema } from './worker-schema.js';

describe('milestone-schema', () => {
  it('has required name and condition fields', () => {
    expect(milestoneSchema.required).toContain('name');
    expect(milestoneSchema.required).toContain('condition');
  });

  it('has x-group on all properties', () => {
    const props = milestoneSchema.properties as Record<string, any>;
    for (const [key, prop] of Object.entries(props)) {
      expect(prop['x-group'], `${key} missing x-group`).toBeDefined();
    }
  });

  it('groups name and description as Identity', () => {
    const props = milestoneSchema.properties as Record<string, any>;
    expect(props.name['x-group']).toBe('Identity');
    expect(props.description['x-group']).toBe('Identity');
  });

  it('marks SLA fields as advanced', () => {
    const props = milestoneSchema.properties as Record<string, any>;
    expect(props.slaDuration['x-visibility']).toBe('advanced');
    expect(props.slaStartFrom['x-visibility']).toBe('advanced');
  });
});

describe('goal-schema', () => {
  it('has required name and condition fields', () => {
    expect(goalSchema.required).toContain('name');
    expect(goalSchema.required).toContain('condition');
  });

  it('has x-group on all properties', () => {
    const props = goalSchema.properties as Record<string, any>;
    for (const [key, prop] of Object.entries(props)) {
      expect(prop['x-group'], `${key} missing x-group`).toBeDefined();
    }
  });

  it('groups condition as Behaviour', () => {
    const props = goalSchema.properties as Record<string, any>;
    expect(props.condition['x-group']).toBe('Behaviour');
  });
});

describe('subcase-schema', () => {
  it('has required namespace, name, version', () => {
    expect(subcaseSchema.required).toEqual(expect.arrayContaining(['namespace', 'name', 'version']));
  });

  it('has x-group on all properties', () => {
    const props = subcaseSchema.properties as Record<string, any>;
    for (const [key, prop] of Object.entries(props)) {
      expect(prop['x-group'], `${key} missing x-group`).toBeDefined();
    }
  });

  it('groups namespace and name as Identity', () => {
    const props = subcaseSchema.properties as Record<string, any>;
    expect(props.namespace['x-group']).toBe('Identity');
    expect(props.name['x-group']).toBe('Identity');
  });

  it('groups version and completionStrategy as Configuration', () => {
    const props = subcaseSchema.properties as Record<string, any>;
    expect(props.version['x-group']).toBe('Configuration');
    expect(props.completionStrategy['x-group']).toBe('Configuration');
  });

  it('marks mapping and M-of-N fields as advanced', () => {
    const props = subcaseSchema.properties as Record<string, any>;
    expect(props.inputMapping['x-visibility']).toBe('advanced');
    expect(props.outputMapping['x-visibility']).toBe('advanced');
    expect(props.maxRecursionDepth['x-visibility']).toBe('advanced');
    expect(props.groupId['x-visibility']).toBe('advanced');
    expect(props.totalInGroup['x-visibility']).toBe('advanced');
    expect(props.requiredCount['x-visibility']).toBe('advanced');
    expect(props.onThresholdReached['x-visibility']).toBe('advanced');
  });
});

describe('binding-schema', () => {
  it('has on as the only required field', () => {
    expect(bindingSchema.required).toContain('on');
  });

  it('has x-group on all properties', () => {
    const props = bindingSchema.properties as Record<string, any>;
    for (const [key, prop] of Object.entries(props)) {
      expect(prop['x-group'], `${key} missing x-group`).toBeDefined();
    }
  });

  it('has targetType with oneOf and x-discriminator', () => {
    const props = bindingSchema.properties as Record<string, any>;
    expect(props.targetType).toBeDefined();
    expect(props.targetType['x-discriminator']).toBe('_target');
    expect(props.targetType.oneOf).toHaveLength(3);
    const titles = props.targetType.oneOf.map((b: any) => b.title);
    expect(titles).toEqual(['Capability', 'SubCase', 'HumanTask']);
  });

  it('no longer has top-level capability, subCase, humanTask properties', () => {
    const props = bindingSchema.properties as Record<string, any>;
    expect(props.capability).toBeUndefined();
    expect(props.subCase).toBeUndefined();
    expect(props.humanTask).toBeUndefined();
  });

  it('has trigger (on) with oneOf and x-discriminator', () => {
    const props = bindingSchema.properties as Record<string, any>;
    expect(props.on.oneOf).toBeDefined();
    expect(props.on['x-discriminator']).toBeDefined();
  });

  it('has 4 trigger branches: contextChange, cloudEvent, schedule, scopeActivated', () => {
    const props = bindingSchema.properties as Record<string, any>;
    const triggerKeys = props.on.oneOf.map((b: any) => Object.keys(b.properties)[0]);
    expect(triggerKeys).toEqual(expect.arrayContaining(['contextChange', 'cloudEvent', 'schedule', 'scopeActivated']));
    expect(triggerKeys).toHaveLength(4);
  });

  it('groups name as Identity', () => {
    const props = bindingSchema.properties as Record<string, any>;
    expect(props.name['x-group']).toBe('Identity');
  });

  it('groups targetType as Target', () => {
    const props = bindingSchema.properties as Record<string, any>;
    expect(props.targetType['x-group']).toBe('Target');
  });

  it('has all Advanced fields from Binding type', () => {
    const props = bindingSchema.properties as Record<string, any>;
    expect(props.conflictResolverStrategy).toBeDefined();
    expect(props.outcomePolicy).toBeDefined();
    expect(props.inputProjectionOverride).toBeDefined();
    expect(props.contextWrite).toBeDefined();
    expect(props.producedKeys).toBeDefined();
    expect(props.lifecycleScope).toBeDefined();
    expect(props.participation).toBeDefined();
    expect(props.executionMode).toBeDefined();
  });

  it('marks Advanced fields with x-visibility advanced', () => {
    const props = bindingSchema.properties as Record<string, any>;
    expect(props.conflictResolverStrategy['x-visibility']).toBe('advanced');
    expect(props.outcomePolicy['x-visibility']).toBe('advanced');
    expect(props.inputProjectionOverride['x-visibility']).toBe('advanced');
    expect(props.contextWrite['x-visibility']).toBe('advanced');
    expect(props.producedKeys['x-visibility']).toBe('advanced');
    expect(props.lifecycleScope['x-visibility']).toBe('advanced');
    expect(props.participation['x-visibility']).toBe('advanced');
    expect(props.executionMode['x-visibility']).toBe('advanced');
  });
});

describe('worker-schema', () => {
  it('has required name and capabilities', () => {
    expect(workerSchema.required).toEqual(expect.arrayContaining(['name', 'capabilities']));
  });

  it('has x-group on all top-level properties', () => {
    const props = workerSchema.properties as Record<string, any>;
    for (const [key, prop] of Object.entries(props)) {
      expect(prop['x-group'], `${key} missing x-group`).toBeDefined();
    }
  });

  it('groups name and description as Identity', () => {
    const props = workerSchema.properties as Record<string, any>;
    expect(props.name['x-group']).toBe('Identity');
    expect(props.description['x-group']).toBe('Identity');
  });

  it('groups capabilities as Configuration', () => {
    const props = workerSchema.properties as Record<string, any>;
    expect(props.capabilities['x-group']).toBe('Configuration');
  });

  it('has functionType with oneOf and x-discriminator in Function group', () => {
    const props = workerSchema.properties as Record<string, any>;
    expect(props.functionType.oneOf).toBeDefined();
    expect(props.functionType['x-discriminator']).toBeDefined();
    expect(props.functionType['x-group']).toBe('Function');
  });

  it('has 5 function type branches: agent, do, a2a, mcp, sequence', () => {
    const props = workerSchema.properties as Record<string, any>;
    const branchKeys = props.functionType.oneOf.map((b: any) => b.properties._type.const);
    expect(branchKeys).toEqual(expect.arrayContaining(['agent', 'do', 'a2a', 'mcp', 'sequence']));
    expect(branchKeys).toHaveLength(5);
  });

  it('agent branch has systemPrompt with x-editor-component', () => {
    const props = workerSchema.properties as Record<string, any>;
    const agentBranch = props.functionType.oneOf.find((b: any) => b.properties._type.const === 'agent');
    expect(agentBranch.properties.systemPrompt).toBeDefined();
    expect(agentBranch.properties.systemPrompt['x-editor-component']).toBe('agency-prompt-editor');
  });

  it('agent branch has model with oneOf and x-discriminator for 5 providers', () => {
    const props = workerSchema.properties as Record<string, any>;
    const agentBranch = props.functionType.oneOf.find((b: any) => b.properties._type.const === 'agent');
    expect(agentBranch.properties.model.oneOf).toBeDefined();
    expect(agentBranch.properties.model['x-discriminator']).toBeDefined();
    expect(agentBranch.properties.model.oneOf).toHaveLength(5);
  });

  it('agent model covers all 5 providers', () => {
    const props = workerSchema.properties as Record<string, any>;
    const agentBranch = props.functionType.oneOf.find((b: any) => b.properties._type.const === 'agent');
    const providerKeys = agentBranch.properties.model.oneOf.map((b: any) => b.properties._provider.const);
    expect(providerKeys).toEqual(['openai', 'anthropic', 'ollama', 'mistralAi', 'googleAiGemini']);
  });

  it('mcp branch has oneOf with x-discriminator for stdio and http', () => {
    const props = workerSchema.properties as Record<string, any>;
    const mcpBranch = props.functionType.oneOf.find((b: any) => b.properties._type.const === 'mcp');
    expect(mcpBranch.properties.transport.oneOf).toBeDefined();
    expect(mcpBranch.properties.transport['x-discriminator']).toBeDefined();
    const transportTypes = mcpBranch.properties.transport.oneOf.map((b: any) => b.properties._transport.const);
    expect(transportTypes).toEqual(['stdio', 'http']);
  });

  it('a2a branch has endpoint with format uri', () => {
    const props = workerSchema.properties as Record<string, any>;
    const a2aBranch = props.functionType.oneOf.find((b: any) => b.properties._type.const === 'a2a');
    expect(a2aBranch.properties.endpoint.format).toBe('uri');
  });

  it('do branch has x-editor-component agency-swf-link', () => {
    const props = workerSchema.properties as Record<string, any>;
    const doBranch = props.functionType.oneOf.find((b: any) => b.properties._type.const === 'do');
    expect(doBranch.properties.workflow['x-editor-component']).toBe('agency-swf-link');
  });

  it('sequence branch has items type string', () => {
    const props = workerSchema.properties as Record<string, any>;
    const seqBranch = props.functionType.oneOf.find((b: any) => b.properties._type.const === 'sequence');
    expect(seqBranch.properties.steps.type).toBe('array');
    expect(seqBranch.properties.steps.items.type).toBe('string');
  });

  it('marks executionPolicy, contextType, outputType as Advanced', () => {
    const props = workerSchema.properties as Record<string, any>;
    expect(props.executionPolicy['x-group']).toBe('Advanced');
    expect(props.contextType['x-group']).toBe('Advanced');
    expect(props.outputType['x-group']).toBe('Advanced');
    expect(props.executionPolicy['x-visibility']).toBe('advanced');
    expect(props.contextType['x-visibility']).toBe('advanced');
    expect(props.outputType['x-visibility']).toBe('advanced');
  });
});
