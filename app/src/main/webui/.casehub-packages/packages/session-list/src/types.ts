export type SessionStatus = 'ACTIVE' | 'WAITING' | 'IDLE';

export interface SessionResponse {
  id: string;
  name: string;
  workingDir: string;
  command: string;
  status: SessionStatus;
  createdAt: string;
  lastActive: string;
  wsUrl: string;
  browserUrl: string;
  instanceUrl?: string;
  instanceName?: string;
  stale?: boolean;
  expiryPolicy?: string;
  caseId?: string;
  roleName?: string;
}

export interface CreateSessionRequest {
  name: string;
  workingDir?: string;
  command?: string;
  expiryPolicy?: string;
}

export interface GitStatusResponse {
  gitRepo: boolean;
  githubRepo?: string;
  branch?: string;
  pr?: PrInfo | null;
  error?: string;
}

export interface PrInfo {
  number: number;
  title: string;
  url: string;
  state: string;
  checksTotal: number;
  checksPassed: number;
  checksFailed: number;
  checksPending: number;
}

export interface PortStatus {
  port: number;
  up: boolean;
  responseMs: number;
}

export const SessionEventTopics = {
  SELECTED: 'session:selected',
  DESELECTED: 'session:deselected',
  CHANGED: 'session:changed',
  REFRESH: 'session:refresh',
} as const;
