export interface InsertionConstraint {
    readonly structuralTypes: readonly string[];
    readonly componentTypes: readonly string[];
}
export declare function allowedTypesAt(parentNodeType: string): InsertionConstraint;
export declare function allowedTypesForSiblingOf(nodeType: string): InsertionConstraint;
export declare function isAllowedChild(parentNodeType: string, childType: string): boolean;
//# sourceMappingURL=insertion-constraints.d.ts.map