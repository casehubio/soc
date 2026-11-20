import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import type { Node } from '@xyflow/react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

let capturedMiniMapProps: Record<string, unknown> = {};

vi.mock('@tisoap/react-flow-smart-edge', () => ({
  SmartBezierEdge: () => React.createElement('div'),
  SmartEdgeProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'smart-edge-provider' }, children),
}));

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'react-flow' }, children),
  MiniMap: (props: Record<string, unknown>) => {
    capturedMiniMapProps = props;
    return React.createElement('div', { 'data-testid': 'minimap' });
  },
  Controls: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'controls' }, children),
  ControlButton: () => React.createElement('button'),
  Background: () => React.createElement('div', { 'data-testid': 'background' }),
  SelectionMode: { Partial: 'partial' },
  useReactFlow: () => ({ setViewport: vi.fn() }),
  useStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = { width: 800, height: 600, nodeLookup: new Map() };
    return selector(state);
  },
}));

import { ReactFlowApp, computeBounds } from './ReactFlowApp.js';

describe('computeBounds', () => {
  it('uses absolute position for child nodes', () => {
    const parent = {
      id: 'parent',
      position: { x: 100, y: 50 },
      measured: { width: 300, height: 400 },
      data: {},
    } as Node;

    const child = {
      id: 'child',
      position: { x: 20, y: 30 },
      parentId: 'parent',
      measured: { width: 260, height: 40 },
      data: {},
      internals: { positionAbsolute: { x: 120, y: 80 } },
    } as Node;

    const bounds = computeBounds([parent, child]);
    const [minX, minY, maxX, maxY] = bounds.split(',').map(Number);

    // Parent: absolute (100,50) to (400,450)
    // Child: absolute (120,80) to (380,120)
    // Combined: (100,50) to (400,450)
    expect(minX).toBe(100);
    expect(minY).toBe(50);
    expect(maxX).toBe(400);
    expect(maxY).toBe(450);
  });

  it('falls back to node.position when internals not present', () => {
    const node = {
      id: 'n1',
      position: { x: 10, y: 20 },
      measured: { width: 100, height: 50 },
      data: {},
    } as Node;

    const bounds = computeBounds([node]);
    const [minX, minY, maxX, maxY] = bounds.split(',').map(Number);

    expect(minX).toBe(10);
    expect(minY).toBe(20);
    expect(maxX).toBe(110);
    expect(maxY).toBe(70);
  });
});

describe('ReactFlowApp', () => {
  it('passes nodeColor to MiniMap for visible node fills', () => {
    capturedMiniMapProps = {};
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(ReactFlowApp, {
          nodes: [],
          edges: [],
          nodeTypes: {},
        }),
      );
    });

    expect(typeof capturedMiniMapProps['nodeColor']).toBe('function');
    const colorFn = capturedMiniMapProps['nodeColor'] as (node: { type?: string }) => string;
    expect(colorFn({ type: 'start' })).toBe('#16a34a');
    expect(colorFn({ type: 'try-catch' })).toBe('#c2410c');
    expect(colorFn({ type: 'call' })).toBe('#2563eb');
    expect(capturedMiniMapProps['maskColor']).toBe('rgba(0, 0, 0, 0.3)');

    act(() => { root.unmount(); });
    container.remove();
  });
});
