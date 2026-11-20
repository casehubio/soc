import { describe, it, expect } from 'vitest';
import { DefinitionParser } from './definition-parser.js';

describe('DefinitionParser', () => {
  describe('enum alias for allowedValues', () => {
    it('reads allowedValues from "enum" key', () => {
      const params = DefinitionParser.parseParams({
        status: { type: 'STRING', enum: ['active', 'inactive'] },
      });
      expect(params['status']!.allowedValues).toEqual(['active', 'inactive']);
    });

    it('prefers allowedValues over enum when both present', () => {
      const params = DefinitionParser.parseParams({
        status: { type: 'STRING', allowedValues: ['a'], enum: ['b'] },
      });
      expect(params['status']!.allowedValues).toEqual(['a']);
    });
  });

  describe('kebab-case aliases', () => {
    it('reads structured-output on agent binding', () => {
      const binding = DefinitionParser.parseInvoke({
        agent: { descriptor: 'test-agent', 'structured-output': true },
      });
      expect(binding.kind).toBe('agent');
      if (binding.kind === 'agent') {
        expect(binding.structuredOutput).toBe(true);
      }
    });

    it('reads working-dir on process binding', () => {
      const binding = DefinitionParser.parseInvoke({
        process: { command: 'echo', 'working-dir': '/tmp' },
      });
      if (binding.kind === 'process') {
        expect(binding.workingDir).toBe('/tmp');
      }
    });

    it('reads on-error on process binding', () => {
      const binding = DefinitionParser.parseInvoke({
        process: { command: 'echo', 'on-error': 'ignore' },
      });
      if (binding.kind === 'process') {
        expect(binding.onError).toBe('ignore');
      }
    });

    it('reads working-dir on python shorthand', () => {
      const binding = DefinitionParser.parseInvoke({
        python: 'script.py', 'working-dir': '/opt',
      });
      if (binding.kind === 'script') {
        expect(binding.workingDir).toBe('/opt');
      }
    });
  });

  describe('portability', () => {
    it('explicit portability value is preserved', () => {
      const file = DefinitionParser.parse({
        actions: { a: { portability: 'java', inputs: {} } },
      });
      expect(file.actions['a']!.portability).toBe('java');
    });

    it('rest invoke infers universal', () => {
      const file = DefinitionParser.parse({
        actions: { a: { invoke: { rest: { url: '/x' } } } },
      });
      expect(file.actions['a']!.portability).toBe('universal');
    });

    it('mcp invoke infers ts', () => {
      const file = DefinitionParser.parse({
        actions: { a: { invoke: { mcp: 'tool' } } },
      });
      expect(file.actions['a']!.portability).toBe('ts');
    });

    it('no invoke infers ts', () => {
      const file = DefinitionParser.parse({
        actions: { a: { inputs: {} } },
      });
      expect(file.actions['a']!.portability).toBe('ts');
    });

    it('throws on invalid portability value', () => {
      expect(() => DefinitionParser.parse({
        actions: { a: { portability: 'invalid' } },
      })).toThrow(/Invalid portability/);
    });

    it('graphql invoke infers universal', () => {
      const file = DefinitionParser.parse({
        actions: { a: { invoke: { graphql: '{ x }' } } },
      });
      expect(file.actions['a']!.portability).toBe('universal');
    });

    it('process invoke infers universal', () => {
      const file = DefinitionParser.parse({
        actions: { a: { invoke: { process: { command: 'echo' } } } },
      });
      expect(file.actions['a']!.portability).toBe('universal');
    });
  });

  describe('parseInvoke — new binding kinds', () => {
    it('parses aria binding', () => {
      const binding = DefinitionParser.parseInvoke({ aria: 'click' });
      expect(binding).toEqual({ kind: 'aria', action: 'click' });
    });

    it('parses graphql-domain binding', () => {
      const binding = DefinitionParser.parseInvoke({ 'graphql-domain': true });
      expect(binding).toEqual({ kind: 'graphql-domain' });
    });

    it('parses simulated binding', () => {
      const binding = DefinitionParser.parseInvoke({ simulated: true });
      expect(binding).toEqual({ kind: 'simulated' });
    });

    it('aria invoke infers ts portability', () => {
      const file = DefinitionParser.parse({
        actions: { click: { invoke: { aria: 'click' } } },
      });
      expect(file.actions['click']!.portability).toBe('ts');
    });

    it('graphql-domain invoke infers universal portability', () => {
      const file = DefinitionParser.parse({
        actions: { gql: { invoke: { 'graphql-domain': true } } },
      });
      expect(file.actions['gql']!.portability).toBe('universal');
    });
  });
});
