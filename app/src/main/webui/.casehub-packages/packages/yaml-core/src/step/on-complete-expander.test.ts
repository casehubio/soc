import { describe, it, expect } from 'vitest';
import { OnCompleteExpander } from './on-complete-expander.js';

describe('OnCompleteExpander', () => {
  it('passes through steps without on-complete', () => {
    const steps = [
      { action: 'deploy', name: 'step1' },
      { action: 'notify', name: 'step2' },
    ];
    const result = OnCompleteExpander.expand(steps);
    expect(result.steps).toEqual(steps);
    expect(result.locations.isGenerated('step1')).toBe(false);
  });

  it('desugars on-complete to signal/wait pair', () => {
    const steps = [
      {
        action: 'deploy',
        name: 'deploy-step',
        'on-complete': [{ action: 'notify' }],
      },
    ];
    const result = OnCompleteExpander.expand(steps);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]!['signal']).toBe('deploy-step_done');
    expect(result.steps[0]!['on-complete']).toBeUndefined();
    expect(result.steps[1]!['wait']).toBe('deploy-step_done');
    expect(result.steps[1]!['action']).toBe('notify');
  });

  it('generates name when step has no name', () => {
    const steps = [
      {
        action: 'deploy',
        'on-complete': [{ action: 'notify' }],
      },
    ];
    const result = OnCompleteExpander.expand(steps);
    expect(result.steps[0]!['name']).toMatch(/^__oc_/);
    expect(result.locations.isGenerated(result.steps[0]!['name'] as string)).toBe(true);
  });

  it('preserves existing signal — merges as list', () => {
    const steps = [
      {
        action: 'deploy',
        name: 'dep',
        signal: 'existing-signal',
        'on-complete': [{ action: 'notify' }],
      },
    ];
    const result = OnCompleteExpander.expand(steps);
    expect(result.steps[0]!['signal']).toEqual(['existing-signal', 'dep_done']);
  });

  it('handles nested on-complete', () => {
    const steps = [
      {
        action: 'step-a',
        name: 'a',
        'on-complete': [
          {
            action: 'step-b',
            name: 'b',
            'on-complete': [{ action: 'step-c' }],
          },
        ],
      },
    ];
    const result = OnCompleteExpander.expand(steps);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0]!['action']).toBe('step-a');
    expect(result.steps[1]!['action']).toBe('step-b');
    expect(result.steps[1]!['wait']).toBe('a_done');
    expect(result.steps[2]!['action']).toBe('step-c');
    expect(result.steps[2]!['wait']).toBe('b_done');
  });

  it('handles multiple continuations', () => {
    const steps = [
      {
        action: 'deploy',
        name: 'dep',
        'on-complete': [
          { action: 'notify-slack' },
          { action: 'notify-email' },
        ],
      },
    ];
    const result = OnCompleteExpander.expand(steps);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[1]!['wait']).toBe('dep_done');
    expect(result.steps[1]!['action']).toBe('notify-slack');
    expect(result.steps[2]!['wait']).toBe('dep_done');
    expect(result.steps[2]!['action']).toBe('notify-email');
  });

  it('SourceLocationMap.originalContext returns context for generated names', () => {
    const steps = [
      {
        action: 'deploy',
        'on-complete': [{ action: 'notify' }],
      },
    ];
    const result = OnCompleteExpander.expand(steps);
    const genName = result.steps[0]!['name'] as string;
    expect(result.locations.originalContext(genName)).toContain('on-complete');
  });

  it('SourceLocationMap.originalContext returns undefined for non-generated names', () => {
    const steps = [{ action: 'deploy', name: 'manual' }];
    const result = OnCompleteExpander.expand(steps);
    expect(result.locations.originalContext('manual')).toBeUndefined();
  });

  it('preserves all other step properties', () => {
    const steps = [
      {
        action: 'deploy',
        name: 'dep',
        timeout: '30s',
        retry: 3,
        'on-complete': [{ action: 'notify' }],
      },
    ];
    const result = OnCompleteExpander.expand(steps);
    expect(result.steps[0]!['timeout']).toBe('30s');
    expect(result.steps[0]!['retry']).toBe(3);
  });
});
