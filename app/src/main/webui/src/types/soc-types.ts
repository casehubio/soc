export interface IncidentSummary {
  id: string;
  status: string;
  severity: string;
  source: string;
  title: string;
  createdAt: string;
}

export interface TimelineEntry {
  stepType: string;
  timestamp: string;
  summary: string;
  actor: string;
}

export interface IocEntry {
  type: string;
  value: string;
  confidence: number;
  source: string;
  firstSeen: string;
  tags: string[];
}

export interface AttckTechnique {
  id: string;
  name: string;
  tactic: string;
  confidence: number;
  evidence: string;
}

export interface HeatmapCell {
  source: string;
  severity: string;
  time: string;
  count: number;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  sources: string[];
  severities: string[];
}

export interface MetricDefinition {
  label: string;
  value: string | number;
  unit: string;
  trend: number[];
}
