import type { TypedDataSet, ColumnSettings } from "@casehubio/pages-data/dist/dataset/types.js";
export declare function tableToCsv(dataset: TypedDataSet, columnSettings?: readonly ColumnSettings[]): string;
export declare function downloadCsv(csv: string, filename?: string): void;
export declare function copyToClipboard(text: string): Promise<boolean>;
//# sourceMappingURL=table-export.d.ts.map