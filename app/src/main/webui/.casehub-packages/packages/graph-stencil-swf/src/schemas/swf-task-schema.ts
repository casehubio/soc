export const swfTaskSchema: Record<string, unknown> = {
  $defs: {
    CallTask: {
      type: 'object',
      properties: {
        call: { type: 'string', title: 'Function', 'x-group': 'Identity', 'x-order': 0 },
        with: { type: 'object', title: 'Arguments', 'x-group': 'Configuration', 'x-order': 10 },
        input: { type: 'object', title: 'Input', description: 'jq expression for input filtering', 'x-group': 'Configuration', 'x-order': 11 },
        output: { type: 'object', title: 'Output', description: 'jq expression for output filtering', 'x-group': 'Configuration', 'x-order': 12 },
        timeout: { type: 'object', title: 'Timeout', 'x-group': 'Advanced', 'x-order': 30, 'x-visibility': 'advanced' },
        then: { type: 'string', title: 'Then', 'x-group': 'Behaviour', 'x-order': 20 },
        if: { type: 'string', title: 'Condition', description: 'jq expression', 'x-group': 'Behaviour', 'x-order': 21 },
        metadata: { type: 'object', title: 'Metadata', 'x-group': 'Advanced', 'x-order': 31, 'x-visibility': 'advanced' },
      },
      required: ['call'],
    },
    SetTask: {
      type: 'object',
      properties: {
        set: { type: 'object', title: 'Variables', 'x-group': 'Identity', 'x-order': 0 },
        if: { type: 'string', title: 'Condition', description: 'jq expression', 'x-group': 'Behaviour', 'x-order': 20 },
        then: { type: 'string', title: 'Then', 'x-group': 'Behaviour', 'x-order': 21 },
        metadata: { type: 'object', title: 'Metadata', 'x-group': 'Advanced', 'x-order': 30, 'x-visibility': 'advanced' },
      },
      required: ['set'],
    },
    SwitchTask: {
      type: 'object',
      properties: {
        switch: { type: 'array', title: 'Cases', 'x-group': 'Identity', 'x-order': 0 },
        if: { type: 'string', title: 'Condition', description: 'jq expression', 'x-group': 'Behaviour', 'x-order': 20 },
        then: { type: 'string', title: 'Then', 'x-group': 'Behaviour', 'x-order': 21 },
        metadata: { type: 'object', title: 'Metadata', 'x-group': 'Advanced', 'x-order': 30, 'x-visibility': 'advanced' },
      },
    },
    RaiseTask: {
      type: 'object',
      properties: {
        raise: { type: 'object', title: 'Error', 'x-group': 'Identity', 'x-order': 0 },
        if: { type: 'string', title: 'Condition', description: 'jq expression', 'x-group': 'Behaviour', 'x-order': 20 },
        metadata: { type: 'object', title: 'Metadata', 'x-group': 'Advanced', 'x-order': 30, 'x-visibility': 'advanced' },
      },
      required: ['raise'],
    },
    TryTask: {
      type: 'object',
      properties: {
        if: { type: 'string', title: 'Condition', description: 'jq expression', 'x-group': 'Behaviour', 'x-order': 20 },
        then: { type: 'string', title: 'Then', 'x-group': 'Behaviour', 'x-order': 21 },
        metadata: { type: 'object', title: 'Metadata', 'x-group': 'Advanced', 'x-order': 30, 'x-visibility': 'advanced' },
      },
    },
    TryCatchTask: {
      type: 'object',
      properties: {
        when: { type: 'string', title: 'Error Filter', 'x-group': 'Configuration', 'x-order': 10 },
        as: { type: 'string', title: 'Error Variable', 'x-group': 'Configuration', 'x-order': 11 },
        then: { type: 'string', title: 'Then', 'x-group': 'Behaviour', 'x-order': 20 },
        metadata: { type: 'object', title: 'Metadata', 'x-group': 'Advanced', 'x-order': 30, 'x-visibility': 'advanced' },
      },
    },
  },
};
