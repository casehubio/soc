import { parseDocument } from 'yaml';
import { yamlSetOrDelete } from '@casehubio/pages-lsp';
import type { Membership } from '../types.js';

export function applyOrgPropertyEdit(
  yaml: string,
  nodePath: readonly (string | number)[],
  field: (string | number)[],
  value: unknown,
): string {
  return yamlSetOrDelete(yaml, nodePath, field, value);
}

export function addOrgUnit(
  yaml: string,
  defaults?: Record<string, unknown>,
): string {
  const doc = parseDocument(yaml);
  const id = defaults?.['unitId'] ?? `unit-${Date.now()}`;
  const existingTenancy = doc.getIn(['organization', 'units', 0, 'tenancyId']) as string | undefined;
  const tenancyId = defaults?.['tenancyId'] ?? existingTenancy ?? 'default';
  const newUnit: Record<string, unknown> = {
    unitId: id,
    name: defaults?.['name'] ?? 'New Unit',
    tenancyId,
    members: [],
    capabilities: [],
    goals: [],
    constraints: [],
  };
  if (defaults?.['kind'] !== undefined) newUnit['kind'] = defaults['kind'];
  if (defaults?.['parentUnitId'] !== undefined) newUnit['parentUnitId'] = defaults['parentUnitId'];
  doc.addIn(['organization', 'units'], newUnit);
  return doc.toString();
}

export function removeOrgUnit(
  yaml: string,
  unitPath: readonly (string | number)[],
): string {
  const doc = parseDocument(yaml);
  doc.deleteIn([...unitPath]);
  return doc.toString();
}

export function addMember(
  yaml: string,
  unitPath: readonly (string | number)[],
  membership: Pick<Membership, 'agentId'> & Partial<Pick<Membership, 'role'>>,
): string {
  const doc = parseDocument(yaml);
  const entry: Record<string, unknown> = { agentId: membership.agentId };
  if (membership.role !== undefined) entry['role'] = membership.role;
  doc.addIn([...unitPath, 'members'], entry);
  return doc.toString();
}

export function removeMember(
  yaml: string,
  unitPath: readonly (string | number)[],
  memberIndex: number,
): string {
  const doc = parseDocument(yaml);
  doc.deleteIn([...unitPath, 'members', memberIndex]);
  return doc.toString();
}

export function addRelationship(
  yaml: string,
  rel: {
    sourceAgentId: string;
    targetAgentId: string;
    kind: string;
    tenancyId: string;
    extendedKind?: string;
  },
): string {
  const doc = parseDocument(yaml);
  const entry: Record<string, unknown> = {
    sourceAgentId: rel.sourceAgentId,
    targetAgentId: rel.targetAgentId,
    kind: rel.kind,
    tenancyId: rel.tenancyId,
  };
  if (rel.extendedKind !== undefined) entry['extendedKind'] = rel.extendedKind;
  doc.addIn(['organization', 'relationships'], entry);
  return doc.toString();
}

export function removeRelationship(
  yaml: string,
  relPath: readonly (string | number)[],
): string {
  const doc = parseDocument(yaml);
  doc.deleteIn([...relPath]);
  return doc.toString();
}
