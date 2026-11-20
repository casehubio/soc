export const FALLBACK_RELATIONSHIP = {
    color: 'var(--pages-neutral-9, #737373)', style: 'dotted', directed: true,
};
const REGISTRY = new Map([
    ['parent_child', { color: 'var(--pages-neutral-9, #737373)', style: 'solid', directed: true, label: 'Parent/Child' }],
    ['supersedes', { color: '#f59e0b', style: 'solid', directed: true, label: 'Supersedes' }],
    ['coordination', { color: 'var(--pages-accent-9, #0066cc)', style: 'dashed', directed: true, label: 'Coordination' }],
]);
export function registerRelationshipType(type, descriptor) {
    REGISTRY.set(type, descriptor);
}
export function lookupRelationshipType(type) {
    return REGISTRY.get(type) ?? FALLBACK_RELATIONSHIP;
}
//# sourceMappingURL=relationship.js.map