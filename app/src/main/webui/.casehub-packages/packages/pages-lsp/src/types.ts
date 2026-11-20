import type { z } from 'zod';
import type { SymbolOccurrence } from './refactoring/types.js';

export interface DocumentInspector {
  hasKey(path: string[]): boolean;
  getKeys(path?: string[]): string[];
}

export interface VariantDispatch {
  strategy: 'discriminator-field' | 'key-presence';
  field?: string;
  variants: Map<string, z.ZodType>;
}

export interface RefactoringCaps {
  rename?: boolean;
  extract?: boolean;
  move?: boolean;
  inline?: boolean;
}

export interface FormatRegistration {
  formatId: string;
  extensions: string[];
  contentDetector?: (inspector: DocumentInspector) => boolean;
  documentSchema: z.ZodType;
  variantDispatchers?: Map<string, VariantDispatch>;
  refactoringCapabilities?: RefactoringCaps;
  symbolExtractor?: (content: string) => SymbolOccurrence[];
}

export interface SchemaRegistry {
  register(format: FormatRegistration): void;
  detect(uri: string, content: string): FormatRegistration | undefined;
  getSchema(formatId: string): z.ZodType;
  getVariantSchema(
    formatId: string,
    path: string,
    variantKey: string,
  ): z.ZodType | undefined;
}
