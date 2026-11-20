export type EntryCategory = 'neutral' | 'success' | 'warning' | 'error' | 'accent';

const COLOURS: Record<EntryCategory, string> = {
  neutral: 'var(--pages-neutral-12, #111)',
  success: 'var(--pages-success-9, #16a34a)',
  warning: 'var(--pages-warning-9, #d97706)',
  error: 'var(--pages-error-9, #dc2626)',
  accent: 'var(--pages-accent-9, #6366f1)',
};

export function statusBorderColour(category: EntryCategory): string {
  return COLOURS[category] ?? COLOURS.neutral;
}
