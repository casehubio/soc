import { describe, it, expect } from 'vitest';
import {
  EPISTEMIC_STATUSES, CONVERGENCE_STATES,
  type EpistemicStatus, type ConvergenceState,
  type ConversationState, type ObligationChain,
  type TransitionRecord,
} from './conversation.js';

describe('conversation types', () => {
  it('EPISTEMIC_STATUSES has three values', () => {
    expect(EPISTEMIC_STATUSES).toEqual(['ESTABLISHED', 'PENDING', 'DISPUTED']);
  });

  it('CONVERGENCE_STATES has five values', () => {
    expect(CONVERGENCE_STATES).toHaveLength(5);
    expect(CONVERGENCE_STATES).toContain('CONSENSUS');
    expect(CONVERGENCE_STATES).toContain('DEADLOCK');
    expect(CONVERGENCE_STATES).toContain('DIMINISHING_RETURNS');
  });

  it('EpistemicStatus type constrains to valid values', () => {
    const s: EpistemicStatus = 'ESTABLISHED';
    expect(s).toBe('ESTABLISHED');
  });

  it('ConvergenceState type constrains to valid values', () => {
    const s: ConvergenceState = 'DIMINISHING_RETURNS';
    expect(s).toBe('DIMINISHING_RETURNS');
  });
});
