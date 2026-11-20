import type { WorkStencil, WorkStencilCategory } from './model.js';

export class CategoryIndex {
  private readonly root: MutableCategory = {
    path: '',
    displayName: 'All',
    children: [],
    stencils: [],
  };

  rebuild(stencils: readonly WorkStencil[]): void {
    this.root.children = [];
    this.root.stencils = [];

    for (const stencil of stencils) {
      const segments = stencil.category.split('/');
      let current = this.root;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;
        const path = segments.slice(0, i + 1).join('/');
        let child = current.children.find(c => c.path === path);
        if (!child) {
          child = {
            path,
            displayName: formatDisplayName(segment),
            children: [],
            stencils: [],
          };
          current.children.push(child);
        }
        current = child;
      }

      current.stencils.push(stencil);
    }

    sortCategories(this.root);
  }

  byCategory(path: string): WorkStencilCategory | undefined {
    if (path === '') return this.root;
    return findCategory(this.root, path);
  }

  search(query: string): readonly WorkStencil[] {
    const lower = query.toLowerCase();
    return collectStencils(this.root).filter(
      s =>
        s.name.toLowerCase().includes(lower) ||
        s.displayName.toLowerCase().includes(lower) ||
        s.category.toLowerCase().includes(lower),
    );
  }

  all(): readonly WorkStencilCategory[] {
    return this.root.children;
  }

  allStencils(): readonly WorkStencil[] {
    return collectStencils(this.root);
  }
}

interface MutableCategory {
  path: string;
  displayName: string;
  icon?: string;
  description?: string;
  children: MutableCategory[];
  stencils: WorkStencil[];
}

function findCategory(node: MutableCategory, path: string): MutableCategory | undefined {
  if (node.path === path) return node;
  for (const child of node.children) {
    const found = findCategory(child, path);
    if (found) return found;
  }
  return undefined;
}

function collectStencils(node: MutableCategory): WorkStencil[] {
  const result: WorkStencil[] = [...node.stencils];
  for (const child of node.children) {
    result.push(...collectStencils(child));
  }
  return result;
}

function sortCategories(node: MutableCategory): void {
  node.children.sort((a, b) => a.displayName.localeCompare(b.displayName));
  node.stencils.sort((a, b) => a.displayName.localeCompare(b.displayName));
  for (const child of node.children) {
    sortCategories(child);
  }
}

function formatDisplayName(segment: string): string {
  return segment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
