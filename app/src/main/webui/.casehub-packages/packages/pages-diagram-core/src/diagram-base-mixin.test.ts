import { describe, it, expect } from 'vitest';
import { LitElement } from 'lit';
import { DiagramBaseMixin } from './diagram-base-mixin.js';
import type { LayoutResult } from './diagram-base-mixin.js';
import type { GraphModel } from '@casehubio/graph-core';
import type { ElkLayoutOptions } from '@casehubio/graph-renderer';

const tagCounter = { n: 0 };
function uniqueTag() { return `test-diagram-${++tagCounter.n}`; }

class TestDiagram extends DiagramBaseMixin(LitElement) {
  computeLayoutCalls: Array<{ model: GraphModel; options: ElkLayoutOptions }> = [];

  protected _adaptYaml(_yaml: string) {
    return {
      model: { nodes: [], edges: [] } as GraphModel,
      yamlPaths: new Map<string, readonly (string | number)[]>(),
    };
  }

  protected _applyPropertyEdit() { return ''; }
  protected _emptyTemplate() { return null; }

  protected override async _computeLayout(
    model: GraphModel,
    options: ElkLayoutOptions,
  ): Promise<LayoutResult> {
    this.computeLayoutCalls.push({ model, options });
    return { layout: { nodeLayouts: new Map() }, direction: 'DOWN' };
  }
}

describe('DiagramBaseMixin', () => {
  it('exports the mixin function', () => {
    expect(typeof DiagramBaseMixin).toBe('function');
  });

  describe('_computeLayout', () => {
    it('is called by _fullRender instead of computeElkLayout directly', async () => {
      customElements.define(uniqueTag(), TestDiagram);
      const el = new TestDiagram();
      await el._fullRender('test: yaml');
      expect(el.computeLayoutCalls.length).toBe(1);
      expect(el.computeLayoutCalls[0]!.model).toEqual({ nodes: [], edges: [] });
    });
  });

  describe('_postLayout', () => {
    it('is called after toReactFlowGraph in _fullRender', async () => {
      class PostLayoutDiagram extends TestDiagram {
        postLayoutCalled = false;
        protected override _postLayout(
          nodes: import('@xyflow/react').Node[],
          edges: import('@xyflow/react').Edge[],
        ) {
          this.postLayoutCalled = true;
          return { nodes, edges };
        }
      }
      customElements.define(uniqueTag(), PostLayoutDiagram);
      const el = new PostLayoutDiagram();
      await el._fullRender('test: yaml');
      expect(el.postLayoutCalled).toBe(true);
    });

    it('is called after toReactFlowGraph in _updateWithoutLayout', async () => {
      class PostLayoutDiagram2 extends TestDiagram {
        postLayoutCalled = false;
        protected override _postLayout(
          nodes: import('@xyflow/react').Node[],
          edges: import('@xyflow/react').Edge[],
        ) {
          this.postLayoutCalled = true;
          return { nodes, edges };
        }
      }
      customElements.define(uniqueTag(), PostLayoutDiagram2);
      const el = new PostLayoutDiagram2();
      await el._fullRender('test: yaml');
      el.postLayoutCalled = false;
      el._updateWithoutLayout('test: yaml');
      expect(el.postLayoutCalled).toBe(true);
    });
  });

  describe('_handleCanvasEvent', () => {
    it('dispatches graph:node:click to _handleNodeClick', () => {
      customElements.define(uniqueTag(), class extends TestDiagram {});
      const el = new TestDiagram();
      let called = false;
      (el as any)._handleNodeClick = () => { called = true; };
      el._handleCanvasEvent(new CustomEvent('pages-event', {
        detail: { topic: 'graph:node:click', payload: { nodeId: 'n1' } },
      }));
      expect(called).toBe(true);
    });

    it('dispatches graph:edge:click to _handleEdgeClick', () => {
      const el = new TestDiagram();
      let called = false;
      el._handleEdgeClick = () => { called = true; };
      el._handleCanvasEvent(new CustomEvent('pages-event', {
        detail: { topic: 'graph:edge:click', payload: { edgeId: 'e1' } },
      }));
      expect(called).toBe(true);
    });

    it('dispatches graph:selection:change to _handleSelectionChange', () => {
      const el = new TestDiagram();
      let called = false;
      (el as any)._handleSelectionChange = () => { called = true; };
      el._handleCanvasEvent(new CustomEvent('pages-event', {
        detail: { topic: 'graph:selection:change', payload: { nodeIds: [] } },
      }));
      expect(called).toBe(true);
    });

    it('dispatches graph:pane:click to _showPickerAtPaneClick', () => {
      const el = new TestDiagram();
      let called = false;
      (el as any)._showPickerAtPaneClick = () => { called = true; };
      el._handleCanvasEvent(new CustomEvent('pages-event', {
        detail: { topic: 'graph:pane:click' },
      }));
      expect(called).toBe(true);
    });

    it('dispatches graph:connect:end-on-empty to _showPickerAtConnectEnd', () => {
      const el = new TestDiagram();
      let passedPayload: unknown = null;
      (el as any)._showPickerAtConnectEnd = (p: unknown) => { passedPayload = p; };
      el._handleCanvasEvent(new CustomEvent('pages-event', {
        detail: { topic: 'graph:connect:end-on-empty', payload: { sourceNodeId: 'n1' } },
      }));
      expect(passedPayload).toEqual({ sourceNodeId: 'n1' });
    });

    it('does nothing for unknown topics', () => {
      const el = new TestDiagram();
      expect(() => el._handleCanvasEvent(new CustomEvent('pages-event', {
        detail: { topic: 'graph:unknown:event' },
      }))).not.toThrow();
    });
  });

  describe('_handleEdgeClick', () => {
    it('is a no-op by default', () => {
      const el = new TestDiagram();
      expect(() => el._handleEdgeClick(new CustomEvent('pages-event', {
        detail: { topic: 'graph:edge:click', payload: { edgeId: 'e1' } },
      }))).not.toThrow();
    });
  });

  describe('_renderCanvas', () => {
    it('returns a TemplateResult', () => {
      const el = new TestDiagram();
      const result = el._renderCanvas();
      expect(result).toBeDefined();
      expect(result.strings).toBeDefined();
    });
  });

  describe('_renderDialogs', () => {
    it('returns a TemplateResult', () => {
      const el = new TestDiagram();
      const result = el._renderDialogs();
      expect(result).toBeDefined();
    });

    it('includes conflict dialog when _showConflict is true', () => {
      const el = new TestDiagram();
      (el as any)._showConflict = true;
      const result = el._renderDialogs();
      const templateStr = result.strings.join('');
      expect(templateStr.length).toBeGreaterThan(0);
    });
  });
});
