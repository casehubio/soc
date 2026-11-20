import { describe, it, expect } from 'vitest';
import type {
  Manifest, ProviderDeclaration, ModelDescriptor, AliasDeclaration,
  CredentialRef, SourceDeclaration, LocalModelDeclaration,
} from './manifest.js';

describe('manifest types', () => {
  it('Manifest accepts full structure', () => {
    const m: Manifest = {
      providers: [{ vendor: 'anthropic', credential: 'env:ANTHROPIC_API_KEY' }],
      models: [{ id: 'claude-opus-4-6', tier: 'FLAGSHIP', contextWindow: 200000 }],
      aliases: { 'reasoning': { tier: 'FLAGSHIP', capabilities: ['tool_use'] } },
      defaults: { backend: 'anthropic' },
      sources: [{ uri: 'https://example.com/models.yaml', priority: 1 }],
      localModels: [{ id: 'llama3', backendKey: 'ollama' }],
    };
    expect(m.providers).toHaveLength(1);
  });

  it('Manifest accepts empty object', () => {
    const m: Manifest = {};
    expect(m.providers).toBeUndefined();
  });

  it('ProviderDeclaration credential can be string or Record', () => {
    const single: ProviderDeclaration = { vendor: 'openai', credential: 'env:OPENAI_KEY' };
    const multi: ProviderDeclaration = {
      vendor: 'aws-bedrock',
      credential: { accessKey: 'env:AWS_KEY', secretKey: 'env:AWS_SECRET' },
    };
    expect(single.vendor).toBe('openai');
    expect(multi.vendor).toBe('aws-bedrock');
  });

  it('CredentialRef discriminated union', () => {
    const env: CredentialRef = { type: 'env', name: 'MY_KEY' };
    const file: CredentialRef = { type: 'file', path: '/secrets/key.pem' };
    const ref: CredentialRef = { type: 'ref', name: 'vault-prod' };
    expect(env.type).toBe('env');
    expect(file.type).toBe('file');
    expect(ref.type).toBe('ref');
  });

  it('ModelDescriptor accepts all optional fields', () => {
    const model: ModelDescriptor = {
      id: 'claude-sonnet-5',
      apiModelId: 'claude-sonnet-5-20260901',
      backendKey: 'anthropic',
      vendor: 'anthropic',
      family: 'claude',
      displayName: 'Claude Sonnet 5',
      tier: 'STANDARD',
      capabilities: ['vision', 'tool_use'],
      contextWindow: 200000,
      maxOutput: 8192,
      locality: 'CLOUD',
      costTier: 'MEDIUM',
      authMethod: 'api_key',
      properties: { temperature_max: '1.0' },
    };
    expect(model.id).toBe('claude-sonnet-5');
  });

  it('AliasDeclaration accepts all constraint fields', () => {
    const alias: AliasDeclaration = {
      tier: 'FLAGSHIP',
      capabilities: ['tool_use', 'vision'],
      locality: 'CLOUD',
      maxCost: 'HIGH',
      minContext: 100000,
      minOutput: 8192,
      preferVendor: 'anthropic',
    };
    expect(alias.tier).toBe('FLAGSHIP');
  });

  it('SourceDeclaration and LocalModelDeclaration', () => {
    const source: SourceDeclaration = { uri: 'https://example.com/models.yaml', priority: 1 };
    const local: LocalModelDeclaration = { id: 'llama3', backendKey: 'ollama', host: 'http://localhost:11434' };
    expect(source.uri).toBe('https://example.com/models.yaml');
    expect(local.id).toBe('llama3');
  });
});
