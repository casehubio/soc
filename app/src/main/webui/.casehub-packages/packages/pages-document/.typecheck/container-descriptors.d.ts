export interface ContainerChildDescriptor {
    type: string;
    slots: SlotDescriptor[];
    defaultContentSlot: string;
}
export type SlotDescriptor = {
    kind: 'named-record';
    yamlKey: string;
    childKey: 'components';
} | {
    kind: 'array';
    yamlKey: string;
} | {
    kind: 'nested-array';
    yamlKey: string;
    childKey: string;
};
export declare const CONTAINER_DESCRIPTORS: ContainerChildDescriptor[];
export declare function getContainerDescriptor(type: string): ContainerChildDescriptor | undefined;
//# sourceMappingURL=container-descriptors.d.ts.map