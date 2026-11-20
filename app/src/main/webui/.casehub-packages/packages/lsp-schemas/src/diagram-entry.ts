import '@casehubio/mosaic-casehub-diagram';
import '@casehubio/mosaic-swf-diagram';
import '@casehubio/mosaic-diagram-workbench';
import { DIAGRAM_TAGS } from '@casehubio/mosaic-core';
import { registerSwfStencils, createSwfThumbnailRenderer } from '@casehubio/mosaic-graph-stencil-swf';
import { registerThumbnailRenderer } from '@casehubio/mosaic-graph-stencil-case';

registerSwfStencils();
registerThumbnailRenderer('swf', createSwfThumbnailRenderer());

let activeElement: HTMLElement | null = null;

function createDiagramElement(tag: string): HTMLElement {
  const el = document.createElement(tag);
  const root = document.getElementById('diagram-root')!;
  root.innerHTML = '';
  root.appendChild(el);

  const injectOverrides = (host: Element) => {
    const sr = host.shadowRoot;
    if (sr && !sr.querySelector('#iife-overrides')) {
      const s = document.createElement('style');
      s.id = 'iife-overrides';
      s.textContent = '.stencil-decoration-wrapper { height: auto !important; }';
      sr.appendChild(s);
    }
    for (const child of host.querySelectorAll('*')) {
      if (child.shadowRoot) injectOverrides(child);
    }
  };
  requestAnimationFrame(() => injectOverrides(el));

  return el;
}

(window as any).updateYaml = (yaml: string, format: string) => {
  const tag = DIAGRAM_TAGS[format];
  if (!tag) return;

  const useWorkbench = format === 'case';
  const elementTag = useWorkbench ? 'agency-diagram-workbench' : tag;

  if (!activeElement || activeElement.tagName.toLowerCase() !== elementTag) {
    activeElement = createDiagramElement(elementTag);
  }

  (activeElement as any).yaml = yaml;
};

(window as any).updateTheme = (css: string) => {
  let style = document.getElementById('theme-vars');
  if (!style) {
    style = document.createElement('style');
    style.id = 'theme-vars';
    document.head.appendChild(style);
  }
  style.textContent = css;
};

(window as any).getDiagramTags = () => DIAGRAM_TAGS;

