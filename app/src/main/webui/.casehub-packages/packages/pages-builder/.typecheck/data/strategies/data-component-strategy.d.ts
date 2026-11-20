import type { DatasetNode } from '@casehubio/pages-document';
import type { PreviewDataStrategy, DatasetSnapshot } from '../preview-data-registry.js';
export declare class DataComponentStrategy implements PreviewDataStrategy {
    generate(props: Record<string, unknown>, datasets: DatasetNode[]): DatasetSnapshot[];
}
//# sourceMappingURL=data-component-strategy.d.ts.map