export interface InferenceDefaults {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export interface InferenceRange {
  min: number;
  max: number;
  default: number;
}

export interface ProviderInferenceRanges {
  temperature: InferenceRange;
  topP: InferenceRange;
  maxTokens: InferenceRange;
}

export const PROVIDER_DEFAULTS: Record<string, ProviderInferenceRanges> = {
  anthropic: {
    temperature: { min: 0, max: 1, default: 1 },
    topP: { min: 0, max: 1, default: 1 },
    maxTokens: { min: 1, max: 8192, default: 4096 },
  },
  openai: {
    temperature: { min: 0, max: 2, default: 1 },
    topP: { min: 0, max: 1, default: 1 },
    maxTokens: { min: 1, max: 16384, default: 4096 },
  },
  google: {
    temperature: { min: 0, max: 2, default: 1 },
    topP: { min: 0, max: 1, default: 1 },
    maxTokens: { min: 1, max: 8192, default: 4096 },
  },
  ollama: {
    temperature: { min: 0, max: 2, default: 0.8 },
    topP: { min: 0, max: 1, default: 0.9 },
    maxTokens: { min: 1, max: 4096, default: 2048 },
  },
};

export type AuthFieldType = 'secret' | 'text' | 'file' | 'url';

export interface AuthField {
  key: string;
  label: string;
  type: AuthFieldType;
  envVar?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  group?: string;
}

export interface AuthPattern {
  id: string;
  label: string;
  fields: AuthField[];
  alternatives?: { label: string; fields: AuthField[] }[];
}

export const AUTH_PATTERNS: Record<string, AuthPattern> = {
  'api-key': {
    id: 'api-key',
    label: 'API Key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'secret', required: true },
      { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com', hint: 'Override default endpoint' },
    ],
  },
  'gcp-iam': {
    id: 'gcp-iam',
    label: 'GCP IAM',
    fields: [
      { key: 'projectId', label: 'Project ID', type: 'text', envVar: 'ANTHROPIC_VERTEX_PROJECT_ID', required: true, placeholder: 'my-gcp-project' },
      { key: 'region', label: 'Region', type: 'text', envVar: 'CLOUD_ML_REGION', required: true, placeholder: 'us-central1' },
    ],
    alternatives: [
      {
        label: 'Service Account',
        fields: [
          { key: 'serviceAccount', label: 'Service Account JSON', type: 'file', envVar: 'GOOGLE_APPLICATION_CREDENTIALS', placeholder: '/path/to/service-account.json' },
        ],
      },
      {
        label: 'Application Default Credentials',
        fields: [
          { key: 'adc', label: 'ADC Status', type: 'text', hint: 'Run: gcloud auth application-default login' },
        ],
      },
    ],
  },
  'aws-iam': {
    id: 'aws-iam',
    label: 'AWS IAM',
    fields: [
      { key: 'region', label: 'Region', type: 'text', envVar: 'AWS_REGION', required: true, placeholder: 'us-east-1' },
    ],
    alternatives: [
      {
        label: 'Access Keys',
        fields: [
          { key: 'accessKey', label: 'Access Key ID', type: 'secret', envVar: 'AWS_ACCESS_KEY_ID', required: true },
          { key: 'secretKey', label: 'Secret Access Key', type: 'secret', envVar: 'AWS_SECRET_ACCESS_KEY', required: true },
          { key: 'sessionToken', label: 'Session Token', type: 'secret', envVar: 'AWS_SESSION_TOKEN', hint: 'For temporary credentials' },
        ],
      },
      {
        label: 'Profile / SSO',
        fields: [
          { key: 'profile', label: 'AWS Profile', type: 'text', envVar: 'AWS_PROFILE', placeholder: 'default', hint: 'Named profile from ~/.aws/credentials' },
        ],
      },
    ],
  },
  'none': {
    id: 'none',
    label: 'No Authentication',
    fields: [
      { key: 'host', label: 'Host', type: 'url', envVar: 'OLLAMA_HOST', placeholder: 'http://127.0.0.1:11434' },
    ],
  },
};

export interface BuiltInProvider {
  vendor: string;
  displayName: string;
  authPattern: string;
  envVarPrefix?: string;
}

export interface BuiltInProvider {
  vendor: string;
  displayName: string;
  authPatterns: string[];
  defaultAuthPattern: string;
}

export const BUILT_IN_PROVIDERS: BuiltInProvider[] = [
  { vendor: 'anthropic', displayName: 'Anthropic', authPatterns: ['api-key', 'gcp-iam', 'aws-iam'], defaultAuthPattern: 'api-key' },
  { vendor: 'openai', displayName: 'OpenAI', authPatterns: ['api-key'], defaultAuthPattern: 'api-key' },
  { vendor: 'google', displayName: 'Google', authPatterns: ['api-key', 'gcp-iam'], defaultAuthPattern: 'api-key' },
  { vendor: 'ollama', displayName: 'Ollama', authPatterns: ['none'], defaultAuthPattern: 'none' },
];

export function getAuthPatterns(vendor: string): AuthPattern[] {
  const provider = BUILT_IN_PROVIDERS.find(p => p.vendor === vendor);
  if (provider) return provider.authPatterns.map(id => AUTH_PATTERNS[id]!);
  return Object.values(AUTH_PATTERNS);
}

export function getDefaultAuthPattern(vendor: string): AuthPattern {
  const provider = BUILT_IN_PROVIDERS.find(p => p.vendor === vendor);
  if (provider) return AUTH_PATTERNS[provider.defaultAuthPattern]!;
  return AUTH_PATTERNS['api-key']!;
}

export const OTHER_PROVIDER_DEFAULTS: ProviderInferenceRanges = {
  temperature: { min: 0, max: 2, default: 1 },
  topP: { min: 0, max: 1, default: 1 },
  maxTokens: { min: 1, max: 4096, default: 4096 },
};

export function getInferenceRanges(
  vendor: string,
  model?: { properties?: Record<string, string>; contextWindow?: number },
): ProviderInferenceRanges {
  const base = PROVIDER_DEFAULTS[vendor.toLowerCase()] ?? OTHER_PROVIDER_DEFAULTS;
  if (!model?.properties) {
    const result = { ...base };
    if (model?.contextWindow) {
      result.maxTokens = { ...result.maxTokens, max: model.contextWindow };
    }
    return result;
  }
  const p = model.properties;
  return {
    temperature: {
      min: p.temperature_min ? Number(p.temperature_min) : base.temperature.min,
      max: p.temperature_max ? Number(p.temperature_max) : base.temperature.max,
      default: p.temperature_default ? Number(p.temperature_default) : base.temperature.default,
    },
    topP: {
      min: p.topP_min ? Number(p.topP_min) : base.topP.min,
      max: p.topP_max ? Number(p.topP_max) : base.topP.max,
      default: p.topP_default ? Number(p.topP_default) : base.topP.default,
    },
    maxTokens: {
      min: p.maxTokens_min ? Number(p.maxTokens_min) : base.maxTokens.min,
      max: p.maxTokens_max ? Number(p.maxTokens_max) : (model.contextWindow ?? base.maxTokens.max),
      default: p.maxTokens_default ? Number(p.maxTokens_default) : base.maxTokens.default,
    },
  };
}

export function parseInferenceFromProperties(properties?: Record<string, string>): InferenceDefaults {
  if (!properties) return {};
  const result: InferenceDefaults = {};
  if (properties.temperature) result.temperature = Number(properties.temperature);
  if (properties.topP) result.topP = Number(properties.topP);
  if (properties.maxTokens) result.maxTokens = Number(properties.maxTokens);
  return result;
}

export function writeInferenceToProperties(
  inference: InferenceDefaults,
  existing?: Record<string, string>,
): Record<string, string> {
  const result = { ...(existing ?? {}) };
  if (inference.temperature !== undefined) result.temperature = String(inference.temperature);
  if (inference.topP !== undefined) result.topP = String(inference.topP);
  if (inference.maxTokens !== undefined) result.maxTokens = String(inference.maxTokens);
  return result;
}
