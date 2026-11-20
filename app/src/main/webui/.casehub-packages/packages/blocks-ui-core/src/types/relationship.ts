export interface RelationshipTypeDescriptor {
  readonly color: string;
  readonly style: 'solid' | 'dashed' | 'dotted';
  readonly directed: boolean;
  readonly label?: string;
}

export const FALLBACK_RELATIONSHIP: RelationshipTypeDescriptor = {
  color: 'var(--pages-neutral-9, #737373)', style: 'dotted', directed: true,
};

const REGISTRY = new Map<string, RelationshipTypeDescriptor>([
  ['parent_child', { color: 'var(--pages-neutral-9, #737373)', style: 'solid', directed: true, label: 'Parent/Child' }],
  ['supersedes',   { color: '#f59e0b', style: 'solid', directed: true, label: 'Supersedes' }],
  ['coordination', { color: 'var(--pages-accent-9, #0066cc)', style: 'dashed', directed: true, label: 'Coordination' }],
]);

export function registerRelationshipType(type: string, descriptor: RelationshipTypeDescriptor): void {
  REGISTRY.set(type, descriptor);
}

export function lookupRelationshipType(type: string): RelationshipTypeDescriptor {
  return REGISTRY.get(type) ?? FALLBACK_RELATIONSHIP;
}
