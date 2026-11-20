import { describe, it, expect } from 'vitest';
import { parseMarketplaceYaml } from './parser.js';

const VALID_YAML = `
name: test-marketplace
version: "1.0"
description: Test stencils
stencils:
  - name: send-email
    displayName: Send Email
    category: connectors/messaging
    icon: mail
    async: true
    properties:
      type: object
      properties:
        to:
          type: string
        subject:
          type: string
    input:
      type: object
      properties:
        body:
          type: string
    output:
      type: object
      properties:
        messageId:
          type: string
  - name: http-request
    displayName: HTTP Request
    category: connectors/http
    icon: globe
    properties:
      type: object
      properties:
        url:
          type: string
        method:
          type: string
`;

describe('parseMarketplaceYaml', () => {
  it('parses valid marketplace YAML with multiple stencils', () => {
    const result = parseMarketplaceYaml(VALID_YAML);

    expect(result.errors).toHaveLength(0);
    expect(result.stencils).toHaveLength(2);

    const email = result.stencils[0]!;
    expect(email.name).toBe('send-email');
    expect(email.displayName).toBe('Send Email');
    expect(email.category).toBe('connectors/messaging');
    expect(email.icon).toBe('mail');
    expect(email.async).toBe(true);

    const http = result.stencils[1]!;
    expect(http.name).toBe('http-request');
    expect(http.async).toBe(false);
  });

  it('defaults async to false when omitted', () => {
    const yaml = `
name: test
stencils:
  - name: sync-task
    displayName: Sync Task
    category: tasks
    icon: check
`;
    const result = parseMarketplaceYaml(yaml);
    expect(result.stencils[0]!.async).toBe(false);
  });

  it('defaults properties/input/output to empty schema when omitted', () => {
    const yaml = `
name: test
stencils:
  - name: bare
    displayName: Bare Stencil
    category: misc
    icon: box
`;
    const result = parseMarketplaceYaml(yaml);
    const stencil = result.stencils[0]!;
    expect(stencil.properties).toEqual({});
    expect(stencil.input).toEqual({});
    expect(stencil.output).toEqual({});
  });

  it('returns error for invalid YAML syntax', () => {
    const result = parseMarketplaceYaml('{{invalid yaml');
    expect(result.stencils).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain('YAML parse error');
  });

  it('returns error for missing top-level name', () => {
    const result = parseMarketplaceYaml('stencils: []');
    expect(result.errors[0]!.message).toContain('Invalid marketplace descriptor');
  });

  it('returns error for missing top-level stencils array', () => {
    const result = parseMarketplaceYaml('name: test');
    expect(result.errors[0]!.message).toContain('Invalid marketplace descriptor');
  });

  it('collects per-stencil validation errors without failing other stencils', () => {
    const yaml = `
name: test
stencils:
  - name: good
    displayName: Good
    category: misc
    icon: check
  - name: bad
    category: misc
    icon: x
`;
    const result = parseMarketplaceYaml(yaml);
    expect(result.stencils).toHaveLength(1);
    expect(result.stencils[0]!.name).toBe('good');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.stencilName).toBe('bad');
  });

  it('rejects stencils missing required fields', () => {
    const cases = [
      { yaml: 'name: t\nstencils:\n  - displayName: X\n    category: c\n    icon: i', field: 'name' },
      { yaml: 'name: t\nstencils:\n  - name: x\n    category: c\n    icon: i', field: 'displayName' },
      { yaml: 'name: t\nstencils:\n  - name: x\n    displayName: X\n    icon: i', field: 'category' },
      { yaml: 'name: t\nstencils:\n  - name: x\n    displayName: X\n    category: c', field: 'icon' },
    ];

    for (const { yaml, field } of cases) {
      const result = parseMarketplaceYaml(yaml);
      expect(result.stencils).toHaveLength(0);
      expect(result.errors[0]!.message).toContain(field);
    }
  });
});
