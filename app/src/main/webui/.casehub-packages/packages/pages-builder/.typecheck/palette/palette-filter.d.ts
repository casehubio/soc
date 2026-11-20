import { getCatalogCategories, type FilteredCatalogEntry } from '../catalog/component-catalog.js';
import type { PaletteContext } from '../catalog/palette-context.js';
export interface PaletteFilterOptions {
    search?: string;
    category?: string;
}
export declare function filterCatalog(ctx: PaletteContext, options?: PaletteFilterOptions): readonly FilteredCatalogEntry[];
export { getCatalogCategories };
//# sourceMappingURL=palette-filter.d.ts.map