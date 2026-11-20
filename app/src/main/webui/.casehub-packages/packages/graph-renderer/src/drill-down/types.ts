import type { GraphModel } from '@casehubio/graph-core';
import type { Node, Edge } from '@xyflow/react';

export interface DrillDownConfig {
  isDrillable: (nodeId: string, model: GraphModel) => boolean;
  resolve: (nodeId: string, model: GraphModel) => Promise<DrillDownTarget | null>;
  renderBar?: (level: DrillDownLevel) => HTMLElement;
}

export interface DrillDownTarget {
  name: string;
  model: GraphModel;
  diagramType?: string;
}

export interface DrillDownLevel {
  name: string;
  depth: number;
  nodeId: string;
}

export interface StackLevel {
  name: string;
  nodeId: string;
  model: GraphModel;
  viewport: { x: number; y: number; zoom: number };
  layoutNodes: Node[];
  layoutEdges: Edge[];
  layoutGeneration: number;
  diagramType?: string;
}
