import { fromRows } from './conversion.js';
import type { TypedDataSet } from './types.js';

export const EMPTY_DATASET: TypedDataSet = fromRows([], []);
