import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GraphModel } from '@casehubio/graph-core';

vi.mock('@casehubio/pages-ui-tokens', () => ({
  applyTheme: vi.fn(),
  getTheme: vi.fn(() => ''),
  listThemes: vi.fn(() => ['default-light', 'default-dark']),
  registerTheme: vi.fn(),
}));

vi.mock('../layout/elk-layout.js', () => ({
  computeElkLayout: vi.fn(async (nodes: unknown[]) => nodes),
}));

import './GraphCanvas.js';

describe('GraphCanvas', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('graph-canvas-core');
  });

  afterEach(() => {
    element.remove();
    document.head.querySelectorAll('style[data-graph-isolation]')
      .forEach(el => { el.remove(); });
  });

  it('registers as a custom element', () => {
    expect(customElements.get('graph-canvas-core')).toBeDefined();
  });

  it('creates a .diagram-root container on connect', () => {
    document.body.appendChild(element);
    const container = element.querySelector('.diagram-root');
    expect(container).not.toBeNull();
  });

  it('removes container on disconnect', () => {
    document.body.appendChild(element);
    expect(element.querySelector('.diagram-root')).not.toBeNull();
    element.remove();
    expect(element.querySelector('.diagram-root')).toBeNull();
  });

  it('calls applyTheme on the container', async () => {
    const { applyTheme } = await import('@casehubio/pages-ui-tokens');
    document.body.appendChild(element);
    const container = element.querySelector('.diagram-root');
    expect(applyTheme).toHaveBeenCalledWith('default-light', container);
  });

  it('uses createRenderRoot to skip Shadow DOM', () => {
    expect(element.shadowRoot).toBeNull();
  });

  it('accepts model property', () => {
    const model: GraphModel = {
      nodes: [{ id: 'n1', type: 'test', properties: {} }],
      edges: [],
    };
    (element as any).model = model;
    expect((element as any).model).toBe(model);
  });

  it('accepts layoutOptions property', () => {
    const opts = { direction: 'RIGHT' as const, spacing: 30 };
    (element as any).layoutOptions = opts;
    expect((element as any).layoutOptions).toBe(opts);
  });

  describe('direct nodes/edges properties', () => {
    it('accepts nodes property as reactive', async () => {
      document.body.appendChild(element);
      const testNodes = [{
        id: 'n1',
        type: 'default',
        position: { x: 100, y: 200 },
        data: { label: 'Test' },
      }];
      (element as any).nodes = testNodes;
      await (element as any).updateComplete;
      expect((element as any).nodes).toEqual(testNodes);
    });

    it('accepts edges property as reactive', async () => {
      document.body.appendChild(element);
      const testEdges = [{
        id: 'e1',
        source: 'n1',
        target: 'n2',
      }];
      (element as any).edges = testEdges;
      await (element as any).updateComplete;
      expect((element as any).edges).toEqual(testEdges);
    });
  });

  describe('connecting state', () => {
    it('does not have graph-connecting class initially', () => {
      document.body.appendChild(element);
      expect(element.classList.contains('graph-connecting')).toBe(false);
    });
  });

  describe('viewport bridge', () => {
    it('exposes screenToFlow method', () => {
      expect(typeof (element as any).screenToFlow).toBe('function');
    });

    it('returns undefined when React Flow not ready', () => {
      expect((element as any).screenToFlow(100, 200)).toBeUndefined();
    });

    it('exposes flowToScreen method', () => {
      expect(typeof (element as any).flowToScreen).toBe('function');
    });

    it('returns undefined for flowToScreen when React Flow not ready', () => {
      expect((element as any).flowToScreen(100, 200)).toBeUndefined();
    });
  });

  describe('shadow DOM element hit testing', () => {
    let host: HTMLDivElement;
    let canvas: any;

    beforeEach(() => {
      host = document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);
      canvas = document.createElement('graph-canvas-core');
      shadow.appendChild(canvas);
    });

    afterEach(() => {
      host.remove();
      document.head.querySelectorAll('style[data-graph-isolation]')
        .forEach(el => { el.remove(); });
    });

    it('_updateDropEdgeHighlight queries elementsFromPoint on the root node, not document', () => {
      canvas.model = { nodes: [], edges: [] };
      canvas.editPolicy = { getInsertableTypes: () => [] };

      const shadow = canvas._container.getRootNode();
      const shadowEfp = vi.fn().mockReturnValue([]);
      shadow.elementsFromPoint = shadowEfp;

      const originalDocEfp = document.elementsFromPoint;
      const docEfp = vi.fn().mockReturnValue([]);
      document.elementsFromPoint = docEfp;

      try {
        canvas._updateDropEdgeHighlight({ clientX: 10, clientY: 20 } as unknown as DragEvent);
        expect(shadowEfp).toHaveBeenCalledWith(10, 20);
        expect(docEfp).not.toHaveBeenCalled();
      } finally {
        if (originalDocEfp) document.elementsFromPoint = originalDocEfp;
        else delete (document as any).elementsFromPoint;
      }
    });

    it('_updateDropEdgeHighlight falls back to document when not in shadow DOM', () => {
      const plainCanvas = document.createElement('graph-canvas-core') as any;
      document.body.appendChild(plainCanvas);

      plainCanvas.model = { nodes: [], edges: [] };
      plainCanvas.editPolicy = { getInsertableTypes: () => [] };

      const originalDocEfp = document.elementsFromPoint;
      const docEfp = vi.fn().mockReturnValue([]);
      document.elementsFromPoint = docEfp;

      try {
        plainCanvas._updateDropEdgeHighlight({ clientX: 30, clientY: 40 } as unknown as DragEvent);
        expect(docEfp).toHaveBeenCalledWith(30, 40);
      } finally {
        if (originalDocEfp) document.elementsFromPoint = originalDocEfp;
        else delete (document as any).elementsFromPoint;
        plainCanvas.remove();
      }
    });
  });
});
