// TS mirrors of Java types from platform-agent-config-core-0.2-SNAPSHOT
// Source: casehub-platform-agent-config-core (decompiled bytecode)
// Verified against parent epic spec (issue-166-agent-setup-wizard)

export type ModelTier = 'FLAGSHIP' | 'STANDARD' | 'FAST' | 'EMBEDDING';
export type ModelLocality = 'CLOUD' | 'LOCAL' | 'HYBRID';
export type CostTier = 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PREMIUM';

export interface ProviderDeclaration {
  vendor: string;
  credential?: string | Record<string, string>;
  host?: string;
}

export interface ModelDescriptor {
  id: string;
  apiModelId?: string;
  backendKey?: string;
  backendInstanceId?: string;
  vendor?: string;
  family?: string;
  displayName?: string;
  tier?: ModelTier;
  capabilities?: string[];
  contextWindow?: number;
  maxOutput?: number;
  locality?: ModelLocality;
  costTier?: CostTier;
  authMethod?: string;
  properties?: Record<string, string>;
}

export interface AliasDeclaration {
  tier?: ModelTier;
  capabilities?: string[];
  locality?: ModelLocality;
  maxCost?: CostTier;
  minContext?: number;
  minOutput?: number;
  preferVendor?: string;
}

export interface SourceDeclaration {
  uri: string;
  priority?: number;
}

export interface LocalModelDeclaration {
  id: string;
  backendKey?: string;
  host?: string;
}

export interface ManifestDefaults {
  backend?: string;
}

export interface Manifest {
  providers?: ProviderDeclaration[];
  models?: ModelDescriptor[];
  aliases?: Record<string, AliasDeclaration>;
  defaults?: ManifestDefaults;
  sources?: SourceDeclaration[];
  localModels?: LocalModelDeclaration[];
}

export type CredentialRef =
  | { type: 'env'; name: string }
  | { type: 'file'; path: string }
  | { type: 'ref'; name: string };
