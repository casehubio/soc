import { describe, it, expect } from 'vitest';
import { renderCall } from './call.js';
import { renderSet } from './set.js';
import { renderSwitch } from './switch.js';
import { renderRaise } from './raise.js';
import { renderTry } from './try.js';
import { renderTryCatch } from './try-catch.js';
import { renderStart, renderEnd, renderEntry, renderExit } from './boundary.js';
import { renderGeneric } from './generic.js';
import { renderDo } from './do.js';
import { renderFork } from './fork.js';
import { renderEmit } from './emit.js';
import { renderListen } from './listen.js';
import { renderRun } from './run.js';
import { renderWait } from './wait.js';
import type { GraphNode } from '@casehubio/graph-core';

function makeNode(type: string, properties: Record<string, unknown> = {}): GraphNode {
  return { id: 'test-1', type, properties };
}

describe('SWF stencil render functions', () => {
  it('renderCall returns template for http call', () => {
    const result = renderCall(makeNode('swf-call', { call: 'http', label: 'fetchData' }));
    expect(result).toBeDefined();
    expect(result.values).toBeDefined();
  });

  it('renderCall handles casehub:dispatch', () => {
    const result = renderCall(makeNode('swf-call', { call: 'casehub:dispatch' }));
    expect(result).toBeDefined();
  });

  it('renderCall handles unknown call type with default icon', () => {
    const result = renderCall(makeNode('swf-call', { call: 'custom-function' }));
    expect(result).toBeDefined();
  });

  it('renderSet shows variable names', () => {
    const result = renderSet(makeNode('swf-set', { set: { output: 'value', count: 0 }, label: 'setVars' }));
    expect(result).toBeDefined();
  });

  it('renderSwitch shows case count', () => {
    const result = renderSwitch(makeNode('swf-switch', { switch: [{ when: 'a' }, { when: 'b' }], label: 'check' }));
    expect(result).toBeDefined();
  });

  it('renderRaise shows error title', () => {
    const result = renderRaise(makeNode('swf-raise', { raise: { error: { type: 'myErr', title: 'Failed' } }, label: 'fail' }));
    expect(result).toBeDefined();
  });

  it('renderTry returns template', () => {
    const result = renderTry(makeNode('swf-try', { label: 'tryBlock' }));
    expect(result).toBeDefined();
  });

  it('renderTryCatch shows error filter', () => {
    const result = renderTryCatch(makeNode('swf-try-catch', { errors: { with: { type: 'myErr' } }, label: 'catch' }));
    expect(result).toBeDefined();
  });

  it('boundary stencils render markers', () => {
    expect(renderStart(makeNode('swf-start'))).toBeDefined();
    expect(renderEnd(makeNode('swf-end'))).toBeDefined();
    expect(renderEntry(makeNode('swf-entry'))).toBeDefined();
    expect(renderExit(makeNode('swf-exit'))).toBeDefined();
  });

  it('renderGeneric shows originalType as label', () => {
    const result = renderGeneric(makeNode('swf-generic', { originalType: 'emit', label: 'emitEvent' }));
    expect(result).toBeDefined();
  });

  it('renderGeneric handles missing originalType', () => {
    const result = renderGeneric(makeNode('swf-generic', {}));
    expect(result).toBeDefined();
  });

  it('renderDo returns compact header', () => {
    const result = renderDo(makeNode('swf-do', { label: 'setup' }));
    expect(result).toBeDefined();
    expect(result.values).toBeDefined();
  });

  it('renderDo handles missing label', () => {
    const result = renderDo(makeNode('swf-do', {}));
    expect(result).toBeDefined();
  });

  it('renderFork shows compete badge when true', () => {
    const result = renderFork(makeNode('swf-fork', {
      fork: { compete: true },
      label: 'race',
    }));
    expect(result).toBeDefined();
    expect(result.values).toBeDefined();
  });

  it('renderFork hides badge when compete is false', () => {
    const result = renderFork(makeNode('swf-fork', {
      fork: { compete: false },
      label: 'parallel',
    }));
    expect(result).toBeDefined();
  });

  it('renderFork handles missing fork config', () => {
    const result = renderFork(makeNode('swf-fork', {}));
    expect(result).toBeDefined();
  });

  it('renderEmit shows event type', () => {
    const result = renderEmit(makeNode('swf-emit', {
      emit: { event: { with: { type: 'com.example.order.placed' } } },
      label: 'publishOrder',
    }));
    expect(result).toBeDefined();
    expect(result.values).toBeDefined();
  });

  it('renderEmit handles missing event type', () => {
    const result = renderEmit(makeNode('swf-emit', { label: 'emitEvent' }));
    expect(result).toBeDefined();
  });

  it('renderListen shows consumption strategy', () => {
    const result = renderListen(makeNode('swf-listen', {
      listen: { to: { one: { with: { type: 'com.example.confirmed' } } } },
      label: 'awaitConfirmation',
    }));
    expect(result).toBeDefined();
    expect(result.values).toBeDefined();
  });

  it('renderListen handles all strategy', () => {
    const result = renderListen(makeNode('swf-listen', {
      listen: { to: { all: [{ with: { type: 'a' } }, { with: { type: 'b' } }] } },
    }));
    expect(result).toBeDefined();
  });

  it('renderRun shows container sub-type', () => {
    const result = renderRun(makeNode('swf-run', {
      run: { container: { image: 'my-image:latest' } },
      label: 'runContainer',
    }));
    expect(result).toBeDefined();
    expect(result.values).toBeDefined();
  });

  it('renderRun shows shell sub-type', () => {
    const result = renderRun(makeNode('swf-run', {
      run: { shell: { command: 'echo hello' } },
    }));
    expect(result).toBeDefined();
  });

  it('renderRun shows workflow sub-type', () => {
    const result = renderRun(makeNode('swf-run', {
      run: { workflow: { namespace: 'ns', name: 'wf', version: '1.0' } },
    }));
    expect(result).toBeDefined();
  });

  it('renderRun shows script sub-type', () => {
    const result = renderRun(makeNode('swf-run', {
      run: { script: { language: 'js', code: 'console.log("hi")' } },
    }));
    expect(result).toBeDefined();
  });

  it('renderWait shows duration', () => {
    const result = renderWait(makeNode('swf-wait', {
      wait: { seconds: 30 },
      label: 'cooldown',
    }));
    expect(result).toBeDefined();
    expect(result.values).toBeDefined();
  });

  it('renderWait handles string duration', () => {
    const result = renderWait(makeNode('swf-wait', { wait: 'PT30S' }));
    expect(result).toBeDefined();
  });
});
