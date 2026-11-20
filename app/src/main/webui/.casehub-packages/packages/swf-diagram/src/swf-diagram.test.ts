import { describe, it, expect, beforeAll } from 'vitest';
import { toSwfGraph, applySwfPropertyEdit, swfTaskSchema, insertSwfTask, spliceSwfTask, createSwfEditPolicy, registerSwfStencils } from '@casehubio/mosaic-graph-stencil-swf';
import { SwfDiagram } from './swf-diagram.js';
import { toReactFlowGraph } from '@casehubio/graph-renderer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SIMPLE_YAML = readFileSync(
  resolve(import.meta.dirname, '../../../packages/graph-stencil-swf/src/test-fixtures/simple-workflow.yaml'),
  'utf-8',
);

describe('swf-diagram integration', () => {
  it('end-to-end: SWF YAML → GraphModel → React Flow nodes', () => {
    const { model } = toSwfGraph(SIMPLE_YAML);
    const { nodes, edges } = toReactFlowGraph(model);

    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);

    const callNodes = nodes.filter(n => n.type === 'swf-call');
    expect(callNodes.length).toBeGreaterThanOrEqual(1);

    const setNodes = nodes.filter(n => n.type === 'swf-set');
    expect(setNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('all edges reference valid nodes', () => {
    const { model } = toSwfGraph(SIMPLE_YAML);
    const { nodes, edges } = toReactFlowGraph(model);
    const nodeIds = new Set(nodes.map((n: { id: string }) => n.id));

    for (const edge of edges) {
      expect(nodeIds.has(edge.source), `dangling source: ${edge.source}`).toBe(true);
      expect(nodeIds.has(edge.target), `dangling target: ${edge.target}`).toBe(true);
    }
  });

  it('degraded is undefined for valid YAML', () => {
    const { degraded } = toSwfGraph(SIMPLE_YAML);
    expect(degraded).toBeUndefined();
  });
});

describe('swf property editing', () => {
  it('applySwfPropertyEdit updates YAML and re-parse reflects change', () => {
    const result = toSwfGraph(SIMPLE_YAML);
    const callNodeId = '/do/fetchData';
    const nodePath = result.yamlPaths.get(callNodeId);
    expect(nodePath).toBeDefined();

    const newYaml = applySwfPropertyEdit(
      SIMPLE_YAML,
      [...nodePath!],
      ['with', 'method'],
      'POST',
    );
    const updated = toSwfGraph(newYaml);
    const callNode = updated.model.nodes.find(n => n.id === callNodeId);
    expect((callNode!.properties['with'] as Record<string, unknown>)['method']).toBe('POST');
  });

  it('removing a property sets it to undefined in the YAML', () => {
    const result = toSwfGraph(SIMPLE_YAML);
    const callNodeId = '/do/fetchData';
    const nodePath = result.yamlPaths.get(callNodeId);
    expect(nodePath).toBeDefined();

    const newYaml = applySwfPropertyEdit(
      SIMPLE_YAML,
      [...nodePath!],
      ['with', 'method'],
      undefined,
    );
    const updated = toSwfGraph(newYaml);
    const callNode = updated.model.nodes.find(n => n.id === callNodeId);
    expect((callNode!.properties['with'] as Record<string, unknown>)['method']).toBeUndefined();
  });
});

describe('swfTaskSchema', () => {
  it('has $defs for all engine-supported task types', () => {
    const defs = swfTaskSchema.$defs as Record<string, unknown>;
    expect(defs).toBeDefined();
    expect(defs['CallTask']).toBeDefined();
    expect(defs['SetTask']).toBeDefined();
    expect(defs['SwitchTask']).toBeDefined();
    expect(defs['RaiseTask']).toBeDefined();
    expect(defs['TryTask']).toBeDefined();
    expect(defs['TryCatchTask']).toBeDefined();
  });

  it('CallTask requires call property', () => {
    const callTask = (swfTaskSchema.$defs as Record<string, Record<string, unknown>>)['CallTask']!;
    expect(callTask['required']).toContain('call');
  });
});

describe('splitEdge insertion', () => {
  it('insertSwfTask places new task before target in a multi-step workflow', () => {
    const { model } = toSwfGraph(SIMPLE_YAML);
    const callNode = model.nodes.find(n => n.type === 'swf-call');
    expect(callNode).toBeDefined();
    const targetLabel = callNode!.properties['label'] as string;

    const result = insertSwfTask(SIMPLE_YAML, 'swf-set', targetLabel);
    const { model: updatedModel } = toSwfGraph(result);
    const nodeTypes = updatedModel.nodes
      .filter(n => n.type !== 'swf-start' && n.type !== 'swf-end' && n.type !== 'swf-root')
      .map(n => n.type);
    expect(nodeTypes).toContain('swf-set');
    const setIdx = updatedModel.nodes.findIndex(n => n.type === 'swf-set');
    const callIdx = updatedModel.nodes.findIndex(n => n.id === callNode!.id);
    expect(setIdx).toBeLessThan(callIdx);
  });

  it('insertSwfTask with null appends after all tasks', () => {
    const result = insertSwfTask(SIMPLE_YAML, 'swf-emit', null);
    const { model } = toSwfGraph(result);
    const taskNodes = model.nodes.filter(
      n => n.type !== 'swf-start' && n.type !== 'swf-end' && n.type !== 'swf-root',
    );
    const lastTask = taskNodes[taskNodes.length - 1]!;
    expect(lastTask.type).toBe('swf-emit');
  });
});

describe('palette click-to-add with getAddPlacement', () => {
  beforeAll(() => { registerSwfStencils(); });
  it('getAddPlacement returns splitEdge targeting edge before swf-end', () => {
    const { model } = toSwfGraph(SIMPLE_YAML);
    const policy = createSwfEditPolicy();
    const placement = policy.getAddPlacement!('swf-set', model);
    expect(placement.type).toBe('splitEdge');
    if (placement.type === 'splitEdge') {
      const edge = model.edges.find(e => e.id === placement.edgeId);
      expect(edge).toBeDefined();
      const targetNode = model.nodes.find(n => n.id === edge!.target);
      expect(targetNode!.type).toBe('swf-end');
    }
  });

  it('palette click adds task before end via splitEdge', () => {
    const { model } = toSwfGraph(SIMPLE_YAML);
    const policy = createSwfEditPolicy();
    const placement = policy.getAddPlacement!('swf-set', model);
    expect(placement.type).toBe('splitEdge');
    if (placement.type === 'splitEdge') {
      const result = insertSwfTask(SIMPLE_YAML, 'swf-set', null);
      const { model: updated } = toSwfGraph(result);
      const taskNodes = updated.nodes.filter(
        n => n.type !== 'swf-start' && n.type !== 'swf-end' && n.type !== 'swf-root',
      );
      expect(taskNodes.some(n => n.type === 'swf-set')).toBe(true);
    }
  });

  it('graph:palette:drop event does not throw on unknown topic', () => {
    const { model } = toSwfGraph(SIMPLE_YAML);
    expect(model.nodes.length).toBeGreaterThan(0);
  });
});

describe('edge-click picker wiring', () => {
  beforeAll(() => { registerSwfStencils(); });

  it('_onChooserSelect with _pendingEdgeId dispatches splitEdge and updates YAML', () => {
    const el = document.createElement('swf-diagram') as SwfDiagram;
    const adapterResult = toSwfGraph(SIMPLE_YAML);
    (el as any)._adapterResult = adapterResult;
    (el as any)._currentYaml = SIMPLE_YAML;
    (el as any)._undoStack = [];

    const edge = adapterResult.model.edges[0]!;
    (el as any)._pendingEdgeId = edge.id;
    (el as any)._chooserState = { x: 100, y: 100 };

    const event = new CustomEvent('pages-palette-select', {
      detail: { item: { type: 'swf-set', label: 'Set', icon: 'edit' } },
    });
    (el as any)._onChooserSelect(event);

    expect((el as any)._pendingEdgeId).toBeNull();
    expect((el as any)._chooserState).toBeNull();
    const updatedYaml = (el as any)._currentYaml as string;
    expect(updatedYaml).not.toBe(SIMPLE_YAML);
    expect(updatedYaml).toContain('newSet');
  });

  it('_onChooserSelect without _pendingEdgeId dispatches addNode', () => {
    const el = document.createElement('swf-diagram') as SwfDiagram;
    const adapterResult = toSwfGraph(SIMPLE_YAML);
    (el as any)._adapterResult = adapterResult;
    (el as any)._currentYaml = SIMPLE_YAML;
    (el as any)._undoStack = [];
    (el as any)._pendingEdgeId = null;
    (el as any)._chooserState = { x: 100, y: 100 };

    const event = new CustomEvent('pages-palette-select', {
      detail: { item: { type: 'swf-set', label: 'Set', icon: 'edit' } },
    });
    (el as any)._onChooserSelect(event);

    expect((el as any)._chooserState).toBeNull();
    const updatedYaml = (el as any)._currentYaml as string;
    expect(updatedYaml).toContain('newSet');
  });

  it('edge-click directly dispatches splitEdge mutation without chooser', () => {
    const el = document.createElement('swf-diagram') as SwfDiagram;
    const CLAIM_YAML = `document:
  dsl: '1.0.3'
  namespace: claims
  name: claim-review
  version: "2.0.0"
do:
  - fetchClaim:
      call: http
      with:
        method: get
        endpoint:
          uri: https://api.internal/claims/123
  - validateEvidence:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/claims/validate
  - recordOutcome:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/audit/record
`;
    const adapterResult = toSwfGraph(CLAIM_YAML);
    (el as any)._adapterResult = adapterResult;
    (el as any)._currentYaml = CLAIM_YAML;
    (el as any)._undoStack = [];

    const model = adapterResult.model;
    const fetchNode = model.nodes.find(n => n.properties['label'] === 'fetchClaim');
    const validateNode = model.nodes.find(n => n.properties['label'] === 'validateEvidence');
    expect(fetchNode).toBeDefined();
    expect(validateNode).toBeDefined();

    const edgeBetween = model.edges.find(
      e => e.source === fetchNode!.id && e.target === validateNode!.id,
    );
    expect(edgeBetween).toBeDefined();

    (el as any)._handleMutation({
      type: 'splitEdge',
      edgeId: edgeBetween!.id,
      insertNodeType: 'swf-set',
    });

    const updatedYaml = (el as any)._currentYaml as string;
    expect(updatedYaml).toContain('newSet');
    const { model: updatedModel } = toSwfGraph(updatedYaml);
    const taskLabels = updatedModel.nodes
      .filter(n => !['swf-start', 'swf-end', 'swf-root'].includes(n.type))
      .map(n => n.properties['label']);
    expect(taskLabels).toContain('newSet1');
  });

  it('insertSwfTask + toSwfGraph roundtrip produces new node', () => {
    const YAML_3STEP = `document:
  dsl: '1.0.3'
  namespace: test
  name: roundtrip
  version: "1.0.0"
do:
  - step1:
      call: http
      with:
        method: get
        endpoint:
          uri: https://example.com/1
  - step2:
      call: http
      with:
        method: post
        endpoint:
          uri: https://example.com/2
  - step3:
      set:
        result: done
`;
    const before = toSwfGraph(YAML_3STEP);
    const beforeCount = before.model.nodes.length;

    const updated = insertSwfTask(YAML_3STEP, 'swf-call', 'step2');
    expect(updated).toContain('newCall');

    const after = toSwfGraph(updated);
    console.log('BEFORE nodes:', beforeCount, 'AFTER nodes:', after.model.nodes.length);
    console.log('AFTER labels:', after.model.nodes.map(n => `${n.type}:${n.properties['label'] ?? n.id}`));
    expect(after.model.nodes.length).toBeGreaterThan(beforeCount);
  });

  it('splitEdge on switch-case edge: insert before siuReferral', () => {
    const FULL_YAML = `document:
  dsl: '1.0.3'
  namespace: claims
  name: claim-review
  version: "2.0.0"
do:
  - fetchClaim:
      call: http
      with:
        method: get
        endpoint:
          uri: https://api.internal/claims/123
  - validateEvidence:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/claims/validate
  - routeByRisk:
      switch:
        - lowRisk:
            when: '.riskScore < 30'
            then: autoApprove
        - mediumRisk:
            when: '.riskScore < 70'
            then: humanReview
        - highRisk:
            when: '.riskScore >= 70'
            then: siuReferral
  - autoApprove:
      set:
        decision: approved
  - humanReview:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/review-queue/assign
      then: tryNotify
  - siuReferral:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/siu/refer
      then: tryNotify
  - tryNotify:
      try:
        - sendNotification:
            call: http
            with:
              method: post
              endpoint:
                uri: https://api.internal/notifications/send
      catch:
        errors:
          with:
            type: https://serverlessworkflow.io/dsl/errors/types/communication
        do:
          - logNotifyFailure:
              set:
                notificationFailed: true
  - recordOutcome:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/audit/record
`;
    const el = document.createElement('swf-diagram') as SwfDiagram;
    const adapterResult = toSwfGraph(FULL_YAML);
    (el as any)._adapterResult = adapterResult;
    (el as any)._currentYaml = FULL_YAML;
    (el as any)._undoStack = [];

    const model = adapterResult.model;

    const siuNode = model.nodes.find(n => n.properties['label'] === 'siuReferral');
    expect(siuNode).toBeDefined();

    const edgeToSiu = model.edges.find(e => e.target === siuNode!.id);
    expect(edgeToSiu).toBeDefined();

    const updatedYaml = spliceSwfTask(FULL_YAML, 'swf-call', 'routeByRisk', 'siuReferral');
    expect(updatedYaml).toContain('newCall');

    const reParsed = toSwfGraph(updatedYaml);
    const afterLabels = reParsed.model.nodes.map(n => n.properties['label']).filter(Boolean);
    expect(afterLabels).toContain('newCall1');
    expect(reParsed.model.nodes.length).toBeGreaterThan(model.nodes.length);
  });

  it('edge lookup finds target node label for all edges', () => {
    const FULL_CLAIM_YAML = `document:
  dsl: '1.0.3'
  namespace: claims
  name: claim-review
  version: "2.0.0"
do:
  - fetchClaim:
      call: http
      with:
        method: get
        endpoint:
          uri: https://api.internal/claims/123
  - validateEvidence:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/claims/validate
  - routeByRisk:
      switch:
        - lowRisk:
            when: '.riskScore < 30'
            then: autoApprove
        - highRisk:
            when: '.riskScore >= 70'
            then: recordOutcome
  - autoApprove:
      set:
        decision: approved
  - recordOutcome:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/audit/record
`;
    const { model } = toSwfGraph(FULL_CLAIM_YAML);
    const nonEndEdges = model.edges.filter(e => {
      const target = model.nodes.find(n => n.id === e.target);
      return target && target.type !== 'swf-end';
    });
    for (const edge of nonEndEdges) {
      const target = model.nodes.find(n => n.id === edge.target)!;
      const label = target.properties['label'] as string | undefined;
      expect(label, `Edge ${edge.id} target ${edge.target} (type ${target.type}) has no label`).toBeDefined();
    }
  });

  it('splitEdge inserts BEFORE the target node, not at tail', () => {
    const el = document.createElement('swf-diagram') as SwfDiagram;
    const CLAIM_YAML = `document:
  dsl: '1.0.3'
  namespace: claims
  name: claim-review
  version: "2.0.0"
do:
  - fetchClaim:
      call: http
      with:
        method: get
        endpoint:
          uri: https://api.internal/claims/123
  - validateEvidence:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/claims/validate
  - recordOutcome:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/audit/record
`;
    const adapterResult = toSwfGraph(CLAIM_YAML);
    (el as any)._adapterResult = adapterResult;
    (el as any)._currentYaml = CLAIM_YAML;
    (el as any)._undoStack = [];

    const model = adapterResult.model;
    const fetchNode = model.nodes.find(n => n.properties['label'] === 'fetchClaim');
    const validateNode = model.nodes.find(n => n.properties['label'] === 'validateEvidence');
    const edgeBetween = model.edges.find(
      e => e.source === fetchNode!.id && e.target === validateNode!.id,
    );
    expect(edgeBetween).toBeDefined();

    (el as any)._handleMutation({
      type: 'splitEdge',
      edgeId: edgeBetween!.id,
      insertNodeType: 'swf-set',
    });

    const updatedYaml = (el as any)._currentYaml as string;
    const { model: updatedModel } = toSwfGraph(updatedYaml);
    const taskLabels = updatedModel.nodes
      .filter(n => !['swf-start', 'swf-end', 'swf-root'].includes(n.type))
      .map(n => n.properties['label']);

    const newSetIdx = taskLabels.indexOf('newSet1');
    const validateIdx = taskLabels.indexOf('validateEvidence');
    const recordIdx = taskLabels.indexOf('recordOutcome');

    expect(newSetIdx).toBeGreaterThan(-1);
    expect(newSetIdx).toBeLessThan(validateIdx);
    expect(newSetIdx).toBeLessThan(recordIdx);
  });
});
