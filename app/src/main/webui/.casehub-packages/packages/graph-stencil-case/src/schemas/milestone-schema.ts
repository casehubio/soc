export const milestoneSchema = {
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
    entryCriteria: {
      type: 'string',
      'x-group': 'Behaviour',
      'x-order': 21,
    },
    slaDuration: {
      type: 'string',
      'x-group': 'Advanced',
      'x-order': 30,
      'x-visibility': 'advanced',
      'x-help': 'ISO 8601 duration (e.g. PT24H)',
    },
    slaStartFrom: {
      type: 'string',
      enum: ['CASE_CREATED', 'MILESTONE_ACTIVATED', 'PREVIOUS_MILESTONE_COMPLETED', 'EVENT_OCCURRED'],
      'x-group': 'Advanced',
      'x-order': 31,
      'x-visibility': 'advanced',
    },
  },
} as const;
