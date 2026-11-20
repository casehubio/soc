import { click, fill, select, expand, collapse, assertState, waitFor } from '../executor/index.js';
import { isSectioned } from './types.js';
import type { Scenario, ScenarioStep } from './types.js';
import type { AriaState } from '@casehubio/pages-primitives';

function toAriaState(state: Record<string, unknown>): Partial<AriaState> {
  const result: Partial<AriaState> = {};
  if ('aria-busy' in state) result.busy = state['aria-busy'] as boolean;
  if ('aria-disabled' in state) result.disabled = state['aria-disabled'] as boolean;
  if ('aria-expanded' in state) result.expanded = state['aria-expanded'] as boolean;
  if ('aria-selected' in state) result.selected = state['aria-selected'] as boolean;
  if ('aria-hidden' in state) result.hidden = state['aria-hidden'] as boolean;
  return result;
}

async function executeStep(step: ScenarioStep): Promise<void> {
  if (step.delivery !== 'aria') return;
  const { action, target, value, state, timeout } = step;

  switch (action) {
    case 'navigate': window.location.href = value!; return;
    case 'click': click(target!); return;
    case 'fill': fill(target!, value!); return;
    case 'select': select(target!, value!); return;
    case 'expand': expand(target!); return;
    case 'collapse': collapse(target!); return;
    case 'assert': assertState(target!, toAriaState(state!)); return;
    case 'wait': await waitFor(target!, toAriaState(state!), timeout ?? 5000); return;
  }
}

export async function runScenario(scenario: Scenario): Promise<void> {
  if (isSectioned(scenario)) {
    throw new Error('runScenario does not support sectioned scenarios — use runSectionedScenario');
  }
  for (const step of scenario.steps) {
    await executeStep(step);
  }
}
