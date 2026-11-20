import { z } from 'zod';

const parameterTypeEnum = z.enum(['STRING', 'INTEGER', 'NUMBER', 'BOOLEAN', 'ARRAY', 'OBJECT']);

export const parameterSchema = z.object({
  type: parameterTypeEnum.default('STRING').optional(),
  required: z.boolean().default(false).optional(),
  defaultValue: z.string().optional(),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  pattern: z.string().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  allowedValues: z.array(z.string()).optional(),
  constraintDescription: z.string().optional(),
});

export const outputSchema = z.object({
  type: parameterTypeEnum,
  value: z.string(),
});

export const importSchema = z.object({
  module: z.string().optional(),
  actions: z.string().optional(),
  as: z.string(),
  if: z.string().optional(),
  parameters: z.record(z.string(), z.string()).optional(),
  forEach: z.unknown().optional(),
  loop: z.unknown().optional(),
});

export const forEachSchema = z.union([
  z.string(),
  z.object({
    as: z.string(),
    in: z.array(z.string()),
  }),
]);

export const iterationGroupSchema = z.object({
  as: z.string(),
  in: z.union([
    z.array(z.string()),
    z.string(),
  ]),
});

export const dataSourceSchema = z.object({
  inline: z.string().optional(),
});

export const moduleDefinitionSchema = z.object({
  parameters: z.record(z.string(), parameterSchema).optional(),
  outputs: z.record(z.string(), outputSchema).optional(),
  sections: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  extends: z.string().optional(),
});

export const yamlCoreDocumentSchema = z.object({
  variables: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  modules: z.record(z.string(), moduleDefinitionSchema).optional(),
  imports: z.array(importSchema).optional(),
  iterations: z.record(z.string(), iterationGroupSchema).optional(),
  data: z.record(z.string(), dataSourceSchema).optional(),
});

export const yamlCoreElementMixin = {
  forEach: forEachSchema.optional(),
  if: z.string().optional(),
};
