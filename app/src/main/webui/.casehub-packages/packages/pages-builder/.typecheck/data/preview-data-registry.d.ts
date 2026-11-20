import type { DatasetNode } from '@casehubio/pages-document';
export interface PreviewDataStrategy {
    generate(props: Record<string, unknown>, datasets: DatasetNode[]): DatasetSnapshot[];
}
export interface DatasetSnapshot {
    uuid: string;
    rows: Record<string, unknown>[];
}
export declare function createDefaultRegistry(): Map<string, PreviewDataStrategy>;
//# sourceMappingURL=preview-data-registry.d.ts.map