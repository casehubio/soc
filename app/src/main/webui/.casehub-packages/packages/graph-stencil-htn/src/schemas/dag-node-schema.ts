export const dagNodeSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      readOnly: true,
      'x-group': 'Identity',
      'x-order': 0,
    },
    taskId: {
      type: 'string',
      readOnly: true,
      'x-group': 'Identity',
      'x-order': 1,
    },
    taskDescription: {
      type: 'string',
      'x-group': 'Identity',
      'x-order': 2,
    },
    executorName: {
      type: 'string',
      'x-group': 'Configuration',
      'x-order': 10,
    },
    joinType: {
      type: 'string',
      enum: ['ALL_OF', 'ANY_OF'],
      'x-group': 'Configuration',
      'x-order': 11,
    },
    dependsOn: {
      type: 'array',
      items: { type: 'string' },
      readOnly: true,
      'x-group': 'Configuration',
      'x-order': 12,
    },
  },
} as const;
