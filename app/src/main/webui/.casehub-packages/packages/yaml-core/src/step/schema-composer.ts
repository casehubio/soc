import type { Catalog } from './walker.js';

const DECORATOR_KEYS = [
  'if', 'on-success', 'on-failure', 'forEach', 'loop',
  'retry', 'timeout', 'delay', 'on-error', 'trigger',
  'transform', 'signal', 'publish', 'transition',
  'semaphore', 'mutex', 'barrier', 'quorum',
  'at', 'on-complete', 'resource', 'priority', 'wait',
  'from', 'cancel', 'background',
  'advance-after', 'cancel-remaining', 'collection-timeout',
];

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SchemaComposer {
  static compose(catalog: Catalog): Record<string, unknown> {
    const oneOf: Record<string, unknown>[] = [];

    for (const actionName of catalog.availableActions()) {
      const entry = catalog.resolve(actionName);
      if (!entry) continue;
      const properties: Record<string, unknown> = {
        [actionName]: { type: 'object' },
        step: { type: 'string' },
      };
      for (const dk of DECORATOR_KEYS) properties[dk] = {};
      const inputProps: Record<string, unknown> = {};
      for (const [name, param] of Object.entries(entry.definition.inputs)) {
        inputProps[name] = { type: stepParamTypeToJsonSchema(param.type) };
      }
      if (Object.keys(inputProps).length > 0) {
        properties[actionName] = { type: 'object', properties: inputProps };
      }
      oneOf.push({ type: 'object', properties, required: [actionName] });
    }

    oneOf.push({ type: 'object', properties: { invoke: { type: 'object' }, step: { type: 'string' } }, required: ['invoke'] });
    oneOf.push({ type: 'object', properties: { block: { type: 'array' }, step: { type: 'string' } }, required: ['block'] });
    oneOf.push({
      type: 'object',
      properties: { if: { type: 'string' }, then: { type: 'array' }, else: { type: 'array' }, step: { type: 'string' } },
      required: ['if', 'then'],
    });
    oneOf.push({
      type: 'object',
      properties: { match: { type: 'string' }, cases: { type: 'array' }, step: { type: 'string' } },
      required: ['match', 'cases'],
    });
    oneOf.push({
      type: 'object',
      properties: {
        parallel: { oneOf: [{ type: 'array' }, { type: 'object' }] },
        step: { type: 'string' },
        'advance-after': { type: 'integer' },
        'cancel-remaining': { type: 'boolean' },
        'collection-timeout': { type: 'string' },
      },
      required: ['parallel'],
    });
    oneOf.push({ type: 'object', properties: { race: { type: 'array' }, step: { type: 'string' } }, required: ['race'] });

    for (const dk of ['forEach', 'retry', 'timeout', 'when', 'mutex', 'loop']) {
      const structuralProps: Record<string, unknown> = {
        [dk]: { oneOf: [{ type: 'object' }, { type: 'array' }] },
        step: { type: 'string' },
      };
      for (const otherDk of DECORATOR_KEYS) {
        if (otherDk !== dk) structuralProps[otherDk] = {};
      }
      oneOf.push({ type: 'object', properties: structuralProps, required: [dk] });
    }

    const sharedProps: Record<string, unknown> = { step: { type: 'string' } };
    for (const dk of DECORATOR_KEYS) sharedProps[dk] = {};

    return { type: 'object', oneOf, properties: sharedProps };
  }
}

function stepParamTypeToJsonSchema(type: string): string {
  switch (type) {
    case 'STRING': return 'string';
    case 'INTEGER': return 'integer';
    case 'NUMBER': return 'number';
    case 'BOOLEAN': return 'boolean';
    case 'ARRAY': return 'array';
    case 'OBJECT': return 'object';
    default: return 'string';
  }
}
