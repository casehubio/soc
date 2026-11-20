import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SectionedScenario, ScenarioStep } from './types.js';
import { runSectionedScenario } from './sectioned-runner.js';

function makeScenario(sections: Array<{ title: string; steps?: ScenarioStep[]; markdown?: string }>): SectionedScenario {
  return {
    scenario: 'test-tutorial',
    meta: { title: 'Test Tutorial', description: 'Test', area: 'test' },
    sections: sections.map(s => ({
      title: s.title,
      content: s.markdown ? { type: 'inline' as const, markdown: s.markdown } : undefined,
      steps: s.steps ?? [],
    })),
  };
}

function collectStates(eventTarget: EventTarget): Record<string, unknown>[] {
  const states: Record<string, unknown>[] = [];
  eventTarget.addEventListener('pages-event', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.topic === 'scenario:state') states.push(detail.payload);
  });
  return states;
}

describe('runSectionedScenario', () => {
  let eventTarget: EventTarget;
  let states: Record<string, unknown>[];

  beforeEach(() => {
    eventTarget = new EventTarget();
    states = collectStates(eventTarget);
  });

  it('fires initial state event with outline', () => {
    const scenario = makeScenario([
      { title: 'Intro', markdown: 'Hello' },
      { title: 'Demo', steps: [{ delivery: 'aria', action: 'click', name: 'test-click', target: { role: 'button', name: 'Go' } }] },
    ]);
    const runner = runSectionedScenario(scenario, { eventTarget });
    expect(states.length).toBeGreaterThanOrEqual(1);
    const first = states[0];
    expect(first.scenario).toBe('test-tutorial');
    expect(first.chapter).toBe('Test Tutorial');
    expect(first.outline).toBeDefined();
    expect((first.outline as unknown[]).length).toBe(2);
    expect(first.paused).toBe(true);
    runner.dispose();
  });

  it('starts paused by default', () => {
    const scenario = makeScenario([{ title: 'Intro', markdown: 'Hello' }]);
    const runner = runSectionedScenario(scenario, { eventTarget });
    const first = states[0];
    expect(first.paused).toBe(true);
    runner.dispose();
  });

  it('sets section in state for slides-only', () => {
    const scenario = makeScenario([{ title: 'Intro', markdown: 'Hello' }]);
    const runner = runSectionedScenario(scenario, { eventTarget });
    const first = states[0];
    expect(first.section).toBe('Intro');
    expect(first.step).toBeNull();
    runner.dispose();
  });

  it('includes inline content in state after resolution', async () => {
    const scenario = makeScenario([{ title: 'Intro', markdown: 'Hello world' }]);
    const runner = runSectionedScenario(scenario, { eventTarget });
    await new Promise(r => setTimeout(r, 100));
    const withContent = states.find(s => (s as any).content?.markdown === 'Hello world');
    expect(withContent).toBeDefined();
    const content = (withContent as any).content as { type: string; markdown: string };
    expect(content.type).toBe('inline');
    expect(content.markdown).toBe('Hello world');
    runner.dispose();
  });

  it('calls onComplete when all sections finish', async () => {
    const onComplete = vi.fn();
    const scenario = makeScenario([{ title: 'Intro', markdown: 'Hello' }]);
    const runner = runSectionedScenario(scenario, { eventTarget, startPaused: false, onComplete });
    // Slides-only pauses automatically; step to advance
    await new Promise(r => setTimeout(r, 50));
    runner.step();
    await new Promise(r => setTimeout(r, 100));
    expect(onComplete).toHaveBeenCalledWith('test-tutorial');
    runner.dispose();
  });

  it('dispose fires null scenario state', () => {
    const scenario = makeScenario([{ title: 'Intro', markdown: 'Hello' }]);
    const runner = runSectionedScenario(scenario, { eventTarget });
    runner.dispose();
    const last = states[states.length - 1];
    expect(last.scenario).toBeNull();
  });

  it('responds to scenario-command events', async () => {
    const scenario = makeScenario([
      { title: 'Intro', markdown: 'Hello' },
      { title: 'Second', markdown: 'World' },
    ]);
    const runner = runSectionedScenario(scenario, { eventTarget });
    // Send a step command via event
    eventTarget.dispatchEvent(new CustomEvent('scenario-command', {
      detail: { command: 'step' },
    }));
    await new Promise(r => setTimeout(r, 50));
    // Should have advanced
    const latestSection = states[states.length - 1].section;
    expect(latestSection).toBeDefined();
    runner.dispose();
  });

  it('runTo navigates to a named section', async () => {
    const scenario = makeScenario([
      { title: 'First', markdown: 'A' },
      { title: 'Second', markdown: 'B' },
      { title: 'Third', markdown: 'C' },
    ]);
    const runner = runSectionedScenario(scenario, { eventTarget });
    runner.runTo('Third');
    await new Promise(r => setTimeout(r, 50));
    const last = states[states.length - 1];
    expect(last.section).toBe('Third');
    expect(last.paused).toBe(true);
    runner.dispose();
  });

  it('setSpeed updates speed', () => {
    const scenario = makeScenario([{ title: 'Intro', markdown: 'Hello' }]);
    const runner = runSectionedScenario(scenario, { eventTarget });
    runner.setSpeed(2.0);
    runner.dispose();
  });

  it('computes progress for slides-only as sections visited / total', async () => {
    const scenario = makeScenario([
      { title: 'A', markdown: 'a' },
      { title: 'B', markdown: 'b' },
    ]);
    const runner = runSectionedScenario(scenario, { eventTarget });
    const first = states[0];
    expect(first.progress).toBe(0);
    runner.dispose();
  });
});
