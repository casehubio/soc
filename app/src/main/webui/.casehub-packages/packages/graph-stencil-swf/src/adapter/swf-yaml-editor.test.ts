import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { applySwfPropertyEdit, addSwfTask, removeSwfTask, insertSwfTask, spliceSwfTask, moveSwfTask } from './swf-yaml-editor.js';

const SAMPLE_YAML = `document:
  dsl: "1.0.0"
  namespace: test
  name: sample
  version: "1.0.0"
do:
  - fetchData:
      call: http
      with:
        method: GET
`;

describe('applySwfPropertyEdit', () => {
  it('updates a property value', () => {
    const result = applySwfPropertyEdit(SAMPLE_YAML, ['do', 0, 'fetchData'], ['with', 'method'], 'POST');
    expect(result).toContain('method: POST');
  });
});

describe('addSwfTask', () => {
  it('appends a call task to the do block', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-call');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    expect(parsed.do).toHaveLength(2);
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newCall/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['call']).toBeDefined();
  });

  it('appends a set task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-set');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newSet/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['set']).toBeDefined();
  });

  it('appends a switch task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-switch');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newSwitch/);
  });

  it('appends a raise task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-raise');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newRaise/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['raise']).toBeDefined();
  });

  it('appends a try task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-try');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newTry/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['try']).toBeDefined();
    expect(taskDef['catch']).toBeDefined();
  });

  it('appends an emit task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-emit');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newEmit/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['emit']).toBeDefined();
  });

  it('appends a listen task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-listen');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newListen/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['listen']).toBeDefined();
  });

  it('appends a run task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-run');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newRun/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['run']).toBeDefined();
  });

  it('appends a wait task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-wait');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newWait/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['wait']).toBeDefined();
  });

  it('appends a for task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-for');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newFor/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['for']).toBeDefined();
    expect(taskDef['do']).toBeDefined();
  });

  it('appends a do task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-do');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newDo/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['do']).toBeDefined();
  });

  it('appends a fork task', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-fork');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toMatch(/^newFork/);
    const taskDef = (newStep as Record<string, Record<string, unknown>>)[stepName]!;
    expect(taskDef['fork']).toBeDefined();
  });

  it('generates unique step names when name already exists', () => {
    const yamlWithCall = `document:
  dsl: "1.0.0"
  namespace: test
  name: sample
  version: "1.0.0"
do:
  - newCall1:
      call: http
      with:
        method: GET
`;
    const result = addSwfTask(yamlWithCall, 'swf-call');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const newStep = parsed.do[1]!;
    const stepName = Object.keys(newStep)[0]!;
    expect(stepName).toBe('newCall2');
  });

  it('preserves existing YAML content', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-call');
    expect(result).toContain('fetchData:');
    expect(result).toContain('method: GET');
  });

  it('adds then: exit to the previous last task so new task is disconnected', () => {
    const result = addSwfTask(SAMPLE_YAML, 'swf-call');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const fetchData = parsed.do[0]!;
    const fetchDef = Object.values(fetchData)[0] as Record<string, unknown>;
    expect(fetchDef['then']).toBe('exit');
  });

  it('does not add then: exit if the last task already has an explicit then', () => {
    const yamlWithThen = `document:
  dsl: "1.0.0"
  namespace: test
  name: sample
  version: "1.0.0"
do:
  - fetchData:
      call: http
      with:
        method: GET
      then: someTarget
`;
    const result = addSwfTask(yamlWithThen, 'swf-set');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const fetchData = parsed.do[0]!;
    const fetchDef = Object.values(fetchData)[0] as Record<string, unknown>;
    expect(fetchDef['then']).toBe('someTarget');
  });
});

const MULTI_STEP_YAML = `document:
  dsl: "1.0.0"
  namespace: test
  name: sample
  version: "1.0.0"
do:
  - step1:
      call: http:get
      with:
        endpoint: /api/one
  - step2:
      call: http:post
      with:
        endpoint: /api/two
  - step3:
      set:
        result: done
`;

describe('removeSwfTask', () => {
  it('removes a named task from the do block', () => {
    const result = removeSwfTask(MULTI_STEP_YAML, 'step2');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    expect(parsed.do).toHaveLength(2);
    expect(result).not.toContain('step2');
    expect(result).toContain('step1');
    expect(result).toContain('step3');
  });

  it('throws when task not found', () => {
    expect(() => removeSwfTask(MULTI_STEP_YAML, 'missing')).toThrow(/not found/i);
  });

  it('preserves other tasks when removing first', () => {
    const result = removeSwfTask(MULTI_STEP_YAML, 'step1');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    expect(parsed.do).toHaveLength(2);
    expect(result).toContain('step2');
    expect(result).toContain('step3');
  });

  it('preserves other tasks when removing last', () => {
    const result = removeSwfTask(MULTI_STEP_YAML, 'step3');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    expect(parsed.do).toHaveLength(2);
    expect(result).toContain('step1');
    expect(result).toContain('step2');
  });
});

describe('insertSwfTask', () => {
  it('inserts a task before the named task', () => {
    const result = insertSwfTask(MULTI_STEP_YAML, 'swf-set', 'step2');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    expect(parsed.do).toHaveLength(4);
    const names = parsed.do.map(entry => Object.keys(entry)[0]);
    const newIdx = names.findIndex(n => n!.startsWith('newSet'));
    const step2Idx = names.indexOf('step2');
    expect(newIdx).toBeLessThan(step2Idx);
    expect(newIdx).toBe(1);
  });

  it('inserts before the first task', () => {
    const result = insertSwfTask(MULTI_STEP_YAML, 'swf-call', 'step1');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    expect(parsed.do).toHaveLength(4);
    const names = parsed.do.map(entry => Object.keys(entry)[0]);
    expect(names[0]).toMatch(/^newCall/);
    expect(names[1]).toBe('step1');
  });

  it('appends when beforeTaskName is null', () => {
    const result = insertSwfTask(MULTI_STEP_YAML, 'swf-call', null);
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    expect(parsed.do).toHaveLength(4);
    const names = parsed.do.map(entry => Object.keys(entry)[0]);
    expect(names[3]).toMatch(/^newCall/);
  });

  it('preserves existing YAML content', () => {
    const result = insertSwfTask(MULTI_STEP_YAML, 'swf-emit', 'step3');
    expect(result).toContain('step1');
    expect(result).toContain('step2');
    expect(result).toContain('step3');
    expect(result).toContain('newEmit');
  });
});

const SWITCH_YAML = `document:
  dsl: "1.0.0"
  namespace: test
  name: switch-flow
  version: "1.0.0"
do:
  - check:
      switch:
        - low:
            when: '.x < 10'
            then: handleLow
        - high:
            when: '.x >= 10'
            then: handleHigh
  - handleLow:
      set:
        result: low
      then: finish
  - handleHigh:
      call: http:get
      with:
        method: get
        endpoint:
          uri: https://example.com/high
      then: finish
  - finish:
      set:
        done: true
`;

describe('spliceSwfTask', () => {
  it('rewires switch-case then reference when splicing onto that edge', () => {
    const result = spliceSwfTask(SWITCH_YAML, 'swf-call', 'check', 'handleHigh');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const names = parsed.do.map(entry => Object.keys(entry)[0]);
    expect(names).toContain('newCall1');

    const checkTask = parsed.do.find(e => Object.keys(e)[0] === 'check')!;
    const switchCases = (Object.values(checkTask)[0] as any).switch as any[];
    const highCase = switchCases.find((c: any) => Object.keys(c)[0] === 'high');
    expect((Object.values(highCase!)[0] as any).then).toBe('newCall1');

    const newTask = parsed.do.find(e => Object.keys(e)[0] === 'newCall1')!;
    const newTaskDef = Object.values(newTask)[0] as any;
    expect(newTaskDef.then).toBe('handleHigh');
  });

  it('rewires direct then reference when splicing onto that edge', () => {
    const result = spliceSwfTask(SWITCH_YAML, 'swf-set', 'handleLow', 'finish');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };

    const handleLow = parsed.do.find(e => Object.keys(e)[0] === 'handleLow')!;
    expect((Object.values(handleLow)[0] as any).then).toBe('newSet1');

    const newTask = parsed.do.find(e => Object.keys(e)[0] === 'newSet1')!;
    expect((Object.values(newTask)[0] as any).then).toBe('finish');
  });

  it('falls back to positional insert when no then reference exists', () => {
    const result = spliceSwfTask(MULTI_STEP_YAML, 'swf-call', 'step1', 'step2');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const names = parsed.do.map(entry => Object.keys(entry)[0]);
    const newIdx = names.findIndex(n => n!.startsWith('newCall'));
    const step2Idx = names.indexOf('step2');
    expect(newIdx).toBeLessThan(step2Idx);
    expect(newIdx).toBe(1);
  });
});

const CHAIN_YAML = `document:
  dsl: "1.0.0"
  namespace: test
  name: chain-flow
  version: "1.0.0"
do:
  - routeByRisk:
      switch:
        - lowRisk:
            when: '.risk < 5'
            then: autoApprove
        - highRisk:
            when: '.risk >= 5'
            then: newCall1
  - newCall1:
      call: http:get
      then: newCall2
  - newCall2:
      call: http:post
      then: humanReview
  - humanReview:
      call: http:get
  - autoApprove:
      set:
        approved: true
`;

describe('moveSwfTask', () => {
  it('rewires all then: references when moving a task (not just edge source)', () => {
    const result = moveSwfTask(CHAIN_YAML, 'newCall1', 'humanReview', 'newCall2');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const names = parsed.do.map(entry => Object.keys(entry)[0]);
    expect(names.indexOf('newCall2')).toBeLessThan(names.indexOf('newCall1'));
    expect(names.indexOf('newCall1')).toBeLessThan(names.indexOf('humanReview'));

    const route = parsed.do.find(e => Object.keys(e)[0] === 'routeByRisk')!;
    const switchCases = (Object.values(route)[0] as any).switch as any[];
    const highCase = switchCases.find((c: any) => Object.keys(c)[0] === 'highRisk');
    expect((Object.values(highCase!)[0] as any).then).toBe('newCall2');

    const call2 = parsed.do.find(e => Object.keys(e)[0] === 'newCall2')!;
    expect((Object.values(call2)[0] as any).then).toBe('newCall1');

    const call1 = parsed.do.find(e => Object.keys(e)[0] === 'newCall1')!;
    expect((Object.values(call1)[0] as any).then).toBe('humanReview');
  });

  it('rewires direct then: references at removal site', () => {
    const result = moveSwfTask(SWITCH_YAML, 'handleLow', 'finish', 'handleHigh');
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };

    const check = parsed.do.find(e => Object.keys(e)[0] === 'check')!;
    const switchCases = (Object.values(check)[0] as any).switch as any[];
    const lowCase = switchCases.find((c: any) => Object.keys(c)[0] === 'low');
    expect((Object.values(lowCase!)[0] as any).then).toBe('finish');
  });

  it('moves a task to the end when beforeTaskName is null', () => {
    const result = moveSwfTask(MULTI_STEP_YAML, 'step1', null);
    const parsed = parseYaml(result) as { do: Record<string, unknown>[] };
    const names = parsed.do.map(entry => Object.keys(entry)[0]);
    expect(names[names.length - 1]).toBe('step1');
  });

  it('throws when task not found', () => {
    expect(() => moveSwfTask(MULTI_STEP_YAML, 'missing', null)).toThrow(/not found/i);
  });
});
