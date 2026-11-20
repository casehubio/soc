export const swfTaskSchema: Record<string, unknown> = {
  $defs: {
    CallTask: {
      type: 'object',
      properties: {
        call: { type: 'string', title: 'Function' },
        with: { type: 'object', title: 'Arguments' },
        input: { type: 'object', title: 'Input', description: 'jq expression for input filtering' },
        output: { type: 'object', title: 'Output', description: 'jq expression for output filtering' },
        timeout: { type: 'object', title: 'Timeout' },
        then: { type: 'string', title: 'Then' },
        if: { type: 'string', title: 'Condition', description: 'jq expression' },
        metadata: { type: 'object', title: 'Metadata' },
      },
      required: ['call'],
    },
    SetTask: {
      type: 'object',
      properties: {
        set: { type: 'object', title: 'Variables' },
        if: { type: 'string', title: 'Condition', description: 'jq expression' },
        then: { type: 'string', title: 'Then' },
        metadata: { type: 'object', title: 'Metadata' },
      },
      required: ['set'],
    },
    SwitchTask: {
      type: 'object',
      properties: {
        switch: { type: 'array', title: 'Cases' },
        if: { type: 'string', title: 'Condition', description: 'jq expression' },
        then: { type: 'string', title: 'Then' },
        metadata: { type: 'object', title: 'Metadata' },
      },
    },
    RaiseTask: {
      type: 'object',
      properties: {
        raise: { type: 'object', title: 'Error' },
        if: { type: 'string', title: 'Condition', description: 'jq expression' },
        metadata: { type: 'object', title: 'Metadata' },
      },
      required: ['raise'],
    },
    TryTask: {
      type: 'object',
      properties: {
        if: { type: 'string', title: 'Condition', description: 'jq expression' },
        then: { type: 'string', title: 'Then' },
        metadata: { type: 'object', title: 'Metadata' },
      },
    },
    TryCatchTask: {
      type: 'object',
      properties: {
        when: { type: 'string', title: 'Error Filter' },
        as: { type: 'string', title: 'Error Variable' },
        then: { type: 'string', title: 'Then' },
        metadata: { type: 'object', title: 'Metadata' },
      },
    },
  },
};
