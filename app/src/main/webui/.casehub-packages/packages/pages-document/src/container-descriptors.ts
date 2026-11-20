export interface ContainerChildDescriptor {
  type: string;
  slots: SlotDescriptor[];
  defaultContentSlot: string;
}

export type SlotDescriptor =
  | { kind: 'named-record'; yamlKey: string; childKey: 'components' }
  | { kind: 'array'; yamlKey: string }
  | { kind: 'nested-array'; yamlKey: string; childKey: string };

export const CONTAINER_DESCRIPTORS: ContainerChildDescriptor[] = [
  { type: 'tabs', defaultContentSlot: 'tabs', slots: [{ kind: 'named-record', yamlKey: 'tabs', childKey: 'components' }] },
  { type: 'pills', defaultContentSlot: 'tabs', slots: [{ kind: 'named-record', yamlKey: 'tabs', childKey: 'components' }] },
  { type: 'accordion', defaultContentSlot: 'tabs', slots: [{ kind: 'named-record', yamlKey: 'tabs', childKey: 'components' }] },
  { type: 'sidebar', defaultContentSlot: 'content', slots: [
    { kind: 'array', yamlKey: 'sidebar' },
    { kind: 'array', yamlKey: 'content' },
  ]},
  { type: 'split', defaultContentSlot: 'split', slots: [{ kind: 'nested-array', yamlKey: 'split', childKey: 'children' }] },
  { type: 'form-scope', defaultContentSlot: 'form-scope', slots: [{ kind: 'nested-array', yamlKey: 'form-scope', childKey: 'components' }] },
  { type: 'carousel', defaultContentSlot: 'sections', slots: [{ kind: 'named-record', yamlKey: 'sections', childKey: 'components' }] },
  { type: 'stack', defaultContentSlot: 'sections', slots: [{ kind: 'named-record', yamlKey: 'sections', childKey: 'components' }] },
  { type: 'menu', defaultContentSlot: 'sections', slots: [{ kind: 'named-record', yamlKey: 'sections', childKey: 'components' }] },
  { type: 'tree', defaultContentSlot: 'sections', slots: [{ kind: 'named-record', yamlKey: 'sections', childKey: 'components' }] },
];

const descriptorMap = new Map(CONTAINER_DESCRIPTORS.map(d => [d.type, d]));

export function getContainerDescriptor(type: string): ContainerChildDescriptor | undefined {
  return descriptorMap.get(type);
}
