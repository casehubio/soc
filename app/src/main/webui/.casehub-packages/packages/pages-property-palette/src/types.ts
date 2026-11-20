import type { FieldSchema } from '@casehubio/pages-component';
import type { TemplateResult } from 'lit';

export interface PropertyPaletteSource {
  readonly schema: FieldSchema;
  readonly data: Record<string, unknown>;
  readonly readonly?: boolean;
  onChange(field: (string | number)[], value: unknown): void;
}

export interface FieldRenderContext {
  key: string;
  schema: FieldSchema;
  value: unknown;
  required: boolean;
  readonly: boolean;
  error: string | undefined;
  onChange: (value: unknown) => void;
}

export type EditorDescriptor =
  | { kind: 'tag'; tag: string; config?: Record<string, unknown> }
  | { kind: 'render'; render: (ctx: FieldRenderContext) => TemplateResult };

export type EditorResolver = (schema: FieldSchema) => EditorDescriptor | undefined;
