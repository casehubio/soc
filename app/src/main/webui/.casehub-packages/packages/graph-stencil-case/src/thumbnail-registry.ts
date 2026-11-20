export type ThumbnailRenderer = (doBlock: unknown, container: HTMLElement) => void;

const registry = new Map<string, ThumbnailRenderer>();

export function registerThumbnailRenderer(type: string, renderer: ThumbnailRenderer): void {
  registry.set(type, renderer);
}

export function getThumbnailRenderer(type: string): ThumbnailRenderer | undefined {
  return registry.get(type);
}
