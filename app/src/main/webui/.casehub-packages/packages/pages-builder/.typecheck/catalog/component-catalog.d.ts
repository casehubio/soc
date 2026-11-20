import type { PaletteContext, ContextRelevance } from './palette-context.js';
export interface PreviewHints {
    readonly placeholderText?: string;
    readonly sampleChildren?: number;
    readonly displayDefaults?: Record<string, unknown>;
}
export interface ComponentCatalogEntry {
    readonly type: string;
    readonly label: string;
    readonly category: string;
    readonly icon: string;
    readonly description: string;
    readonly defaultProps: Record<string, unknown>;
    readonly prereqHint?: string;
    readonly previewHints?: PreviewHints;
    contextRelevance(ctx: PaletteContext): ContextRelevance;
}
export interface FilteredCatalogEntry {
    readonly entry: ComponentCatalogEntry;
    readonly relevance: ContextRelevance;
}
export declare const COMPONENT_CATALOG: readonly ComponentCatalogEntry[];
export declare function getFilteredCatalog(ctx: PaletteContext): readonly FilteredCatalogEntry[];
export declare function getCatalogCategories(): readonly string[];
//# sourceMappingURL=component-catalog.d.ts.map