import type { StateCategory } from './status-registry.js';

export interface CategoryStyle {
  readonly background: string;
  readonly color: string;
}

const CATEGORY_STYLES: Record<StateCategory, CategoryStyle> = {
  active:   { background: 'var(--pages-accent-3, #e0e7ff)',  color: 'var(--pages-accent-11, #3730a3)' },
  info:     { background: 'var(--pages-info-3, #dbeafe)',    color: 'var(--pages-info-11, #1e40af)' },
  success:  { background: 'var(--pages-success-3, #d1fae5)', color: 'var(--pages-success-11, #065f46)' },
  danger:   { background: 'var(--pages-danger-3, #fee2e2)',  color: 'var(--pages-danger-11, #991b1b)' },
  neutral:  { background: 'var(--pages-neutral-3, #e5e5e5)', color: 'var(--pages-neutral-9, #737373)' },
  transfer: { background: 'var(--pages-info-3, #dbeafe)',    color: 'var(--pages-info-11, #1e40af)' },
  warning:  { background: 'var(--pages-warning-3, #fef3c7)', color: 'var(--pages-warning-11, #92400e)' },
};

export function stateCategoryStyles(category: StateCategory): CategoryStyle {
  return CATEGORY_STYLES[category];
}
