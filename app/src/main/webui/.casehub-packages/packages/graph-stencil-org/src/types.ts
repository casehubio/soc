export type BehavioralSignal = 'DECLINE' | 'SUCCESS' | 'COMPLIANT' | 'VIOLATED';

export interface AgentCapability {
  name: string;
  description?: string;
}

export interface AgentGoal {
  name: string;
  description?: string;
  priority?: string;
  visibility?: string;
}

export interface AgentConstraint {
  name: string;
  description?: string;
  severity?: string;
  visibility?: string;
}

export interface Membership {
  agentId: string;
  role?: string;
  roleVocabulary?: string;
}

export interface RelationshipScope {
  capabilityName?: string;
  domain?: string;
  custom?: string;
}

export interface AttestationGrant {
  dimensions: [string, ...string[]];
  capabilityScope?: string[];
  signalTypes?: BehavioralSignal[];
}

export type RelationshipKind =
  | 'SUPERVISES'
  | 'DELEGATES_TO'
  | 'ESCALATES_TO'
  | 'REPORTS_TO'
  | 'BACKS_UP'
  | 'EXTENDED';

export interface AgentRelationship {
  sourceAgentId: string;
  targetAgentId: string;
  kind: RelationshipKind;
  extendedKind?: string;
  kindVocabulary?: string;
  scope?: RelationshipScope;
  attestation?: AttestationGrant;
  tenancyId: string;
}

export interface OrgUnit {
  unitId: string;
  name: string;
  kind?: string;
  kindVocabulary?: string;
  tenancyId: string;
  parentUnitId?: string;
  members: Membership[];
  capabilities: AgentCapability[];
  goals: AgentGoal[];
  constraints: AgentConstraint[];
}

export interface OrgStructureYaml {
  organization: {
    units: OrgUnit[];
    relationships: AgentRelationship[];
  };
}

export interface DispositionAxes {
  autonomy?: string;
  ruleFollowing?: string;
  socialOrient?: string;
  riskAppetite?: string;
  conflictMode?: string;
}

export interface AgentDescriptor {
  slot?: string;
  capabilities?: AgentCapability[];
  disposition?: Partial<DispositionAxes>;
  goals?: AgentGoal[];
  constraints?: AgentConstraint[];
  briefing?: string;
  avatar?: string;
  profession?: string;
  role?: string;
}

export interface OrgAgentNodeData {
  agentId: string;
  role?: string;
  roleVocabulary?: string;
  unitId: string;
  label: string;
  slot?: string;
  capabilities?: AgentCapability[];
  disposition?: Partial<DispositionAxes>;
  supervisionTargets?: string[];
  escalationChain?: string[];
  backupAgents?: { agentId: string; scope?: string; direction: 'backs' | 'backed-by' }[];
  attestationGrants?: { targetAgentId: string; scope?: string; dimensions: string[]; signalTypes?: string[] }[];
  unitKind?: string;
  unitColorStart?: string;
  unitColorEnd?: string;
  avatar?: string;
  profession?: string;
  descriptorRole?: string;
}

export interface OrgUnitNodeData {
  unitId: string;
  name: string;
  kind?: string;
  kindVocabulary?: string;
  label: string;
  memberCount: number;
  capabilities: AgentCapability[];
  goals: AgentGoal[];
  constraints: AgentConstraint[];
  kindColorStart?: string;
  kindColorEnd?: string;
}
