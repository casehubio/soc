export interface RelationshipTypeDescriptor {
    readonly color: string;
    readonly style: 'solid' | 'dashed' | 'dotted';
    readonly directed: boolean;
    readonly label?: string;
}
export declare const FALLBACK_RELATIONSHIP: RelationshipTypeDescriptor;
export declare function registerRelationshipType(type: string, descriptor: RelationshipTypeDescriptor): void;
export declare function lookupRelationshipType(type: string): RelationshipTypeDescriptor;
//# sourceMappingURL=relationship.d.ts.map