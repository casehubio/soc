import type { Entry, Container, ContainerConfig, ContentFactory } from "./types.js";
export type { Entry, ContentFactory, Container, ContainerConfig } from "./types.js";
export declare function createContainer(config: ContainerConfig): Container;
export declare function containerizeEntry(entry: Entry, parentContainer: Container, contentFactory: ContentFactory): void;
export declare function flattenEntry(parentEntry: Entry, remainingChildEntry: Entry, _contentFactory: ContentFactory): void;
//# sourceMappingURL=container.d.ts.map