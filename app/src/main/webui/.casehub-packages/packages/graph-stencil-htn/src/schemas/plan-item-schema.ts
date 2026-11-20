export const primitivePlanItemSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      'x-group': 'Identity',
      'x-order': 0,
    },
    executor: {
      type: 'object',
      'x-group': 'Configuration',
      'x-order': 10,
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['name'],
    },
    entryCondition: {
      type: 'string',
      'x-group': 'Behaviour',
      'x-order': 20,
      'x-display-hint': 'textarea',
    },
  },
} as const;

export const compoundPlanItemSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      'x-group': 'Identity',
      'x-order': 0,
    },
    completion: {
      type: 'object',
      'x-group': 'Configuration',
      'x-order': 10,
      properties: {
        kind: { type: 'string', enum: ['All', 'MOfN', 'FirstWins'] },
        m: { type: 'integer', minimum: 1, 'x-help': 'Required count for MOfN' },
      },
    },
    dispatchMode: {
      type: 'string',
      enum: ['ORCHESTRATED', 'CHOREOGRAPHED'],
      'x-group': 'Configuration',
      'x-order': 11,
    },
    repeatable: {
      type: 'boolean',
      'x-group': 'Configuration',
      'x-order': 12,
    },
    entryCondition: {
      type: 'string',
      'x-group': 'Behaviour',
      'x-order': 20,
      'x-display-hint': 'textarea',
    },
    exitCondition: {
      type: 'string',
      'x-group': 'Behaviour',
      'x-order': 21,
      'x-display-hint': 'textarea',
    },
    planningStrategy: {
      type: 'string',
      'x-group': 'Advanced',
      'x-order': 30,
      'x-visibility': 'advanced',
    },
    scopedBindings: {
      type: 'object',
      'x-group': 'Advanced',
      'x-order': 31,
      'x-visibility': 'advanced',
      'x-editor-component': 'agency-json-editor',
      'x-help': 'Binding name → Participation (PARTICIPANT / COMPANION)',
    },
  },
} as const;
