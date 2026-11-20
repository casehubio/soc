import type { DatasetNode } from '@casehubio/pages-document';
import type { PreviewDataStrategy, DatasetSnapshot } from '../preview-data-registry.js';
export declare class ChartDataStrategy implements PreviewDataStrategy {
    generate(props: Record<string, unknown>, datasets: DatasetNode[]): DatasetSnapshot[];
}
//# sourceMappingURL=chart-strategy.d.ts.map