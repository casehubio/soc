export interface TabDefinition {
  id: string;
  label: string;
  tagName: string;
  icon?: string;
  order?: number;
  badge?: (item: unknown) => string | null;
  renderContent?: (item: unknown) => unknown;
}
