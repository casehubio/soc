import type { NodeTypes } from '@xyflow/react';
import {
  registerGrammar,
  deregisterGrammar,
  clearGrammarRegistry,
} from '@casehubio/graph-core';
import type { StencilGrammar } from '@casehubio/graph-core';
import {
  createStencilNodeComponent,
  type StencilRenderFn,
} from '../stencil-wrapper.js';

export interface StencilDescriptor {
  readonly type: string;
  readonly label: string;
  readonly icon: string;
  readonly grammar: StencilGrammar;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly render: StencilRenderFn;
  readonly defaultStyle?: string;
}

export interface EdgeMarker {
  readonly type: 'arrow' | 'arrowclosed';
  readonly color?: string;
}

export interface EdgeDescriptor {
  readonly type: string;
  readonly label?: string;
  readonly defaultStyle?: string;
  readonly markerEnd?: EdgeMarker;
  readonly markerStart?: EdgeMarker;
}

type NodeComponent = NodeTypes[string];

interface StencilEntry {
  readonly descriptor: StencilDescriptor;
  readonly component: NodeComponent;
}

const stencilRegistry = new Map<string, StencilEntry>();
const edgeRegistry = new Map<string, EdgeDescriptor>();

export function registerStencil(descriptor: StencilDescriptor): void {
  if (stencilRegistry.has(descriptor.type)) {
    throw new Error(`Stencil type "${descriptor.type}" already registered`);
  }
  registerGrammar(descriptor.grammar);
  const component = createStencilNodeComponent(descriptor.render);
  stencilRegistry.set(descriptor.type, { descriptor, component });
  cachedNodeTypes = null;
}

export function deregisterStencil(type: string): void {
  if (!stencilRegistry.has(type)) return;
  stencilRegistry.delete(type);
  cachedNodeTypes = null;
  deregisterGrammar(type);
}

export function getStencil(type: string): StencilDescriptor | undefined {
  return stencilRegistry.get(type)?.descriptor;
}

export function getAllStencils(): readonly StencilDescriptor[] {
  return Array.from(stencilRegistry.values()).map(e => e.descriptor);
}

export function registerEdgeType(descriptor: EdgeDescriptor): void {
  if (edgeRegistry.has(descriptor.type)) {
    throw new Error(`Edge type "${descriptor.type}" already registered`);
  }
  edgeRegistry.set(descriptor.type, descriptor);
}

export function deregisterEdgeType(type: string): void {
  edgeRegistry.delete(type);
}

export function getEdgeDescriptor(type: string): EdgeDescriptor | undefined {
  return edgeRegistry.get(type);
}

let cachedNodeTypes: NodeTypes | null = null;

export function getNodeTypes(): NodeTypes {
  if (cachedNodeTypes) return cachedNodeTypes;
  const result: NodeTypes = {};
  for (const [type, entry] of stencilRegistry) {
    result[type] = entry.component;
  }
  cachedNodeTypes = result;
  return result;
}

export function getRegisteredStyles(): string {
  const parts: string[] = [];
  for (const entry of stencilRegistry.values()) {
    if (entry.descriptor.defaultStyle) {
      parts.push(entry.descriptor.defaultStyle);
    }
  }
  for (const desc of edgeRegistry.values()) {
    if (desc.defaultStyle) {
      parts.push(desc.defaultStyle);
    }
  }
  return parts.join('\n');
}

export function clearRegistry(): void {
  stencilRegistry.clear();
  edgeRegistry.clear();
  clearGrammarRegistry();
}
