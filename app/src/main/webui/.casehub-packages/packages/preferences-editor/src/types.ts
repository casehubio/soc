export interface ScopeNode {
  readonly path: string;
  readonly label: string;
  readonly children?: readonly ScopeNode[];
}

export interface EnumOption {
  readonly value: string;
  readonly label: string;
}

export interface PreferenceSchemaDescriptor {
  readonly namespace: string;
  readonly name: string;
  readonly qualifiedName: string;
  readonly type: string;
  readonly label: string;
  readonly description: string | null;
  readonly defaultValue: string;
  readonly multiValue: boolean;
  readonly constraints: Record<string, unknown>;
  readonly options: readonly EnumOption[];
}

export interface PreferenceRecord {
  readonly tenancyId: string;
  readonly scope: string;
  readonly namespace: string;
  readonly name: string;
  readonly subKey: string;
  readonly value: string;
}

export interface PreferenceInput {
  readonly namespace: string;
  readonly name: string;
  readonly subKey: string;
  readonly value: string;
}

export type InheritanceState = 'local' | 'inherited' | 'overridden' | 'default';

export interface PreferenceRow {
  readonly id: string;
  readonly parentId: string;
  readonly rowType: 'scope' | 'preference';
  readonly label: string;
  readonly value: string;
  readonly schemaType: string;
  readonly inheritanceState: InheritanceState;
  readonly sourceScope: string;
  readonly qualifiedName: string;
  readonly scope: string;
}
