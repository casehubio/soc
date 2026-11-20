const authConfigSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['none', 'bearer', 'api-key'] },
    tokenConfigKey: { type: 'string', 'x-help': 'Config key for the auth token' },
  },
} as const;

const providerModelSchema = (provider: string) => ({
  type: 'object' as const,
  title: provider,
  properties: {
    _provider: { type: 'string' as const, const: provider },
    modelName: { type: 'string' as const },
    apiKey: { type: 'string' as const },
    temperature: { type: 'number' as const, minimum: 0, maximum: 2 },
    maxTokens: { type: 'integer' as const, minimum: 1 },
    topP: { type: 'number' as const, minimum: 0, maximum: 1 },
  },
  required: ['modelName'] as const,
});

export const workerSchema = {
  type: 'object',
  required: ['name', 'capabilities'],
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
    capabilities: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      'x-group': 'Configuration',
      'x-order': 10,
    },
    functionType: {
      'x-group': 'Function',
      'x-order': 18,
      'x-discriminator': '_type',
      oneOf: [
        {
          type: 'object',
          title: 'Agent',
          properties: {
            _type: { type: 'string', const: 'agent' },
            systemPrompt: {
              type: 'string',
              'x-editor-component': 'agency-prompt-editor',
            },
            inputProjection: { type: 'string', 'x-display-hint': 'textarea' },
            outputProjection: { type: 'string', 'x-display-hint': 'textarea' },
            userMessageTemplate: { type: 'string' },
            model: {
              'x-discriminator': '_provider',
              oneOf: [
                providerModelSchema('openai'),
                providerModelSchema('anthropic'),
                providerModelSchema('ollama'),
                providerModelSchema('mistralAi'),
                providerModelSchema('googleAiGemini'),
              ],
            },
          },
        },
        {
          type: 'object',
          title: 'Flow (SWF)',
          properties: {
            _type: { type: 'string', const: 'do' },
            workflow: {
              type: 'object',
              readOnly: true,
              'x-editor-component': 'agency-swf-link',
              'x-help': 'Edit via SWF drill-down',
            },
          },
        },
        {
          type: 'object',
          title: 'A2A',
          properties: {
            _type: { type: 'string', const: 'a2a' },
            endpoint: { type: 'string', format: 'uri' },
            skill: { type: 'string' },
            streaming: { type: 'boolean' },
            auth: authConfigSchema,
          },
        },
        {
          type: 'object',
          title: 'MCP',
          properties: {
            _type: { type: 'string', const: 'mcp' },
            transport: {
              'x-discriminator': '_transport',
              oneOf: [
                {
                  type: 'object',
                  title: 'stdio',
                  properties: {
                    _transport: { type: 'string', const: 'stdio' },
                    command: { type: 'array', items: { type: 'string' } },
                    env: {
                      type: 'object',
                      'x-editor-component': 'agency-env-map-editor',
                      'x-help': 'KEY=VALUE environment variables',
                    },
                  },
                },
                {
                  type: 'object',
                  title: 'http',
                  properties: {
                    _transport: { type: 'string', const: 'http' },
                    url: { type: 'string', format: 'uri' },
                    auth: authConfigSchema,
                  },
                },
              ],
            },
          },
        },
        {
          type: 'object',
          title: 'Sequence',
          properties: {
            _type: { type: 'string', const: 'sequence' },
            steps: {
              type: 'array',
              items: { type: 'string' },
              'x-editor-component': 'agency-sequence-editor',
              'x-help': 'Ordered list of worker names',
            },
          },
        },
      ],
    },
    executionPolicy: {
      type: 'object',
      'x-group': 'Advanced',
      'x-order': 30,
      'x-visibility': 'advanced',
      properties: {
        timeoutMs: { type: 'integer', minimum: 0, 'x-help': 'Timeout in milliseconds' },
        retries: {
          type: 'object',
          properties: {
            maxAttempts: { type: 'integer', minimum: 1, 'x-help': 'Total attempts including the first' },
            delayMs: { type: 'integer', minimum: 0, 'x-help': 'Delay between retry attempts (ms)' },
          },
        },
      },
    },
    contextType: {
      type: 'string',
      'x-group': 'Advanced',
      'x-order': 31,
      'x-visibility': 'advanced',
      'x-help': 'Fully qualified Java class for typed worker function input',
    },
    outputType: {
      type: 'string',
      'x-group': 'Advanced',
      'x-order': 32,
      'x-visibility': 'advanced',
      'x-help': 'Fully qualified Java class for typed worker function output',
    },
  },
} as const;
