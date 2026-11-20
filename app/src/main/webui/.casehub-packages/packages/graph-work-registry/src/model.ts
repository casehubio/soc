import type { JSONSchema7 } from 'json-schema';
import type { PropertySchema } from '@casehubio/graph-core';

export interface WorkStencil {
  readonly name: string;
  readonly displayName: string;
  readonly category: string;
  readonly icon: string;
  readonly async: boolean;
  readonly properties: PropertySchema;
  readonly input: JSONSchema7;
  readonly output: JSONSchema7;
}

export interface WorkStencilCategory {
  readonly path: string;
  readonly displayName: string;
  readonly icon?: string;
  readonly description?: string;
  readonly children: readonly WorkStencilCategory[];
  readonly stencils: readonly WorkStencil[];
}

export interface MarketplaceDescriptor {
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly stencils: readonly WorkStencilDescriptorYaml[];
}

export interface WorkStencilDescriptorYaml {
  readonly name: string;
  readonly displayName: string;
  readonly category: string;
  readonly icon: string;
  readonly async?: boolean;
  readonly properties?: Record<string, unknown>;
  readonly input?: Record<string, unknown>;
  readonly output?: Record<string, unknown>;
}
