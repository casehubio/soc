import type { TableColumnConfig, ColumnRenderer } from '@casehubio/pages-table';
import type { TemplateResult } from 'lit';

export type ColumnConfig = TableColumnConfig;
export type { ColumnRenderer };
export type DetailRenderer = (entity: EntityInstance) => TemplateResult;

export interface EntityInstance {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly summary: string;
  readonly state: Record<string, unknown>;
  readonly availableCommands: readonly CommandDescriptor[];
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface CommandDescriptor {
  readonly name: string;
  readonly label: string;
  readonly description?: string;
  readonly parameters?: readonly ParameterDescriptor[];
  readonly confirmation?: boolean;
  readonly confirmMessage?: string;
  readonly severity?: 'normal' | 'destructive';
  readonly endpoint: string;
  readonly method?: string;
}

export interface ParameterDescriptor {
  readonly name: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'select';
  readonly required?: boolean;
  readonly options?: readonly SelectOption[];
  readonly defaultValue?: unknown;
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface EntityTypeRegistration {
  readonly type: string;
  readonly label: string;
  readonly icon?: string;
  readonly listEndpoint: string;
  readonly detailEndpoint: (id: string) => string;
  readonly columnConfig: readonly ColumnConfig[];
  readonly columnRenderers?: Record<string, ColumnRenderer>;
  readonly detailRenderer?: DetailRenderer;
  readonly detailRendererMap?: Record<string, string | DetailRenderer>;
  readonly relationships?: readonly RelationshipDeclaration[];
  readonly filters?: readonly FilterDescriptor[];
  readonly subTypes?: readonly string[];
  readonly treeEndpoint?: (rootId: string) => string;
  readonly eventTopics?: readonly string[];
  readonly reader?: EntityReader;
  readonly responseReader?: ResponseReader;
}

export interface RelationshipDeclaration {
  readonly childType: string;
  readonly label: string;
  readonly endpointTemplate: string;
}

export interface EntityListResponse {
  readonly entities: readonly EntityInstance[];
  readonly nextCursor?: string;
  readonly totalCount?: number;
}

export interface FilterDescriptor {
  readonly field: string;
  readonly label: string;
  readonly type: 'text' | 'select' | 'date-range' | 'status';
  readonly options?: readonly SelectOption[];
}

export interface NavigationState {
  currentEntityType: string;
  selectedEntityId: string | null;
  viewMode: 'list' | 'tree';
  breadcrumbs: readonly BreadcrumbEntry[];
  availableEntityTypes: readonly EntityTypeRegistration[];
}

export interface BreadcrumbEntry {
  readonly entityType: string;
  readonly entityId: string;
  readonly label: string;
  readonly listEndpoint: string;
}

export interface EntitySelection {
  readonly id: string;
  readonly type: string;
}

export interface EntityTreeNode {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly status: string;
  readonly icon?: string;
  readonly children?: readonly EntityTreeNode[];
  readonly childrenEndpoint?: string;
  readonly childCount?: number;
  readonly groupInfo?: GroupInfo;
}

export interface GroupInfo {
  readonly groupId: string;
  readonly totalInGroup: number;
  readonly requiredCount: number;
  readonly completedCount: number;
}

export interface EntityEvent {
  readonly entityType: string;
  readonly entityId: string;
  readonly eventType: string;
  readonly data?: Record<string, unknown>;
  readonly timestamp: string;
}

export interface EntityReader<T = any> {
  id: (entity: T) => string;
  type?: (entity: T) => string;
  summary: (entity: T) => string;
  status: (entity: T) => string;
  createdAt?: (entity: T) => string;
  updatedAt?: (entity: T) => string;
  state?: (entity: T) => Record<string, unknown>;
  commands?: (entity: T) => readonly CommandDescriptor[];
}

export interface ResponseReader<T = any> {
  entities: (response: any) => readonly T[];
  nextCursor?: (response: any) => string | undefined;
  totalCount?: (response: any) => number | undefined;
}
