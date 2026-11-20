import { z } from 'zod';

const documentInfoSchema = z.object({
  dsl: z.string().optional(),
  namespace: z.string().optional(),
  name: z.string().optional(),
  version: z.string().optional(),
}).passthrough();

const callTaskSchema = z.object({
  call: z.enum(['http', 'grpc', 'asyncapi', 'openapi']),
  with: z.record(z.string(), z.unknown()).optional(),
  output: z.unknown().optional(),
  then: z.string().optional(),
  if: z.string().optional(),
});

const setTaskSchema = z.object({
  set: z.record(z.string(), z.unknown()),
  then: z.string().optional(),
  if: z.string().optional(),
});

const switchCaseSchema = z.record(z.string(), z.object({
  when: z.string().optional(),
  then: z.string().optional(),
}));

const switchTaskSchema = z.object({
  switch: z.array(switchCaseSchema),
  then: z.string().optional(),
  if: z.string().optional(),
});

const raiseTaskSchema = z.object({
  raise: z.object({
    error: z.object({
      type: z.string(),
      status: z.number().optional(),
      title: z.string().optional(),
      detail: z.string().optional(),
    }),
  }),
  then: z.string().optional(),
  if: z.string().optional(),
});

const emitTaskSchema = z.object({
  emit: z.object({
    event: z.object({
      type: z.string(),
      source: z.string().optional(),
      data: z.unknown().optional(),
    }),
  }),
  then: z.string().optional(),
  if: z.string().optional(),
});

const waitTaskSchema = z.object({
  wait: z.union([z.string(), z.number()]),
  then: z.string().optional(),
  if: z.string().optional(),
});

const listenTaskSchema = z.object({
  listen: z.object({
    to: z.object({
      any: z.array(z.object({ type: z.string() })).optional(),
      all: z.array(z.object({ type: z.string() })).optional(),
    }),
  }),
  then: z.string().optional(),
  if: z.string().optional(),
});

const taskDefinitionSchema = z.union([
  callTaskSchema,
  setTaskSchema,
  switchTaskSchema,
  raiseTaskSchema,
  emitTaskSchema,
  waitTaskSchema,
  listenTaskSchema,
]);

export const swfDocumentSchema = z.object({
  document: documentInfoSchema.optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  do: z.array(z.record(z.string(), taskDefinitionSchema)),
  use: z.unknown().optional(),
  timeout: z.unknown().optional(),
  schedule: z.unknown().optional(),
}).passthrough();
