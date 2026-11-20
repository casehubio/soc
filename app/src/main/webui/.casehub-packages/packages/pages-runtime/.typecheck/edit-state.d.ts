export type EditState = Map<string, Map<string, unknown>>;
export declare function createEditState(): EditState;
export declare function updateEditState(state: EditState, pagePath: string, field: string, value: unknown): void;
export declare function clearEditState(state: EditState, pagePath: string): void;
export declare function getEditState(state: EditState, pagePath: string): ReadonlyMap<string, unknown> | undefined;
export declare function isDirty(state: EditState, pagePath: string): boolean;
export declare function isAnyDirty(state: EditState): boolean;
//# sourceMappingURL=edit-state.d.ts.map