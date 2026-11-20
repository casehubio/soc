import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { applyPropertyEdit, addElement, removeElement, switchBindingTarget, switchFunctionType, switchMcpTransport, switchModelProvider, switchTriggerType, removeCaseEdge, addCaseEdge } from './yaml-editor.js';
import { toGraph } from './case-adapter.js';
import type { CaseDefinition } from '../types/case-definition.js';

const SAMPLE_YAML = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings:
    - name: scan
      capability: ocr
      when: '.doc != null'
      on:
        contextChange:
          filter: '.doc != null'
  workers:
    - name: ocr-worker
      capabilities:
        - ocr
  milestones:
    - name: extracted
      condition: '.result != null'
`;

describe('applyPropertyEdit', () => {
  it('updates a string property', () => {
    const result = applyPropertyEdit(
      SAMPLE_YAML,
      ['spec', 'bindings', 0],
      ['when'],
      '.ocrResult != null',
    );
    expect(result).toContain('.ocrResult != null');
    expect(result).toContain('name: scan');
  });

  it('preserves formatting of untouched sections', () => {
    const result = applyPropertyEdit(
      SAMPLE_YAML,
      ['spec', 'bindings', 0],
      ['when'],
      '.changed',
    );
    expect(result).toContain('namespace: test');
    expect(result).toContain('dsl: "1.0.0"');
    expect(result).toContain('capabilities:\n        - ocr');
  });

  it('updates a nested property via array path', () => {
    const result = applyPropertyEdit(
      SAMPLE_YAML,
      ['spec', 'milestones', 0],
      ['condition'],
      '.done == true',
    );
    expect(result).toContain('.done == true');
  });

  it('coerces number values', () => {
    const yaml = SAMPLE_YAML + '  goals:\n    - name: g1\n      retries: 3\n';
    const result = applyPropertyEdit(
      yaml,
      ['spec', 'goals', 0],
      ['retries'],
      5,
    );
    expect(result).toContain('retries: 5');
  });

  it('deletes key when value is undefined', () => {
    const result = applyPropertyEdit(
      SAMPLE_YAML,
      ['spec', 'bindings', 0],
      ['when'],
      undefined,
    );
    expect(result).not.toContain('when:');
    expect(result).toContain('name: scan');
  });

  it('handles deep nested path', () => {
    const yaml = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings:
    - name: b1
      outcomePolicy:
        onDecline: REROUTE
        maxRerouteAttempts: 3
`;
    const result = applyPropertyEdit(
      yaml,
      ['spec', 'bindings', 0],
      ['outcomePolicy', 'onDecline'],
      'FAULT',
    );
    expect(result).toContain('onDecline: FAULT');
    expect(result).toContain('maxRerouteAttempts: 3');
  });
});

describe('addElement', () => {
  it('adds a binding with default name and capability', () => {
    const result = addElement(SAMPLE_YAML, 'binding');
    const parsed = parseYaml(result) as CaseDefinition;
    const bindings = parsed.spec.bindings!;
    const added = bindings[bindings.length - 1];
    expect(added.name).toBe('binding-1');
    expect(added.capability).toBe('');
  });

  it('adds a worker with default name and empty capabilities', () => {
    const result = addElement(SAMPLE_YAML, 'worker');
    const parsed = parseYaml(result) as CaseDefinition;
    const workers = parsed.spec.workers!;
    const added = workers[workers.length - 1];
    expect(added.name).toBe('worker-1');
    expect(added.capabilities).toEqual([]);
  });

  it('adds a milestone with default name', () => {
    const result = addElement(SAMPLE_YAML, 'milestone');
    const parsed = parseYaml(result) as CaseDefinition;
    const milestones = parsed.spec.milestones!;
    const added = milestones[milestones.length - 1];
    expect(added.name).toBe('milestone-1');
  });

  it('adds a goal with default name and kind', () => {
    const result = addElement(SAMPLE_YAML, 'goal');
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.goals![0].name).toBe('goal-1');
    expect(parsed.spec.goals![0].kind).toBe('success');
  });

  it('generates unique names when duplicates exist', () => {
    let yaml = addElement(SAMPLE_YAML, 'milestone');
    yaml = addElement(yaml, 'milestone');
    const parsed = parseYaml(yaml) as CaseDefinition;
    const names = parsed.spec.milestones!.map((m: { name: string }) => m.name);
    expect(names).toContain('milestone-1');
    expect(names).toContain('milestone-2');
  });

  it('merges caller-provided defaults over generated defaults', () => {
    const result = addElement(SAMPLE_YAML, 'worker', { name: 'custom', description: 'A worker' });
    const parsed = parseYaml(result) as CaseDefinition;
    const added = parsed.spec.workers![parsed.spec.workers!.length - 1];
    expect(added.name).toBe('custom');
    expect((added as Record<string, unknown>).description).toBe('A worker');
  });

  it('preserves CST formatting of untouched sections', () => {
    const result = addElement(SAMPLE_YAML, 'goal');
    expect(result).toContain('dsl: "1.0.0"');
    expect(result).toContain("when: '.doc != null'");
  });

  it('creates the array if it does not exist', () => {
    const yamlNoGoals = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings: []
`;
    const result = addElement(yamlNoGoals, 'goal');
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.goals).toHaveLength(1);
  });
});

describe('removeElement', () => {
  it('removes a binding by path', () => {
    const result = removeElement(SAMPLE_YAML, ['spec', 'bindings', 0]);
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.bindings).toHaveLength(0);
  });

  it('removes a worker by path', () => {
    const result = removeElement(SAMPLE_YAML, ['spec', 'workers', 0]);
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.workers).toHaveLength(0);
  });

  it('preserves other elements in the same array', () => {
    const yaml = addElement(SAMPLE_YAML, 'binding');
    const result = removeElement(yaml, ['spec', 'bindings', 0]);
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.bindings).toHaveLength(1);
    expect(parsed.spec.bindings![0].name).toBe('binding-1');
  });

  it('preserves CST formatting of untouched sections', () => {
    const result = removeElement(SAMPLE_YAML, ['spec', 'milestones', 0]);
    expect(result).toContain('dsl: "1.0.0"');
    expect(result).toContain('name: scan');
  });
});

describe('switchBindingTarget', () => {
  it('switches from capability to subCase', () => {
    const result = switchBindingTarget(SAMPLE_YAML, ['spec', 'bindings', 0], 'subCase');
    const parsed = parseYaml(result) as CaseDefinition;
    const binding = parsed.spec.bindings![0] as Record<string, unknown>;
    expect(binding.capability).toBeUndefined();
    expect(binding.subCase).toEqual({ namespace: '', name: '' });
  });

  it('switches from capability to humanTask', () => {
    const result = switchBindingTarget(SAMPLE_YAML, ['spec', 'bindings', 0], 'humanTask');
    const parsed = parseYaml(result) as CaseDefinition;
    const binding = parsed.spec.bindings![0] as Record<string, unknown>;
    expect(binding.capability).toBeUndefined();
    expect(binding.humanTask).toEqual({ title: '' });
  });

  it('switches from subCase back to capability', () => {
    let yaml = switchBindingTarget(SAMPLE_YAML, ['spec', 'bindings', 0], 'subCase');
    yaml = switchBindingTarget(yaml, ['spec', 'bindings', 0], 'capability');
    const parsed = parseYaml(yaml) as CaseDefinition;
    const binding = parsed.spec.bindings![0] as Record<string, unknown>;
    expect(binding.subCase).toBeUndefined();
    expect(binding.capability).toBe('');
  });

  it('preserves non-target properties', () => {
    const result = switchBindingTarget(SAMPLE_YAML, ['spec', 'bindings', 0], 'subCase');
    const parsed = parseYaml(result) as CaseDefinition;
    const binding = parsed.spec.bindings![0];
    expect(binding.name).toBe('scan');
    expect(binding.when).toBe('.doc != null');
  });

  it('round-trips through toGraph producing correct topology', () => {
    const result = switchBindingTarget(SAMPLE_YAML, ['spec', 'bindings', 0], 'subCase');
    const { model } = toGraph(result);
    const subcaseNodes = model.nodes.filter(n => n.type === 'subcase');
    expect(subcaseNodes.length).toBeGreaterThan(0);
    const capEdges = model.edges.filter(e => e.type === 'capability-dispatch' && e.source === 'binding:scan');
    expect(capEdges).toHaveLength(0);
  });
});

const AGENT_WORKER_YAML = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings: []
  workers:
    - name: my-worker
      capabilities:
        - analyze
      agent:
        systemPrompt: "You are helpful"
        inputProjection: "."
        outputProjection: "."
        model:
          openai:
            modelName: gpt-4
`;

describe('switchFunctionType', () => {
  it('switches agent to a2a', () => {
    const result = switchFunctionType(AGENT_WORKER_YAML, ['spec', 'workers', 0], 'a2a');
    const parsed = parseYaml(result) as CaseDefinition;
    const worker = parsed.spec.workers![0] as Record<string, unknown>;
    expect(worker.agent).toBeUndefined();
    expect(worker.a2a).toEqual({ endpoint: '' });
    expect(worker.name).toBe('my-worker');
    expect(worker.capabilities).toEqual(['analyze']);
  });

  it('switches agent to flow using do key', () => {
    const result = switchFunctionType(AGENT_WORKER_YAML, ['spec', 'workers', 0], 'flow');
    const parsed = parseYaml(result) as CaseDefinition;
    const worker = parsed.spec.workers![0] as Record<string, unknown>;
    expect(worker.agent).toBeUndefined();
    expect(worker.do).toEqual([]);
  });

  it('switches to external removes all function keys', () => {
    const result = switchFunctionType(AGENT_WORKER_YAML, ['spec', 'workers', 0], 'external');
    const parsed = parseYaml(result) as CaseDefinition;
    const worker = parsed.spec.workers![0] as Record<string, unknown>;
    expect(worker.agent).toBeUndefined();
    expect(worker.do).toBeUndefined();
    expect(worker.a2a).toBeUndefined();
    expect(worker.mcp).toBeUndefined();
    expect(worker.sequence).toBeUndefined();
    expect(worker.name).toBe('my-worker');
  });

  it('switches to mcp with stdio defaults', () => {
    const result = switchFunctionType(AGENT_WORKER_YAML, ['spec', 'workers', 0], 'mcp');
    const parsed = parseYaml(result) as CaseDefinition;
    const worker = parsed.spec.workers![0] as Record<string, unknown>;
    expect(worker.agent).toBeUndefined();
    expect(worker.mcp).toEqual({ command: [] });
  });

  it('switches to sequence with empty array', () => {
    const result = switchFunctionType(AGENT_WORKER_YAML, ['spec', 'workers', 0], 'sequence');
    const parsed = parseYaml(result) as CaseDefinition;
    const worker = parsed.spec.workers![0] as Record<string, unknown>;
    expect(worker.agent).toBeUndefined();
    expect(worker.sequence).toEqual([]);
  });

  it('switches to agent with full defaults', () => {
    const externalYaml = switchFunctionType(AGENT_WORKER_YAML, ['spec', 'workers', 0], 'external');
    const result = switchFunctionType(externalYaml, ['spec', 'workers', 0], 'agent');
    const parsed = parseYaml(result) as CaseDefinition;
    const worker = parsed.spec.workers![0] as Record<string, unknown>;
    const agent = worker.agent as Record<string, unknown>;
    expect(agent.systemPrompt).toBe('');
    expect(agent.inputProjection).toBe('.');
    expect(agent.model).toEqual({ openai: { modelName: '' } });
  });
});

describe('switchMcpTransport', () => {
  const MCP_YAML = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings: []
  workers:
    - name: tool-worker
      capabilities: []
      mcp:
        command:
          - /bin/tool
        env:
          KEY: val
`;

  it('switches stdio to http', () => {
    const result = switchMcpTransport(MCP_YAML, ['spec', 'workers', 0], 'http');
    const parsed = parseYaml(result) as CaseDefinition;
    const mcp = (parsed.spec.workers![0] as Record<string, unknown>).mcp as Record<string, unknown>;
    expect(mcp.command).toBeUndefined();
    expect(mcp.env).toBeUndefined();
    expect(mcp.url).toBe('');
  });

  it('switches http to stdio', () => {
    const httpYaml = switchMcpTransport(MCP_YAML, ['spec', 'workers', 0], 'http');
    const result = switchMcpTransport(httpYaml, ['spec', 'workers', 0], 'stdio');
    const parsed = parseYaml(result) as CaseDefinition;
    const mcp = (parsed.spec.workers![0] as Record<string, unknown>).mcp as Record<string, unknown>;
    expect(mcp.url).toBeUndefined();
    expect(mcp.command).toEqual([]);
  });
});

describe('switchModelProvider', () => {
  it('switches openai to anthropic', () => {
    const result = switchModelProvider(AGENT_WORKER_YAML, ['spec', 'workers', 0], 'anthropic');
    const parsed = parseYaml(result) as CaseDefinition;
    const model = ((parsed.spec.workers![0] as Record<string, unknown>).agent as Record<string, unknown>).model as Record<string, unknown>;
    expect(model.openai).toBeUndefined();
    expect(model.anthropic).toEqual({ modelName: '' });
  });

  it('switches to ollama', () => {
    const result = switchModelProvider(AGENT_WORKER_YAML, ['spec', 'workers', 0], 'ollama');
    const parsed = parseYaml(result) as CaseDefinition;
    const model = ((parsed.spec.workers![0] as Record<string, unknown>).agent as Record<string, unknown>).model as Record<string, unknown>;
    expect(model.openai).toBeUndefined();
    expect(model.ollama).toEqual({ modelName: '' });
  });
});

describe('switchTriggerType', () => {
  it('switches from contextChange to cloudEvent', () => {
    const result = switchTriggerType(SAMPLE_YAML, ['spec', 'bindings', 0], 'cloudEvent');
    const parsed = parseYaml(result) as CaseDefinition;
    const on = (parsed.spec.bindings![0] as Record<string, unknown>).on as Record<string, unknown>;
    expect(on['contextChange']).toBeUndefined();
    expect(on['cloudEvent']).toBeDefined();
  });

  it('switches from contextChange to schedule', () => {
    const result = switchTriggerType(SAMPLE_YAML, ['spec', 'bindings', 0], 'schedule');
    const parsed = parseYaml(result) as CaseDefinition;
    const on = (parsed.spec.bindings![0] as Record<string, unknown>).on as Record<string, unknown>;
    expect(on['contextChange']).toBeUndefined();
    expect(on['schedule']).toBeDefined();
  });

  it('switches to scopeActivated', () => {
    const result = switchTriggerType(SAMPLE_YAML, ['spec', 'bindings', 0], 'scopeActivated');
    const parsed = parseYaml(result) as CaseDefinition;
    const on = (parsed.spec.bindings![0] as Record<string, unknown>).on as Record<string, unknown>;
    expect(on['contextChange']).toBeUndefined();
    expect(on['scopeActivated']).toBeDefined();
  });

  it('preserves other binding fields', () => {
    const result = switchTriggerType(SAMPLE_YAML, ['spec', 'bindings', 0], 'cloudEvent');
    expect(result).toContain('name: scan');
    expect(result).toContain("capability: ocr");
  });
});

describe('removeCaseEdge', () => {
  it('clears capability field on binding', () => {
    const result = removeCaseEdge(SAMPLE_YAML, ['spec', 'bindings', 0], 'capability');
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.bindings[0].capability).toBeUndefined();
    expect(parsed.spec.bindings[0].name).toBe('scan');
  });

  it('clears subCase field on binding', () => {
    const yamlWithSubCase = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings:
    - name: scan
      capability: ocr
      subCase:
        namespace: test
        name: sub1
  workers:
    - name: ocr-worker
      capabilities:
        - ocr
`;
    const result = removeCaseEdge(yamlWithSubCase, ['spec', 'bindings', 0], 'subCase');
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.bindings[0].subCase).toBeUndefined();
    expect(parsed.spec.bindings[0].capability).toBe('ocr');
  });
});

describe('addCaseEdge', () => {
  it('sets capability field on binding', () => {
    const yamlNoCap = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings:
    - name: scan
      when: '.doc != null'
  workers:
    - name: ocr-worker
      capabilities:
        - ocr
`;
    const result = addCaseEdge(yamlNoCap, ['spec', 'bindings', 0], 'capability', 'newCap');
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.bindings[0].capability).toBe('newCap');
  });

  it('overwrites existing capability', () => {
    const result = addCaseEdge(SAMPLE_YAML, ['spec', 'bindings', 0], 'capability', 'replacedCap');
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.bindings[0].capability).toBe('replacedCap');
  });

  it('preserves other binding fields', () => {
    const result = addCaseEdge(SAMPLE_YAML, ['spec', 'bindings', 0], 'capability', 'newCap');
    const parsed = parseYaml(result) as CaseDefinition;
    expect(parsed.spec.bindings[0].name).toBe('scan');
  });
});
