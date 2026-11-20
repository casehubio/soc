import { z } from 'zod';
import { dashboardSchema } from '@casehubio/pages-schema';
import { yamlCoreDocumentSchema } from '@casehubio/yaml-core/schema';
import type { FormatRegistration } from '../types.js';
import { pageSymbolExtractor } from '../refactoring/page-symbols.js';

export const pageFormat: FormatRegistration = {
  formatId: 'page',
  extensions: ['.page.yaml'],
  contentDetector: (inspector) =>
    inspector.hasKey(['pages']) || inspector.hasKey(['datasets'])
    || inspector.hasKey(['modules']) || inspector.hasKey(['imports']),
  documentSchema: z.intersection(yamlCoreDocumentSchema, dashboardSchema),
  symbolExtractor: pageSymbolExtractor,
};
