import React, { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,

  ControlButton,
  useReactFlow,
  useStore,
  type Node,
  type Edge,
  type EdgeTypes,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type NodeTypes,
  type OnSelectionChangeFunc,
  type OnMoveEnd,
  type ReactFlowInstance,
  type Connection,
} from '@xyflow/react';
import { SmartBezierEdge, SmartEdgeProvider } from '@tisoap/react-flow-smart-edge';
import { type EdgeProps, Position, BezierEdge } from '@xyflow/react';

function DirectionalBezierEdge(props: EdgeProps) {
  const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition } = props;
  const dist = Math.sqrt((sourceX - targetX) ** 2 + (sourceY - targetY) ** 2);
  const offset = Math.min(60, dist * 0.4);
  const signX = (pos: Position) => pos === Position.Left ? -1 : pos === Position.Right ? 1 : 0;
  const signY = (pos: Position) => pos === Position.Top ? -1 : pos === Position.Bottom ? 1 : 0;
  const scx = sourceX + signX(sourcePosition) * offset;
  const scy = sourceY + signY(sourcePosition) * offset;
  const tcx = targetX + signX(targetPosition) * offset;
  const tcy = targetY + signY(targetPosition) * offset;
  const path = `M${sourceX},${sourceY} C${scx},${scy} ${tcx},${tcy} ${targetX},${targetY}`;
  return (
    <g>
      <path d={path} fill="none" className="react-flow__edge-path"
        style={props.style}
        markerEnd={props.markerEnd as string} markerStart={props.markerStart as string} />
    </g>
  );
}

function AutoBezierEdge(props: EdgeProps) {
  if (props.sourcePosition === props.targetPosition) return DirectionalBezierEdge(props);
  return React.createElement(BezierEdge, props);
}

const smartEdgeTypes: EdgeTypes = new Proxy({ default: SmartBezierEdge } as EdgeTypes, {
  get(target, prop) {
    if (prop === 'default' || prop === 'smart') return SmartBezierEdge;
    if (typeof prop === 'string') return AutoBezierEdge;
    return Reflect.get(target, prop) as unknown;
  },
});

export interface ReactFlowAppProps {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  onNodeClick?: (nodeId: string, node: Node, event?: React.MouseEvent) => void;
  onEdgeClick?: (edgeId: string, edge: Edge) => void;
  onSelectionChange?: (nodes: Node[], edges: Edge[]) => void;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
  onRelayout?: () => void;
  onConnect?: (connection: Connection) => void;
  isValidConnection?: (connection: Connection) => boolean;
  onReconnect?: (oldEdge: Edge, newConnection: Connection) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: Node, nodes: Node[]) => void;
  onPaneContextMenu?: (event: React.MouseEvent) => void;
  onNodeContextMenu?: (event: React.MouseEvent, node: Node) => void;
  onEdgeContextMenu?: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeMouseEnter?: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeMouseLeave?: (event: React.MouseEvent, edge: Edge) => void;
  onReactFlowReady?: (instance: ReactFlowInstance) => void;
  onConnectEnd?: (event: MouseEvent | TouchEvent) => void;
  onConnectStart?: (event: MouseEvent | TouchEvent, params: { nodeId: string | null }) => void;
  nodesConnectable?: boolean;
  miniMapNodeColor?: ((node: Node) => string) | undefined;
}

function ViewportBridge({ onReactFlowReady }: { onReactFlowReady?: (instance: ReactFlowInstance) => void }) {
  const instance = useReactFlow();
  useEffect(() => {
    onReactFlowReady?.(instance);
  }, [instance, onReactFlowReady]);
  return null;
}

const viewportSizeSelector = (s: { width: number; height: number }) => ({ width: s.width, height: s.height });

interface InternalNodeLike {
  internals?: { positionAbsolute?: { x: number; y: number } };
}

function nodeAbsolutePos(node: Node): { x: number; y: number } {
  return (node as unknown as InternalNodeLike).internals?.positionAbsolute ?? node.position;
}

export function computeBounds(nodes: Node[]): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const w = node.measured?.width ?? node.width ?? 150;
    const h = node.measured?.height ?? node.height ?? 40;
    const pos = nodeAbsolutePos(node);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + w);
    maxY = Math.max(maxY, pos.y + h);
  }
  return `${Math.round(minX)},${Math.round(minY)},${Math.round(maxX)},${Math.round(maxY)}`;
}

const boundsSelector = (s: { nodeLookup: Map<string, Node> }) => {
  const nodes = Array.from(s.nodeLookup.values());
  return nodes.length > 0 ? computeBounds(nodes) : '';
};

function FitTopLeft({ nodes, onFitRef }: { nodes: Node[]; onFitRef: React.MutableRefObject<(() => void) | null> }) {
  const { setViewport } = useReactFlow();
  const { width: vw, height: vh } = useStore(viewportSizeSelector);
  const bounds = useStore(boundsSelector);
  const nodeLookup = useStore((s: { nodeLookup: Map<string, Node> }) => s.nodeLookup);
  const lastFittedBounds = useRef('');
  const userInteracted = useRef(false);

  const doFit = useCallback(() => {
    const measured = Array.from(nodeLookup.values());
    if (measured.length === 0 || vw === 0 || vh === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of measured) {
      const w = node.measured?.width ?? node.width ?? 150;
      const h = node.measured?.height ?? node.height ?? 40;
      const pos = nodeAbsolutePos(node);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    }

    const pad = 20;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    if (contentW <= 0 || contentH <= 0) return;

    const zoom = Math.min((vw - pad * 2) / contentW, (vh - pad * 2) / contentH, 1);
    void setViewport({ x: -minX * zoom + pad, y: -minY * zoom + pad, zoom });
    lastFittedBounds.current = bounds;
    userInteracted.current = false;
  }, [nodeLookup, setViewport, vw, vh, bounds]);

  useEffect(() => { onFitRef.current = () => { doFit(); userInteracted.current = false; }; }, [doFit, onFitRef]);

  useEffect(() => {
    if (!bounds || bounds === lastFittedBounds.current || userInteracted.current) return;
    doFit();
  }, [bounds, doFit]);

  useEffect(() => { lastFittedBounds.current = ''; userInteracted.current = false; }, [nodes]);

  return null;
}

function defaultMiniMapNodeColor(node: Node): string {
  const t = node.type ?? '';
  if (t.includes('try-catch')) return '#c2410c';
  if (t.includes('switch')) return '#ca8a04';
  if (t.includes('raise')) return '#dc2626';
  if (t.includes('set')) return '#7c3aed';
  if (t.includes('start') || t.includes('entry')) return '#16a34a';
  if (t.includes('end') || t.includes('exit')) return '#64748b';
  return '#2563eb';
}

export function ReactFlowApp({
  nodes,
  edges,
  nodeTypes,
  onNodeClick,
  onEdgeClick,
  onSelectionChange,
  onViewportChange,
  onRelayout,
  onConnect,
  isValidConnection,
  onReconnect,
  onPaneClick,
  onNodeDragStop,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu,
  onEdgeMouseEnter,
  onEdgeMouseLeave,
  onReactFlowReady,
  onConnectEnd,
  onConnectStart,
  nodesConnectable,
  miniMapNodeColor,
}: ReactFlowAppProps): React.JSX.Element {
  const fitRef = useRef<(() => void) | null>(null);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (event, node) => { onNodeClick?.(node.id, node, event); },
    [onNodeClick],
  );

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => { onEdgeClick?.(edge.id, edge); },
    [onEdgeClick],
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      onSelectionChange?.(selectedNodes, selectedEdges);
    },
    [onSelectionChange],
  );

  const handleMoveEnd: OnMoveEnd = useCallback(
    (_event, viewport) => { onViewportChange?.(viewport); },
    [onViewportChange],
  );

  const editingProps = Object.fromEntries(
    Object.entries({
      onConnect, isValidConnection, onReconnect, onPaneClick, onConnectEnd, onConnectStart,
      onNodeDragStop, onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu,
      onEdgeMouseEnter, onEdgeMouseLeave,
    }).filter(([, v]) => v !== undefined),
  );

  return (
    <SmartEdgeProvider nodes={nodes}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={smartEdgeTypes}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      onSelectionChange={handleSelectionChange}
      onMoveEnd={handleMoveEnd}
      edgesReconnectable
      nodesDraggable={false}
      nodesConnectable={nodesConnectable ?? true}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      connectionRadius={0}
      {...editingProps}
    >
      <ViewportBridge onReactFlowReady={onReactFlowReady ?? (() => {})} />
      <FitTopLeft nodes={nodes} onFitRef={fitRef} />
      <MiniMap
        pannable
        zoomable
        nodeColor={miniMapNodeColor ?? defaultMiniMapNodeColor}
        style={{ background: 'var(--pages-neutral-3, #e5e5e5)' }}
        maskColor="rgba(0, 0, 0, 0.3)"
      />
      <Controls showFitView={false}>
        <ControlButton onClick={() => fitRef.current?.()} title="Fit to view">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </ControlButton>
        {onRelayout && (
          <ControlButton onClick={onRelayout} title="Re-layout">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </ControlButton>
        )}
      </Controls>
      <Background />
    </ReactFlow>
    </SmartEdgeProvider>
  );
}
