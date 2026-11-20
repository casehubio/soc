import type { Manifest } from './manifest.js';

export interface PersonalityProfile {
  profession?: string;
  role?: string;
  mbti?: string;
  enneagram?: string;
  disc?: string;
  belbin?: { primary: string; secondaries: string[] };
  sdi?: string;
  bigFive?: Partial<Record<'O' | 'C' | 'E' | 'A' | 'N', 'high' | 'low'>>;
}

export interface FullAgentDescriptor {
  readonly agentId: string;
  readonly name: string;
  readonly tenancyId: string;
  readonly archetypeFamily?: string;
  readonly subArchetype?: string;
  readonly archetypeAdjectives?: readonly string[];
  readonly avatar?: string;
  readonly description?: string;
  readonly personality?: PersonalityProfile;
  readonly manifest?: Manifest;
  readonly preferredAlias?: string;
  readonly profession?: string;
  readonly role?: string;
}
