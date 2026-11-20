import { stringify } from 'yaml';
import type { AgentRelationship, OrgUnit, Membership } from '../types.js';

export interface RosterEntry {
  agentId: string;
  name: string;
  unitId?: string;
}

export function toOrgYaml(
  roster: RosterEntry[],
  relationships: AgentRelationship[],
  tenancyId: string,
): string {
  const unitMap = new Map<string, Membership[]>();

  for (const entry of roster) {
    const uid = entry.unitId ?? 'unassigned';
    let members = unitMap.get(uid);
    if (!members) {
      members = [];
      unitMap.set(uid, members);
    }
    members.push({ agentId: entry.agentId });
  }

  const units: OrgUnit[] = Array.from(unitMap.entries()).map(([unitId, members]) => ({
    unitId,
    name: unitId === 'unassigned' ? 'Unassigned' : unitId,
    tenancyId,
    members,
    capabilities: [],
    goals: [],
    constraints: [],
  }));

  return stringify({ organization: { units, relationships } });
}
