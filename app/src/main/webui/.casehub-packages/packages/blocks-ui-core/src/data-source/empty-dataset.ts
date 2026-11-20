import { fromRows } from '@casehubio/pages-data/dist/dataset/conversion.js';
import type { TypedDataSet } from '@casehubio/pages-data/dist/dataset/types.js';

export const EMPTY_DATASET: TypedDataSet = fromRows([], []);
