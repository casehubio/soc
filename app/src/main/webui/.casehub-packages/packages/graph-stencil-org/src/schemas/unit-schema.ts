export const orgUnitSchema = {
  type: 'object' as const,
  properties: {
    unitId: { type: 'string', title: 'Unit ID', 'x-order': 0 },
    name: { type: 'string', title: 'Name', 'x-order': 1 },
    kind: { type: 'string', title: 'Kind', 'x-order': 2 },
    kindVocabulary: {
      type: 'string', title: 'Kind Vocabulary', 'x-order': 3,
      'x-visibility': 'advanced',
    },
    tenancyId: {
      type: 'string', title: 'Tenancy', 'x-order': 4,
      'x-visibility': 'advanced',
    },
  },
};
