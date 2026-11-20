import { describe, it, expect } from 'vitest';
import { resolveKindColors, DEFAULT_KIND_PALETTE } from './kind-colors.js';
import { toOrgGraph } from './org-adapter.js';

const YAML = `
organization:
  units:
    - unitId: oversight
      name: Oversight
      kind: supervision-hierarchy
      tenancyId: t1
      members:
        - agentId: bot
          role: lead
      capabilities: []
      goals: []
      constraints: []
    - unitId: rig1
      name: Rig One
      kind: rig
      tenancyId: t1
      members:
        - agentId: worker1
          role: worker
      capabilities: []
      goals: []
      constraints: []
  relationships: []
`;

describe('resolveKindColors', () => {
  it('applies default palette for known kinds', () => {
    const base = toOrgGraph(YAML);
    const model = resolveKindColors(base.model);
    const oversight = model.nodes.find(n => n.properties['unitId'] === 'oversight');
    expect(oversight!.properties['kindColorStart']).toBe(DEFAULT_KIND_PALETTE['supervision-hierarchy']!.start);
    expect(oversight!.properties['kindColorEnd']).toBe(DEFAULT_KIND_PALETTE['supervision-hierarchy']!.end);
  });

  it('propagates unit colors to agent nodes', () => {
    const base = toOrgGraph(YAML);
    const model = resolveKindColors(base.model);
    const worker = model.nodes.find(n => n.properties['agentId'] === 'worker1');
    expect(worker!.properties['unitKind']).toBe('rig');
    expect(worker!.properties['unitColorStart']).toBe(DEFAULT_KIND_PALETTE['rig']!.start);
    expect(worker!.properties['unitColorEnd']).toBe(DEFAULT_KIND_PALETTE['rig']!.end);
  });

  it('applies custom kindColors override', () => {
    const base = toOrgGraph(YAML);
    const custom = { rig: { start: '#ff0000', end: '#00ff00' } };
    const model = resolveKindColors(base.model, custom);
    const rig = model.nodes.find(n => n.properties['unitId'] === 'rig1');
    expect(rig!.properties['kindColorStart']).toBe('#ff0000');
    expect(rig!.properties['kindColorEnd']).toBe('#00ff00');
  });

  it('auto-assigns unknown kinds from fallback palette', () => {
    const unknownYaml = `
organization:
  units:
    - unitId: u1
      name: U1
      kind: custom-kind-xyz
      tenancyId: t1
      members: []
      capabilities: []
      goals: []
      constraints: []
  relationships: []
`;
    const base = toOrgGraph(unknownYaml);
    const model = resolveKindColors(base.model);
    const u1 = model.nodes.find(n => n.properties['unitId'] === 'u1');
    expect(u1!.properties['kindColorStart']).toBeDefined();
    expect(u1!.properties['kindColorEnd']).toBeDefined();
  });

  it('preserves original model', () => {
    const base = toOrgGraph(YAML);
    const model = resolveKindColors(base.model);
    expect(model).not.toBe(base.model);
    const origOversight = base.model.nodes.find(n => n.properties['unitId'] === 'oversight');
    expect(origOversight!.properties['kindColorStart']).toBeUndefined();
  });
});
