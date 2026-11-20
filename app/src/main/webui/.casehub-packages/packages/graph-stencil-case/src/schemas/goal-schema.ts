export const goalSchema = {
  type: 'object',
  required: ['name', 'condition'],
  properties: {
    name: {
      type: 'string',
      'x-group': 'Identity',
      'x-order': 0,
    },
    description: {
      type: 'string',
      'x-group': 'Identity',
      'x-order': 1,
    },
    condition: {
      type: 'string',
      'x-group': 'Behaviour',
      'x-order': 20,
      'x-display-hint': 'textarea',
      'x-help': 'JQ expression evaluated against case context',
    },
    kind: {
      type: 'string',
      'x-group': 'Behaviour',
      'x-order': 21,
    },
  },
} as const;
