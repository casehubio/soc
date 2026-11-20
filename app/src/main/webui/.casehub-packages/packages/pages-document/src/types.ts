export interface Position {
  readonly line: number;
  readonly character: number;
}

export interface Range {
  readonly start: Position;
  readonly end: Position;
}

export interface Diagnostic {
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly range: Range;
}

export type LayoutMode = 'rows' | 'columns' | 'flat';

export type Unsubscribe = () => void;
