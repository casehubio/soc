export interface DiffSummary {
  modified: number;
  deleted: number;
  inserted: number;
  currentIdx: number;
  totalDiffs: number;
}

export interface DebateStreamEntry {
  entryType: string;
  content: string;
  round: number;
  agentRole: string;
  timestamp?: string;
  pointId?: string;
  priority?: string;
  scope?: string;
  location?: string;
  commitHash?: string;
  documentPath?: string;
}

export interface Snapshot {
  label: string;
  round: number;
  commitHash: string;
  documentPath: string;
}

export interface TrailHighlight {
  raiseRound: number | null;
  fixRound: number | null;
  verifyRound: number | null;
}

export interface BrainstormOptionData {
  id: string;
  title: string;
  description: string;
  tradeoffs: string;
  status: string;
}

export interface OptionsPayload {
  sessionId: string;
  options: BrainstormOptionData[];
  state: string;
}

export interface ConvergedPayload extends OptionsPayload {
  selectedOptionId: string;
}

export interface BrainstormSessionInfo {
  sessionId: string;
  state: string;
  optionCount: string;
}

export interface WorkspaceProgressPayload {
  type: string;
  agent?: string;
  message?: string;
  elapsed?: number;
  cost?: number;
  round?: number;
  cumulativeCost?: number;
  count?: number;
  cached?: boolean;
  finalState?: string;
}

export interface ContextUsagePayload {
  windowSizeChars?: number;
  effectivePercent: number;
  thresholdExceeded?: boolean;
  serverContributionChars?: number;
  messageCount?: number;
  agentReportedPercent?: number | null;
}

export interface DocEntry {
  path: string;
  label?: string;
}

export interface Comparison {
  pathA: string | null;
  pathB: string | null;
}

export interface ThreadStreamEntry {
  threadId: string;
  threadAction: string;
  content: string;
  agentRole: string;
  sender?: string;
  timestamp?: string;
  anchor?: ThreadAnchor;
}

export interface ThreadAnchor {
  side: string;
  startLine: number;
  endLine: number;
  selectedText: string;
}

export interface ThreadInfo {
  threadId: string;
  anchor: ThreadAnchor;
  status: string;
  entries: ThreadStreamEntry[];
  createdBy: string;
}

export interface PipelineProgressPayload {
  pipelineId: string;
  phase: string;
  checkpointStatus: string;
  ordered: boolean;
  dimensions: PipelineDimension[];
}

export interface PipelineDimension {
  name: string;
  status: string;
  currentRound: number;
  totalRounds: number;
  degree: string;
  issuesByPriority: Record<string, number>;
  cost: number;
  elapsed: number;
  findingsCount: number;
}

export interface PipelineDecisionPayload {
  pipelineId: string;
  decisions: PipelineDecisionData[];
}

export interface PipelineDecisionData {
  id: string;
  title: string;
  choice: string;
  alternatives: string[];
  rationale: string;
  tradeoffs: string;
  status: string;
  exploration: string;
}
