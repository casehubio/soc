export const htnCompoundSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', 'x-group': 'Identity', 'x-order': 0 },
  },
} as const;

export const htnMethodSchema = {
  type: 'object',
  properties: {
    guardLabel: { type: 'string', 'x-group': 'Condition', 'x-order': 0 },
    guard: { type: 'string', 'x-group': 'Condition', 'x-order': 1, 'x-display-hint': 'textarea' },
    strategy: { type: 'string', 'x-group': 'Configuration', 'x-order': 10 },
    estimatedCost: { type: 'number', 'x-group': 'Configuration', 'x-order': 11 },
    estimatedDuration: { type: 'string', 'x-group': 'Configuration', 'x-order': 12 },
  },
} as const;

export const htnLeafSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', 'x-group': 'Identity', 'x-order': 0 },
    capability: { type: 'string', 'x-group': 'Identity', 'x-order': 1, 'x-help': 'Capability reference' },
    definitionRef: { type: 'string', 'x-group': 'Definition', 'x-order': 10, 'x-help': 'Reference to diagram definition' },
  },
} as const;
