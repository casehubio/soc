import { resolveTarget } from './command-executor.js';
import type { AriaTarget } from '@casehubio/pages-primitives';

const SPOTLIGHT_STYLE_ID = 'scenario-spotlight-styles';
const BACKDROP_Z = 9998;
const CALLOUT_Z = 9999;
const RING_Z = 9999;
const PADDING = 8;

function injectSpotlightStyles(): void {
  if (document.getElementById(SPOTLIGHT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SPOTLIGHT_STYLE_ID;
  style.textContent = `
    .scenario-spotlight-backdrop {
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: ${BACKDROP_Z};
      transition: clip-path 0.3s ease;
    }
    .scenario-spotlight-ring {
      position: fixed;
      border: 2px solid rgba(56, 189, 248, 0.8);
      border-radius: 4px;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
      z-index: ${RING_Z};
      pointer-events: none;
      animation: scenario-spotlight-pulse 1.5s ease-in-out infinite;
    }
    @keyframes scenario-spotlight-pulse {
      0%, 100% { box-shadow: 0 0 12px rgba(56, 189, 248, 0.4); }
      50% { box-shadow: 0 0 20px rgba(56, 189, 248, 0.6); }
    }
    .scenario-spotlight-callout {
      position: fixed;
      max-width: 320px;
      padding: 12px 16px;
      background: var(--pages-surface-2, #1e1e2e);
      color: var(--pages-neutral-12, #e0e0e0);
      border: 1px solid var(--pages-neutral-6, #444);
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
      z-index: ${CALLOUT_Z};
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }
    @media (prefers-reduced-motion: reduce) {
      .scenario-spotlight-ring { animation: none; }
      .scenario-spotlight-backdrop { transition: none; }
    }
  `;
  document.head.appendChild(style);
}

function clipPathCutout(rects: DOMRect[]): string {
  const cutouts = rects.map(rect => {
    const l = rect.left - PADDING;
    const t = rect.top - PADDING;
    const r = rect.right + PADDING;
    const b = rect.bottom + PADDING;
    return `${l}px ${t}px, ${l}px ${b}px, ${r}px ${b}px, ${r}px ${t}px, ${l}px ${t}px`;
  });
  return `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${cutouts.join(', ')})`;
}

type Position = 'top' | 'right' | 'bottom' | 'left' | 'auto';

function positionCallout(
  callout: HTMLElement,
  rect: DOMRect,
  position: Position,
): void {
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let pos = position;
  if (pos === 'auto') {
    const spaceRight = vw - rect.right;
    const spaceLeft = rect.left;
    const spaceBottom = vh - rect.bottom;
    const spaceTop = rect.top;
    const max = Math.max(spaceRight, spaceLeft, spaceBottom, spaceTop);
    if (max === spaceRight) pos = 'right';
    else if (max === spaceLeft) pos = 'left';
    else if (max === spaceBottom) pos = 'bottom';
    else pos = 'top';
  }

  switch (pos) {
    case 'right':
      callout.style.left = `${rect.right + PADDING + gap}px`;
      callout.style.top = `${rect.top}px`;
      break;
    case 'left':
      callout.style.right = `${vw - rect.left + PADDING + gap}px`;
      callout.style.top = `${rect.top}px`;
      break;
    case 'bottom':
      callout.style.top = `${rect.bottom + PADDING + gap}px`;
      callout.style.left = `${rect.left}px`;
      break;
    case 'top':
      callout.style.bottom = `${vh - rect.top + PADDING + gap}px`;
      callout.style.left = `${rect.left}px`;
      break;
  }
}

export interface SpotlightAlso extends AriaTarget {
  content?: string;
  position?: Position;
}

export interface SpotlightConfig {
  target: AriaTarget;
  content: string;
  position?: Position;
  duration?: number;
  also?: SpotlightAlso[];
}

export function showSpotlight(config: SpotlightConfig): Promise<void> {
  injectSpotlightStyles();

  const el = resolveTarget(config.target);
  const rect = el.getBoundingClientRect();
  const position = config.position ?? 'auto';
  const duration = config.duration ?? 0;

  const allRects = [rect];
  const alsoElements = (config.also ?? []).map(t => resolveTarget(t));
  for (const extra of alsoElements) {
    allRects.push(extra.getBoundingClientRect());
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'scenario-spotlight-backdrop';
  backdrop.style.clipPath = clipPathCutout(allRects);

  const rings: HTMLElement[] = [];
  for (const r of allRects) {
    const ring = document.createElement('div');
    ring.className = 'scenario-spotlight-ring';
    ring.style.left = `${r.left - PADDING}px`;
    ring.style.top = `${r.top - PADDING}px`;
    ring.style.width = `${r.width + PADDING * 2}px`;
    ring.style.height = `${r.height + PADDING * 2}px`;
    rings.push(ring);
  }

  const callouts: HTMLElement[] = [];

  const primaryCallout = document.createElement('div');
  primaryCallout.className = 'scenario-spotlight-callout';
  primaryCallout.setAttribute('role', 'status');
  primaryCallout.setAttribute('aria-live', 'polite');
  primaryCallout.textContent = config.content;
  callouts.push(primaryCallout);

  const alsoConfigs = config.also ?? [];
  for (let i = 0; i < alsoConfigs.length; i++) {
    const alsoConfig = alsoConfigs[i]!;
    if (alsoConfig.content) {
      const c = document.createElement('div');
      c.className = 'scenario-spotlight-callout';
      c.setAttribute('role', 'status');
      c.setAttribute('aria-live', 'polite');
      c.textContent = alsoConfig.content;
      callouts.push(c);
    }
  }

  document.body.appendChild(backdrop);
  for (const ring of rings) document.body.appendChild(ring);
  document.body.appendChild(primaryCallout);
  positionCallout(primaryCallout, rect, position);

  let alsoCalloutIdx = 0;
  for (let i = 0; i < alsoConfigs.length; i++) {
    const alsoConfig = alsoConfigs[i]!;
    if (alsoConfig.content) {
      const c = callouts[1 + alsoCalloutIdx++]!;
      document.body.appendChild(c);
      positionCallout(c, allRects[i + 1]!, alsoConfig.position ?? 'auto');
    }
  }

  return new Promise<void>((resolve) => {
    function dismiss(): void {
      backdrop.remove();
      for (const ring of rings) ring.remove();
      for (const c of callouts) c.remove();
      document.removeEventListener('keydown', onKey);
      resolve();
    }

    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') dismiss();
    }

    backdrop.addEventListener('click', dismiss);
    document.addEventListener('keydown', onKey);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  });
}

export function dismissAllSpotlights(): void {
  document.querySelectorAll('.scenario-spotlight-backdrop')
    .forEach(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}
