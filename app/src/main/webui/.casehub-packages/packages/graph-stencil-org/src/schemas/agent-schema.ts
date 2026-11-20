export const orgAgentSchema = {
  type: 'object' as const,
  properties: {
    agentId: { type: 'string', title: 'Agent ID', 'x-order': 0 },
    role: { type: 'string', title: 'Role', 'x-order': 1 },
    roleVocabulary: {
      type: 'string', title: 'Role Vocabulary', 'x-order': 2,
      'x-visibility': 'advanced',
    },
  },
};
