import { describe, it, expect } from 'vitest';
import { loadScenarioDefinitions } from './definitions.js';

describe('loadScenarioDefinitions', () => {
  it('includes rest action with correct inputs', () => {
    const files = loadScenarioDefinitions();
    const allActions = Object.assign({}, ...files.map(f => f.actions));
    const rest = allActions['rest'];
    expect(rest).toBeDefined();
    expect(rest.name).toBe('rest');
    expect(rest.inputs.method).toEqual({ type: 'STRING', required: true });
    expect(rest.inputs.url).toEqual({ type: 'STRING', required: true });
    expect(rest.inputs.headers).toBeDefined();
    expect(rest.inputs.body).toBeDefined();
    expect(rest.inputs.expectedStatus).toBeDefined();
    expect(rest.invoke).toEqual({ kind: 'rest' });
    expect(rest.portability).toBe('universal');
  });

  it('includes graphql action', () => {
    const files = loadScenarioDefinitions();
    const allActions = Object.assign({}, ...files.map(f => f.actions));
    expect(allActions['graphql']).toBeDefined();
    expect(allActions['graphql'].invoke).toEqual({ kind: 'graphql-domain' });
  });

  it('includes all ARIA actions', () => {
    const files = loadScenarioDefinitions();
    const allActions = Object.assign({}, ...files.map(f => f.actions));
    expect(allActions['click']).toBeDefined();
    expect(allActions['fill']).toBeDefined();
    expect(allActions['navigate']).toBeDefined();
    expect(allActions['spotlight']).toBeDefined();
  });
});
