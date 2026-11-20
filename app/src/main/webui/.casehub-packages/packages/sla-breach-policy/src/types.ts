export interface TierDefinition {
  readonly threshold: number;
  readonly label: string;
  readonly consequence: string;
  readonly regulation?: string;
}
