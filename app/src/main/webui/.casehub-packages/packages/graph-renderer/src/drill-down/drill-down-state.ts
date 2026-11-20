import type { GraphModel } from '@casehubio/graph-core';
import type { Node, Edge } from '@xyflow/react';
import type { DrillDownTarget, StackLevel } from './types.js';

export class DrillDownState {
  private _levels: StackLevel[] = [];
  private _resolveGeneration = 0;

  get depth(): number {
    return this._levels.length;
  }

  get activeIndex(): number {
    return this._levels.length - 1;
  }

  get levels(): readonly StackLevel[] {
    return this._levels;
  }

  get resolveGeneration(): number {
    return this._resolveGeneration;
  }

  push(
    target: DrillDownTarget,
    nodeId: string,
    viewport: { x: number; y: number; zoom: number },
    layoutNodes: Node[],
    layoutEdges: Edge[],
    layoutGeneration: number,
    currentModel?: GraphModel,
  ): void {
    const level: StackLevel = {
      name: target.name,
      nodeId,
      model: currentModel ?? target.model,
      viewport,
      layoutNodes,
      layoutEdges,
      layoutGeneration,
    };
    if (target.diagramType !== undefined) {
      level.diagramType = target.diagramType;
    }
    this._levels.push(level);
    this._resolveGeneration++;
  }

  pop(): StackLevel | undefined {
    const popped = this._levels.pop();
    if (popped) this._resolveGeneration++;
    return popped;
  }

  navigateTo(depth: number): StackLevel[] {
    const removeCount = this._levels.length - (depth + 1);
    if (removeCount <= 0) return [];
    const removed = this._levels.splice(depth + 1, removeCount).reverse();
    this._resolveGeneration++;
    return removed;
  }
}
