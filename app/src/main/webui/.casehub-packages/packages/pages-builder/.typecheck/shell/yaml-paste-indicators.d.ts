import { PageDocument } from '@casehubio/pages-document';
export interface PasteLineEntry {
    line: number;
    position: 'before' | 'after' | 'child';
    path: readonly (string | number)[];
}
export declare function computeValidPasteLines(doc: PageDocument, fragmentType: string): PasteLineEntry[];
//# sourceMappingURL=yaml-paste-indicators.d.ts.map