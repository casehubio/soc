import type { FormatRegistration } from '@casehubio/pages-lsp';
import { htnDocumentSchema } from '../schemas/htn.generated.js';

export const htnFormat: FormatRegistration = {
  formatId: 'htn',
  extensions: ['.htn.yaml'],
  contentDetector: (inspector) =>
    inspector.hasKey(['dsl']) &&
    inspector.hasKey(['spec']) &&
    inspector.hasKey(['spec', 'decomposition']),
  documentSchema: htnDocumentSchema,
};
