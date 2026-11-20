export const bindingSchema = {
  type: 'object',
  required: ['on'],
  properties: {
    name: {
      type: 'string',
      'x-group': 'Identity',
      'x-order': 0,
    },
    targetType: {
      'x-group': 'Target',
      'x-order': 11,
      'x-discriminator': '_target',
      oneOf: [
        {
          type: 'object',
          title: 'Capability',
          properties: {
            _target: { type: 'string', const: 'capability' },
            capability: {
              type: 'object',
              properties: {
                name: { type: 'string', 'x-help': 'Capability name reference' },
              },
            },
          },
        },
        {
          type: 'object',
          title: 'SubCase',
          properties: {
            _target: { type: 'string', const: 'subCase' },
            subCase: {
              type: 'object',
              properties: {
                namespace: { type: 'string' },
                name: { type: 'string' },
                version: { type: 'string' },
                completionStrategy: { type: 'string', enum: ['DEFAULT', 'CUSTOM'] },
                waitForCompletion: { type: 'boolean' },
                inputMapping: { type: 'string', 'x-display-hint': 'textarea' },
                outputMapping: { type: 'string', 'x-display-hint': 'textarea' },
              },
            },
          },
        },
        {
          type: 'object',
          title: 'HumanTask',
          properties: {
            _target: { type: 'string', const: 'humanTask' },
            humanTask: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                titleExpression: { type: 'string', 'x-help': 'JQ expression resolving to WorkItem title' },
                templateRef: { type: 'string', 'x-help': 'WorkItemTemplate reference (UUID or name)' },
                inputMapping: { type: 'string', 'x-display-hint': 'textarea', 'x-help': 'JQ: case context → WorkItem payload' },
                outputMapping: { type: 'string', 'x-display-hint': 'textarea', 'x-help': 'JQ: WorkItem resolution → context updates' },
                scope: { type: 'string', 'x-help': 'Hierarchical scope path for SLA preference resolution' },
                scopeExpression: { type: 'string', 'x-help': 'JQ expression resolving to scope path' },
                candidateGroups: { type: 'array', items: { type: 'string' } },
                candidateUsers: { type: 'array', items: { type: 'string' } },
                expiresIn: { type: 'string', 'x-help': 'ISO 8601 duration (e.g. PT24H)' },
                expiresInExpression: { type: 'string', 'x-help': 'JQ expression resolving to ISO-8601 duration' },
                claimDeadlineHours: { type: 'number' },
                expiresAtExpression: { type: 'string', 'x-help': 'JQ expression producing ISO-8601 Instant' },
                outcomes: { type: 'array', items: { type: 'string' }, 'x-help': 'Valid outcome names (e.g. APPROVED, REJECTED)' },
                payloadType: { type: 'string', 'x-help': 'Java class for typed payload validation' },
                resolutionType: { type: 'string', 'x-help': 'Java class for typed resolution validation' },
              },
            },
          },
        },
      ],
    },
    on: {
      'x-group': 'Behaviour',
      'x-order': 20,
      'x-discriminator': 'triggerType',
      oneOf: [
        {
          type: 'object',
          title: 'Context Change',
          properties: {
            contextChange: {
              type: 'object',
              properties: {
                filter: { type: 'string', 'x-display-hint': 'textarea', 'x-help': 'JQ predicate over { context, event }' },
                listenLayer: { type: 'string', 'x-help': 'Only re-evaluate when this layer changes' },
              },
            },
          },
        },
        {
          type: 'object',
          title: 'Cloud Event',
          properties: {
            cloudEvent: {
              type: 'object',
              properties: {
                type: { type: 'string', 'x-help': 'CloudEvent type exact match' },
                source: { type: 'string', 'x-help': 'Optional exact match on CloudEvent source' },
                subject: { type: 'string', 'x-help': 'Optional exact match on CloudEvent subject' },
                filter: { type: 'string', 'x-display-hint': 'textarea', 'x-help': 'JQ predicate over { context, event }' },
              },
            },
          },
        },
        {
          type: 'object',
          title: 'Schedule',
          properties: {
            schedule: {
              type: 'object',
              properties: {
                cron: { type: 'string', 'x-help': 'Cron expression' },
                every: { type: 'string', 'x-help': 'ISO-8601 duration (e.g. PT5M)' },
                timezone: { type: 'string', 'x-help': 'IANA TZ (e.g. America/Vancouver)' },
              },
            },
          },
        },
        {
          type: 'object',
          title: 'Scope Activated',
          properties: {
            scopeActivated: {
              type: 'object',
              properties: {},
            },
          },
        },
      ],
    },
    when: {
      type: 'string',
      'x-group': 'Behaviour',
      'x-order': 21,
      'x-display-hint': 'textarea',
      'x-help': 'JQ filter over context and/or event',
    },
    conflictResolverStrategy: {
      type: 'string',
      enum: ['LAST_WRITER_WINS', 'FIRST_WRITER_WINS', 'FAIL', 'DEEP_MERGE'],
      'x-group': 'Advanced',
      'x-order': 30,
      'x-visibility': 'advanced',
    },
    outcomePolicy: {
      type: 'object',
      'x-group': 'Advanced',
      'x-order': 31,
      'x-visibility': 'advanced',
      properties: {
        onDecline: { type: 'string', enum: ['REROUTE', 'FAULT'] },
        onFailure: { type: 'string', enum: ['REROUTE', 'FAULT'] },
        onExpired: { type: 'string', enum: ['REROUTE', 'FAULT'] },
        maxRerouteAttempts: { type: 'integer', minimum: 0 },
      },
    },
    inputProjectionOverride: {
      type: 'string',
      'x-group': 'Advanced',
      'x-order': 32,
      'x-visibility': 'advanced',
      'x-display-hint': 'textarea',
      'x-help': 'JQ expression overriding capability input projection',
    },
    contextWrite: {
      type: 'object',
      'x-group': 'Advanced',
      'x-order': 33,
      'x-visibility': 'advanced',
      'x-editor-component': 'agency-json-editor',
      'x-help': 'Key-value pairs to write to case context before dispatching',
    },
    producedKeys: {
      type: 'array',
      items: { type: 'string' },
      'x-group': 'Advanced',
      'x-order': 34,
      'x-visibility': 'advanced',
      'x-help': 'Context keys this binding is expected to produce',
    },
    lifecycleScope: {
      type: 'string',
      enum: ['BINDING', 'COMPOUND', 'CASE'],
      'x-group': 'Advanced',
      'x-order': 35,
      'x-visibility': 'advanced',
      'x-help': 'BINDING = single dispatch. COMPOUND = compound duration. CASE = case duration.',
    },
    participation: {
      type: 'string',
      enum: ['PARTICIPANT', 'COMPANION'],
      'x-group': 'Advanced',
      'x-order': 36,
      'x-visibility': 'advanced',
      'x-help': 'PARTICIPANT blocks completion. COMPANION is excluded from completion evaluation.',
    },
    executionMode: {
      type: 'string',
      enum: ['TRANSIENT', 'PERSISTENT', 'REINVOKED'],
      'x-group': 'Advanced',
      'x-order': 37,
      'x-visibility': 'advanced',
      'x-help': 'TRANSIENT = fire-and-forget. PERSISTENT = long-running with mailbox. REINVOKED = re-invoked with accumulated state.',
    },
  },
} as const;
