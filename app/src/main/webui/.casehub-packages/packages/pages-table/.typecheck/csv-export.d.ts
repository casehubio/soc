import type { TypedDataSet } from '@casehubio/pages-data';
import type { TableColumnConfig } from './types.js';
export declare function tableToCsv(dataSet: TypedDataSet, columnConfig?: readonly TableColumnConfig[]): string;
export declare function downloadCsv(csv: string, filename?: string): void;
export declare function copyToClipboard(csv: string): Promise<boolean>;
//# sourceMappingURL=csv-export.d.ts.map