import type { InsertionConstraint } from '@casehubio/pages-document';

export interface PaletteContext {
  parentType: string | undefined;
  parentSlot?: string | undefined;
  acceptsComponents: boolean;
  availableDatasets: string[];
  siblingTypes: string[];
  allowedTypes?: InsertionConstraint;
}

export type ContextRelevance = 'promoted' | 'normal' | 'hidden' | 'needs-prereq';
