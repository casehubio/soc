export type DimensionSeverity = 'OK' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DimensionView {
  readonly type: string;
  readonly label: string;
  readonly status: string;
  readonly severity: DimensionSeverity;
  readonly activeResponses: number;
  readonly lastUpdated?: string;
}

export interface DimensionDashboardData {
  readonly serviceId: string;
  readonly serviceName: string;
  readonly overallHealth: string;
  readonly dimensions: DimensionView[];
}
