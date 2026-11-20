import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@xyflow/react/dist/style.css?raw', () => ({
  default: '.react-flow { display: flex; } .react-flow__renderer { position: absolute; } .react-flow__node { position: absolute; pointer-events: all; } .react-flow__edge { position: absolute; pointer-events: visibleStroke; }',
}));
import {
  getIsolationCSS,
  injectIsolationStyles,
  releaseIsolationStyles,
  resetIsolationState,
  DIAGRAM_ROOT_CLASS,
} from './css-isolation.js';
import { html } from 'lit-html';
import { clearRegistry, registerStencil } from '../registry/stencil-registry.js';

describe('css-isolation', () => {
  beforeEach(() => {
    clearRegistry();
  });

  afterEach(() => {
    resetIsolationState();
    document.head.querySelectorAll('style[data-graph-isolation]')
      .forEach(el => { el.remove(); });
  });

  it('generates isolation CSS with diagram-root reset', () => {
    const css = getIsolationCSS();
    expect(css).toContain(`.${DIAGRAM_ROOT_CLASS}`);
    expect(css).toContain('all: initial');
  });

  it('includes React Flow base styles in isolation CSS', () => {
    const css = getIsolationCSS();
    expect(css).toContain('.react-flow__node');
    expect(css).toContain('.react-flow__edge');
  });

  it('does not use all:revert on children — shadow DOM provides isolation', () => {
    const css = getIsolationCSS();
    expect(css).not.toContain('all: revert');
  });

  it('includes plugin styles in isolation CSS', () => {
    registerStencil({
      type: 'custom',
      label: 'Custom',
      icon: 'icon',
      grammar: {
        type: 'custom',
        connections: {
          inbound: { min: 0, max: 5, allowedFrom: [] },
          outbound: { min: 0, max: 5, allowedTo: [] },
        },
      },
      render: () => html`<div>custom</div>`,
      defaultStyle: '.custom-node { background: red; }',
    });
    const css = getIsolationCSS();
    expect(css).toContain('.custom-node { background: red; }');
  });

  it('injects a style element into document.head', () => {
    const style = injectIsolationStyles();
    expect(style.parentElement).toBe(document.head);
    expect(style.hasAttribute('data-graph-isolation')).toBe(true);
    releaseIsolationStyles();
  });

  it('exports DIAGRAM_ROOT_CLASS as diagram-root', () => {
    expect(DIAGRAM_ROOT_CLASS).toBe('diagram-root');
  });

  describe('reference counting', () => {
    it('second mount reuses the same style element', () => {
      const first = injectIsolationStyles();
      const second = injectIsolationStyles();
      expect(second).toBe(first);
      expect(document.head.querySelectorAll('style[data-graph-isolation]').length).toBe(1);
      releaseIsolationStyles();
      releaseIsolationStyles();
    });

    it('first release keeps style when another instance is still mounted', () => {
      injectIsolationStyles();
      injectIsolationStyles();
      releaseIsolationStyles();
      const remaining = document.head.querySelector('style[data-graph-isolation]');
      expect(remaining).not.toBeNull();
      releaseIsolationStyles();
    });

    it('last release removes the style element', () => {
      injectIsolationStyles();
      injectIsolationStyles();
      releaseIsolationStyles();
      releaseIsolationStyles();
      const remaining = document.head.querySelector('style[data-graph-isolation]');
      expect(remaining).toBeNull();
    });

    it('re-mount after full cleanup creates a fresh style element', () => {
      const first = injectIsolationStyles();
      releaseIsolationStyles();
      expect(document.head.querySelector('style[data-graph-isolation]')).toBeNull();

      const second = injectIsolationStyles();
      expect(second.parentElement).toBe(document.head);
      expect(second).not.toBe(first);
      releaseIsolationStyles();
    });

    it('release with no prior inject is a no-op', () => {
      expect(() => { releaseIsolationStyles(); }).not.toThrow();
      expect(document.head.querySelector('style[data-graph-isolation]')).toBeNull();
    });
  });

  describe('shadow root injection', () => {
    let hostEl: HTMLElement;
    let shadowRoot: ShadowRoot;

    beforeEach(() => {
      hostEl = document.createElement('div');
      document.body.appendChild(hostEl);
      shadowRoot = hostEl.attachShadow({ mode: 'open' });
    });

    afterEach(() => {
      hostEl.remove();
    });

    it('injects into shadow root when host is inside one', () => {
      const child = document.createElement('div');
      shadowRoot.appendChild(child);
      const style = injectIsolationStyles(child);
      expect(style.parentNode).toBe(shadowRoot);
      expect(document.head.querySelector('style[data-graph-isolation]')).toBeNull();
      releaseIsolationStyles(child);
    });

    it('injects into document.head when no host is provided', () => {
      const style = injectIsolationStyles();
      expect(style.parentElement).toBe(document.head);
      releaseIsolationStyles();
    });

    it('injects into document.head when host is in light DOM', () => {
      const lightChild = document.createElement('div');
      document.body.appendChild(lightChild);
      const style = injectIsolationStyles(lightChild);
      expect(style.parentElement).toBe(document.head);
      releaseIsolationStyles(lightChild);
      lightChild.remove();
    });

    it('maintains independent ref-counts per root', () => {
      const child1 = document.createElement('div');
      shadowRoot.appendChild(child1);

      const host2 = document.createElement('div');
      document.body.appendChild(host2);
      const shadow2 = host2.attachShadow({ mode: 'open' });
      const child2 = document.createElement('div');
      shadow2.appendChild(child2);

      injectIsolationStyles(child1);
      injectIsolationStyles(child2);
      injectIsolationStyles(child1);

      releaseIsolationStyles(child1);
      expect(shadowRoot.querySelector('style[data-graph-isolation]')).not.toBeNull();

      releaseIsolationStyles(child1);
      expect(shadowRoot.querySelector('style[data-graph-isolation]')).toBeNull();

      expect(shadow2.querySelector('style[data-graph-isolation]')).not.toBeNull();
      releaseIsolationStyles(child2);
      expect(shadow2.querySelector('style[data-graph-isolation]')).toBeNull();

      host2.remove();
    });

    it('two instances in same shadow root share one style element', () => {
      const child1 = document.createElement('div');
      const child2 = document.createElement('div');
      shadowRoot.appendChild(child1);
      shadowRoot.appendChild(child2);

      const style1 = injectIsolationStyles(child1);
      const style2 = injectIsolationStyles(child2);
      expect(style2).toBe(style1);
      expect(shadowRoot.querySelectorAll('style[data-graph-isolation]').length).toBe(1);

      releaseIsolationStyles(child1);
      releaseIsolationStyles(child2);
    });
  });
});
