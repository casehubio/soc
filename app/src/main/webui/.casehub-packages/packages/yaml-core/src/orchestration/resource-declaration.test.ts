import { describe, it, expect } from 'vitest';
import { parseResourceDeclaration } from './resource-declaration.js';

describe('parseResourceDeclaration', () => {
  it('parses number as concurrency', () => {
    expect(parseResourceDeclaration(3)).toEqual({ concurrency: 3 });
  });

  it('parses map with concurrency', () => {
    expect(parseResourceDeclaration({ concurrency: 5 })).toEqual({ concurrency: 5 });
  });

  it('defaults concurrency to 1', () => {
    expect(parseResourceDeclaration({})).toEqual({ concurrency: 1 });
    expect(parseResourceDeclaration('anything')).toEqual({ concurrency: 1 });
  });

  it('rejects concurrency < 1', () => {
    expect(() => parseResourceDeclaration(0)).toThrow('concurrency must be >= 1');
    expect(() => parseResourceDeclaration({ concurrency: -1 })).toThrow('concurrency must be >= 1');
  });
});
