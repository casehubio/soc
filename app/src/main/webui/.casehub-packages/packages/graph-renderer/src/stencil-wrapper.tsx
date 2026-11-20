import React, { useRef, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { render, nothing, type TemplateResult, type SVGTemplateResult } from 'lit-html';
import type { GraphNode, NodeDecoration } from '@casehubio/graph-core';
import { getGrammar } from '@casehubio/graph-core';

export type StencilTemplate = TemplateResult | SVGTemplateResult;

export type StencilRenderFn = (node: GraphNode, decoration?: NodeDecoration) => StencilTemplate;

interface ErrorBoundaryProps {
  nodeType: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class StencilErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Stencil render error [${this.props.nodeType}]:`, error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{
          padding: '8px 12px',
          background: '#fee',
          border: '1px solid #c00',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#900',
        }}>
          <strong>{this.props.nodeType}</strong>: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

function DecorationBadge({ badge }: { badge: NonNullable<NodeDecoration['badge']> }): React.JSX.Element {
  return (
    <div
      className="stencil-decoration-badge"
      style={{
        position: 'absolute',
        top: -6,
        right: -6,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        background: badge.color,
        color: '#fff',
        borderRadius: '10px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 600,
        lineHeight: 1,
        zIndex: 10,
        animation: badge.pulse ? 'stencil-badge-pulse 1.5s ease-in-out infinite' : undefined,
      }}
    >
      <span className="stencil-badge-icon">{badge.icon}</span>
      {badge.count != null && <span className="stencil-badge-count">{badge.count}</span>}
    </div>
  );
}

function DecorationOverlay({ overlay }: { overlay: NonNullable<NodeDecoration['overlay']> }): React.JSX.Element {
  const bg = overlay.type === 'heatmap'
    ? `rgba(255, 69, 0, ${overlay.intensity * 0.4})`
    : `rgba(59, 130, 246, ${overlay.intensity * 0.3})`;
  return (
    <div
      className="stencil-decoration-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        background: bg,
        borderRadius: 'inherit',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}

function DecorationPills({ pills }: { pills: NonNullable<NodeDecoration['pills']> }): React.JSX.Element {
  return (
    <div
      className="stencil-decoration-pills"
      style={{
        position: 'absolute',
        bottom: -10,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '3px',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {pills.map((pill, i) => (
        <span
          key={i}
          className="stencil-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            background: pill.color,
            color: '#fff',
            borderRadius: '8px',
            padding: '1px 6px',
            fontSize: '9px',
            fontWeight: 600,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {pill.icon && <span className="stencil-pill-icon">{pill.icon}</span>}
          <span className="stencil-pill-text">{pill.text}</span>
        </span>
      ))}
    </div>
  );
}

const PULSE_STYLE_ID = 'stencil-decoration-pulse';

function ensurePulseStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PULSE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PULSE_STYLE_ID;
  style.textContent = `@keyframes stencil-badge-pulse {
  0%, 100% { box-shadow: 0 0 0 0 currentColor; }
  50% { box-shadow: 0 0 0 4px transparent; }
}`;
  document.head.appendChild(style);
}

export function createStencilNodeComponent(
  renderFn: StencilRenderFn,
): React.ComponentType<NodeProps> {
  function StencilNode({ id, type, data, parentId, width, height }: NodeProps): React.JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const grammar = type ? getGrammar(type) : undefined;
    const rawData = (data ?? {});
    const decoration = rawData._decoration as NodeDecoration | undefined;

    useEffect(() => {
      if (!containerRef.current) return;
      const { _decoration: _, ...properties } = rawData;
      const graphNode: GraphNode = {
        id,
        type: type ?? '',
        ...(parentId ? { parentId } : {}),
        properties: properties,
      };
      render(renderFn(graphNode, decoration), containerRef.current);
    }, [id, type, data, parentId]);

    useEffect(() => {
      return () => {
        if (containerRef.current) {
          render(nothing, containerRef.current);
        }
      };
    }, []);

    useEffect(() => {
      if (decoration?.badge?.pulse) ensurePulseStyle();
    }, [decoration?.badge?.pulse]);

    const borderStyle = decoration?.border
      ? { border: `2px ${decoration.border.style} ${decoration.border.color}` }
      : undefined;

    const sizeStyle: React.CSSProperties = {};
    if (width != null && width > 0) {
      sizeStyle.width = width;
    }
    if (height != null && height > 0) {
      sizeStyle.height = height;
    }

    const hideHandles = rawData._hideHandles === true;
    const hasTarget = rawData._targetHandlePosition !== undefined;
    const hasSource = rawData._sourceHandlePosition !== undefined;
    const hiddenHandle: React.CSSProperties = { opacity: 0, width: 1, height: 1 };
    const fullNodeHandle: React.CSSProperties = {
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      borderRadius: 'inherit', opacity: 0, transform: 'none',
    };
    const allPositions = [
      { key: 'top', pos: Position.Top },
      { key: 'bottom', pos: Position.Bottom },
      { key: 'left', pos: Position.Left },
      { key: 'right', pos: Position.Right },
    ];

    return (
      <>
        {!hideHandles && hasTarget && grammar?.connections.inbound.max !== 0 &&
          <>
            <Handle key="target-full" id="target-full"
              type="target" position={Position.Top}
              style={{ ...fullNodeHandle, zIndex: 1 }} />
            {allPositions.map(({ key, pos }) =>
              <Handle key={`target-${key}`} id={`target-${key}`}
                type="target" position={pos} style={hiddenHandle} />
            )}
          </>
        }
        <div
          className="stencil-decoration-wrapper"
          style={{ position: 'relative', ...borderStyle, ...sizeStyle, height: sizeStyle.height ? '100%' : undefined }}
          title={decoration?.tooltip}
        >
          {decoration?.badge && <DecorationBadge badge={decoration.badge} />}
          {decoration?.overlay && <DecorationOverlay overlay={decoration.overlay} />}
          {decoration?.pills && decoration.pills.length > 0 && <DecorationPills pills={decoration.pills} />}
          {!!(rawData._drillable) && (
            <button
              className="stencil-action"
              aria-label={`Drill into ${rawData.name || rawData.label || id}`}
              style={{
                position: 'absolute', top: 4, right: 4, zIndex: 3,
                width: 20, height: 20, border: '1px solid #dadce0',
                borderRadius: 4, background: '#fff', cursor: 'pointer',
                fontSize: 12, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#5f6368', padding: 0,
              }}
              onClick={(e) => {
                e.stopPropagation();
                const target = e.currentTarget as HTMLElement;
                target.dispatchEvent(new CustomEvent('graph:drill-down', {
                  detail: { nodeId: id },
                  bubbles: true,
                  composed: true,
                }));
              }}
            >
              {'⤢'}
            </button>
          )}
          <div ref={containerRef} style={sizeStyle.height ? { height: '100%' } : undefined} />
        </div>
        {!hideHandles && hasSource && grammar?.connections.outbound.max !== 0 &&
          <>
            <Handle key="source-full" id="source-full"
              type="source" position={Position.Bottom}
              className="stencil-source-handle"
              style={{ ...fullNodeHandle, zIndex: 0 }} />
            {allPositions.map(({ key, pos }) =>
              <Handle key={`source-${key}`} id={`source-${key}`}
                type="source" position={pos} style={hiddenHandle} />
            )}
          </>
        }
      </>
    );
  }

  function StencilNodeWithBoundary(props: NodeProps): React.JSX.Element {
    return (
      <StencilErrorBoundary nodeType={props.type ?? 'unknown'}>
        <StencilNode {...props} />
      </StencilErrorBoundary>
    );
  }

  return StencilNodeWithBoundary;
}
