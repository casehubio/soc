import { describe, it, expect } from 'vitest';
import schema from './pattern-spec-schema.json';
import catalog from './capability-catalog.json';

type SchemaVariant = {
  properties?: Record<string, { const?: string }>;
  required?: string[];
  $ref?: string;
};

type SchemaObject = {
  oneOf?: SchemaVariant[];
  properties?: Record<string, unknown>;
};

const defs: Record<string, SchemaObject> =
  (schema as Record<string, unknown>)['$defs'] as Record<string, SchemaObject>;

function getSchemaVariants(defName: string): string[] {
  const def = defs[defName];
  if (!def?.oneOf) return [];
  return def.oneOf
    .map(v => v.properties?.['type']?.const)
    .filter((v): v is string => v !== undefined)
    .sort();
}

function getSchemaTopologies(): string[] {
  const root = schema as unknown as SchemaObject;
  if (!root.oneOf) return [];
  return (root.oneOf as SchemaVariant[])
    .map(v => v.properties?.['type']?.const)
    .filter((v): v is string => v !== undefined)
    .sort();
}

function getSchemaRequiredFields(defName: string, variantType: string): string[] {
  const def = defs[defName];
  if (!def?.oneOf) return [];
  const variant = def.oneOf.find(v => v.properties?.['type']?.const === variantType);
  if (!variant?.required) return [];
  return variant.required.filter(f => f !== 'type').sort();
}

const TS_TOPOLOGIES = [
  'conditional', 'debate', 'htn', 'loop',
  'parallel', 'sequence', 'supervisor', 'voting',
].sort();

const TS_ROUTING_VARIANTS = [
  'first-match', 'llm-selected', 'round-robin', 'select-all', 'sequential',
].sort();

const TS_AGGREGATION_VARIANTS = [
  'auction', 'collect-all', 'majority-vote', 'pass-through',
].sort();

const TS_TERMINATION_VARIANTS = [
  'accepted', 'agent-count', 'all-agreed', 'contested', 'convergence',
  'deadline', 'goal-reached', 'judge-convergence', 'max-iterations',
  'single-pass', 'supervisor', 'terminal-outcome',
].sort();

const TS_DECOMPOSITION_VARIANTS = [
  'capability-dependency', 'forward-reasoning', 'goap', 'heuristic',
  'hybrid', 'identity', 'llm', 'static',
].sort();

const TS_ACTIVATION_VARIANTS = [
  'max-iterations', 'on-dispatch',
].sort();

const TS_AGENT_REF_VARIANTS = [
  'channel', 'composed', 'external', 'human', 'worker',
].sort();

const TS_TASK_NODE_VARIANTS = [
  'compound', 'primitive',
].sort();

const TS_AGREEMENT_VARIANTS = [
  'majority', 'threshold', 'unanimous',
].sort();

const TS_JUDGMENT_TRIGGER_VARIANTS = [
  'alwaysYield', 'confidenceThreshold', 'iterationBased', 'neverYield',
].sort();

const TS_JUDGMENT_CALLER_VARIANTS = [
  'escalationChain', 'fanOut', 'single',
].sort();

describe('schema staleness — variant names', () => {
  it('pattern topologies match schema', () => {
    expect(TS_TOPOLOGIES).toEqual(getSchemaTopologies());
  });

  it('RoutingSpec variants match schema', () => {
    expect(TS_ROUTING_VARIANTS).toEqual(getSchemaVariants('RoutingSpec'));
  });

  it('AggregationSpec variants match schema', () => {
    expect(TS_AGGREGATION_VARIANTS).toEqual(getSchemaVariants('AggregationSpec'));
  });

  it('TerminationSpec variants match schema', () => {
    expect(TS_TERMINATION_VARIANTS).toEqual(getSchemaVariants('TerminationSpec'));
  });

  it('DecompositionSpec variants match schema', () => {
    expect(TS_DECOMPOSITION_VARIANTS).toEqual(getSchemaVariants('DecompositionSpec'));
  });

  it('ActivationSpec variants match schema', () => {
    expect(TS_ACTIVATION_VARIANTS).toEqual(getSchemaVariants('ActivationSpec'));
  });

  it('AgentRefSpec variants match schema', () => {
    expect(TS_AGENT_REF_VARIANTS).toEqual(getSchemaVariants('AgentRefSpec'));
  });

  it('TaskNodeSpec variants match schema', () => {
    expect(TS_TASK_NODE_VARIANTS).toEqual(getSchemaVariants('TaskNodeSpec'));
  });

  it('AgreementSpec variants match schema', () => {
    expect(TS_AGREEMENT_VARIANTS).toEqual(getSchemaVariants('AgreementSpec'));
  });

  it('JudgmentSpec trigger variants match schema', () => {
    const triggerDef = defs['JudgmentSpec']?.properties?.['trigger'] as SchemaObject | undefined;
    if (!triggerDef?.oneOf) { expect.fail('JudgmentSpec.trigger missing oneOf'); return; }
    const schemaVariants = (triggerDef.oneOf as SchemaVariant[])
      .map(v => v.properties?.['type']?.const)
      .filter((v): v is string => v !== undefined)
      .sort();
    expect(TS_JUDGMENT_TRIGGER_VARIANTS).toEqual(schemaVariants);
  });

  it('JudgmentSpec caller variants match schema', () => {
    const callerDef = defs['JudgmentSpec']?.properties?.['caller'] as SchemaObject | undefined;
    if (!callerDef?.oneOf) { expect.fail('JudgmentSpec.caller missing oneOf'); return; }
    const schemaVariants = (callerDef.oneOf as SchemaVariant[])
      .map(v => v.properties?.['type']?.const)
      .filter((v): v is string => v !== undefined)
      .sort();
    expect(TS_JUDGMENT_CALLER_VARIANTS).toEqual(schemaVariants);
  });
});

describe('schema staleness — required fields', () => {
  it('all sub-spec variants have type as only required field', () => {
    const specs = [
      'RoutingSpec', 'AggregationSpec', 'TerminationSpec',
      'DecompositionSpec', 'ActivationSpec', 'AgentRefSpec',
      'TaskNodeSpec', 'AgreementSpec',
    ];
    for (const spec of specs) {
      const variants = getSchemaVariants(spec);
      for (const variant of variants) {
        const extraRequired = getSchemaRequiredFields(spec, variant);
        expect(
          extraRequired,
          `${spec}.${variant} has unexpected required fields beyond 'type'`,
        ).toEqual([]);
      }
    }
  });
});

describe('schema staleness — name alignment', () => {
  const TOPOLOGY_TO_CAPABILITY: Record<string, string> = {
    htn: 'decomposition',
  };

  it('schema topologies map to catalog capability names', () => {
    const catalogNames: string[] = (catalog.capabilities as Array<{ name: string }>).map(c => c.name);
    const topologies = getSchemaTopologies();
    for (const t of topologies) {
      const capabilityName = TOPOLOGY_TO_CAPABILITY[t] ?? t;
      expect(catalogNames, `Schema topology '${t}' (capability '${capabilityName}') not in catalog`).toContain(capabilityName);
    }
  });
});
