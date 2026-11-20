import { getAccessibleName } from './accessible-name.js';
import { getAriaState } from './aria-state.js';

const IMPLICIT_ROLES: Record<string, string> = {
  BUTTON: 'button',
  INPUT: 'textbox',
  SELECT: 'listbox',
  TEXTAREA: 'textbox',
  A: 'link',
  NAV: 'navigation',
  MAIN: 'main',
  HEADER: 'banner',
  FOOTER: 'contentinfo',
  FORM: 'form',
  TABLE: 'table',
  UL: 'list',
  OL: 'list',
  LI: 'listitem',
};

function getRole(element: Element): string | null {
  return element.getAttribute('role') ?? IMPLICIT_ROLES[element.tagName] ?? null;
}

function walkTree(root: Element | ShadowRoot, visitor: (el: Element) => boolean): void {
  const children = root instanceof Element && root.shadowRoot
    ? root.shadowRoot.children
    : root.children;

  for (const child of Array.from(children)) {
    if (!(child instanceof Element)) continue;
    const stop = visitor(child);
    if (stop) return;

    if (child.shadowRoot) {
      walkTree(child.shadowRoot, visitor);
    }
    if (child.children.length > 0) {
      walkTree(child, visitor);
    }
  }
}

export function findByRole(role: string, name: string, scope?: Element): Element | null {
  const root = scope ?? document.body;
  let found: Element | null = null;

  walkTree(root, (el) => {
    if (getRole(el) === role && getAccessibleName(el) === name) {
      found = el;
      return true;
    }
    return false;
  });

  return found;
}

export function findAllByRole(role: string, name?: string, scope?: Element): Element[] {
  const root = scope ?? document.body;
  const results: Element[] = [];

  walkTree(root, (el) => {
    const elRole = getRole(el);
    if (elRole === role && (name === undefined || getAccessibleName(el) === name)) {
      results.push(el);
    }
    return false;
  });

  return results;
}

export { getAccessibleName, getAriaState };
