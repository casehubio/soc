import type { Entry, ContentFactory, Organiser, OrganiserType, GroupPolicy, OrganiserCallbacks, FreeLayoutState } from "./types.js";
export type { Entry, ContentFactory } from "./types.js";
export interface Group {
    readonly entries: readonly Entry[];
    readonly organiser: Organiser;
    readonly policy: GroupPolicy;
    readonly depth: number;
    addEntry(entry: Entry): void;
    removeEntry(key: string): void;
    setOrganiser(type: OrganiserType): void;
    mount(container: HTMLElement): void;
    unmount(): void;
    dispose(): void;
}
export interface GroupConfig {
    entries: Entry[];
    organiser: OrganiserType;
    policy?: GroupPolicy;
    contentFactory: ContentFactory;
    callbacks?: OrganiserCallbacks;
    depth?: number;
    freeLayoutState?: FreeLayoutState;
}
export declare function createGroup(config: GroupConfig): Group;
//# sourceMappingURL=group.d.ts.map