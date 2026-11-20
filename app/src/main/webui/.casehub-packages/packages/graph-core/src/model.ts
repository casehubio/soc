export interface GraphNode {
  readonly id: string;
  readonly type: string;
  readonly parentId?: string;
  readonly properties: Readonly<Record<string, unknown>>;
}

export interface GraphEdge {
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly target: string;
  readonly properties?: Readonly<Record<string, unknown>>;
}

export interface GraphModel {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface NodeDecoration {
  readonly badge?: {
    readonly icon: string;
    readonly color: string;
    readonly pulse?: boolean;
    readonly count?: number;
  };
  readonly border?: {
    readonly style: string;
    readonly color: string;
  };
  readonly overlay?: {
    readonly type: 'heatmap' | 'highlight';
    readonly intensity: number;
  };
  readonly tooltip?: string;
  readonly pills?: readonly {
    readonly text: string;
    readonly color: string;
    readonly icon?: string;
  }[];
}

export type { JSONSchema7 as PropertySchema } from 'json-schema';
