import { describe, it, expect } from 'vitest';
import { detectDiagramType } from './diagram-type.js';

const CASE_YAML = `dsl: "1.0.0"
namespace: test
name: my-case
spec:
  bindings:
    - name: b1
      capability: cap1
  workers:
    - name: w1
      capabilities: [cap1]
`;

const SWF_YAML = `document:
  dsl: "1.0.0"
  namespace: test
  name: my-flow
do:
  - step1:
      call: http:get
`;

const UNKNOWN_YAML = `foo: bar
baz: 42
`;

describe('detectDiagramType', () => {
  it('detects case definition', () => {
    expect(detectDiagramType(CASE_YAML)).toBe('case');
  });

  it('detects SWF workflow', () => {
    expect(detectDiagramType(SWF_YAML)).toBe('swf');
  });

  it('returns unknown for unrecognised YAML', () => {
    expect(detectDiagramType(UNKNOWN_YAML)).toBe('unknown');
  });

  it('handles empty or invalid YAML', () => {
    expect(detectDiagramType('')).toBe('unknown');
    expect(detectDiagramType('not: valid: yaml: [')).toBe('unknown');
  });

  it('detects HTN decomposition', () => {
    const HTN_YAML = `dsl: "1.0.0"
namespace: test
name: my-case
spec:
  decomposition:
    root:
      name: investigate
      methods:
        - guard: ".severity == 'high'"
          tasks:
            - name: triage
              capability: triage-assessment
`;
    expect(detectDiagramType(HTN_YAML)).toBe('htn');
  });
});
