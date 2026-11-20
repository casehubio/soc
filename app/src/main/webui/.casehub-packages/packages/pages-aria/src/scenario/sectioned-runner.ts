import type { SectionedScenario, TutorialSection, SectionContent } from './types.js';
import type { OutlineNode, ScenarioState } from '../controller/scenario-connection-controller.js';

export interface TutorialRunnerOptions {
  eventTarget: EventTarget;
  contentBase?: string;
  speed?: number;
  startPaused?: boolean;
  onComplete?: (scenarioName: string) => void;
}

export interface TutorialRunner {
  play(): void;
  pause(): void;
  step(): void;
  runTo(sectionTitle: string): void;
  setSpeed(speed: number): void;
  dispose(): void;
}

interface RunnerState {
  paused: boolean;
  speed: number;
  disposed: boolean;
  sectionIndex: number;
  stepIndex: number;
  visitedSections: Set<number>;
  resumeResolve: (() => void) | null;
}

function buildOutline(scenario: SectionedScenario): OutlineNode[] {
  return scenario.sections.map(sec => ({
    label: sec.title,
    target: null,
    children: sec.steps.map(step => {
      const s = step as { name?: string; action?: string };
      return {
        label: s.name ?? 'step',
        target: null,
        action: s.action,
        children: [],
      };
    }),
  }));
}

function computeProgress(scenario: SectionedScenario, rs: RunnerState): number {
  const totalSteps = scenario.sections.reduce((sum, s) => sum + s.steps.length, 0);
  if (totalSteps === 0) {
    const totalSections = scenario.sections.length;
    return totalSections === 0 ? 0 : rs.visitedSections.size / totalSections;
  }
  let completed = 0;
  for (let i = 0; i < rs.sectionIndex; i++) {
    completed += scenario.sections[i].steps.length;
  }
  completed += rs.stepIndex;
  return completed / totalSteps;
}

async function resolveTemplates(
  sections: TutorialSection[],
  contentBase?: string,
): Promise<Map<number, string>> {
  const resolved = new Map<number, string>();
  for (let i = 0; i < sections.length; i++) {
    const content = sections[i].content;
    if (content?.type === 'template' && content.path) {
      if (!contentBase) {
        throw new Error(`Template content at section "${sections[i].title}" requires contentBase`);
      }
      const resp = await fetch(`${contentBase}/${content.path}`);
      if (!resp.ok) {
        throw new Error(`Failed to resolve template "${content.path}" for section "${sections[i].title}" (${resp.status})`);
      }
      resolved.set(i, await resp.text());
    }
  }
  return resolved;
}

function resolveContent(
  section: TutorialSection,
  sectionIndex: number,
  templates: Map<number, string>,
): SectionContent | undefined {
  const content = section.content;
  if (!content) return undefined;
  if (content.type === 'template' && templates.has(sectionIndex)) {
    return { type: 'inline', markdown: templates.get(sectionIndex)! };
  }
  return content;
}

function fireState(
  eventTarget: EventTarget,
  scenario: SectionedScenario,
  rs: RunnerState,
  outline: OutlineNode[] | undefined,
  content: SectionContent | undefined,
  _templates: Map<number, string>,
): void {
  const section = scenario.sections[rs.sectionIndex];
  const step = section?.steps[rs.stepIndex] as { name?: string } | undefined;
  const state: ScenarioState = {
    scenario: scenario.scenario,
    chapter: scenario.meta?.title ?? null,
    section: section?.title ?? null,
    step: step?.name ?? null,
    paused: rs.paused,
    speed: rs.speed,
    progress: computeProgress(scenario, rs),
    content: content ? { type: content.type, markdown: content.markdown, path: content.path, section: content.section } : null,
    slides: null,
    ...(outline ? { outline } : {}),
  };
  eventTarget.dispatchEvent(new CustomEvent('pages-event', {
    detail: { topic: 'scenario:state', payload: state },
  }));
}

function fireClearState(eventTarget: EventTarget): void {
  const state: ScenarioState = {
    scenario: null, chapter: null, section: null, step: null,
    paused: false, speed: 1.0, progress: 0, content: null, slides: null,
  };
  eventTarget.dispatchEvent(new CustomEvent('pages-event', {
    detail: { topic: 'scenario:state', payload: state },
  }));
}

async function waitIfPaused(rs: RunnerState): Promise<void> {
  if (rs.paused) {
    await new Promise<void>(resolve => { rs.resumeResolve = resolve; });
  }
}

// executeAriaStep replaced by executeStep from command-executor
import { executeStep } from '../executor/command-executor.js';

export function runSectionedScenario(
  scenario: SectionedScenario,
  options: TutorialRunnerOptions,
): TutorialRunner {
  const { eventTarget, contentBase, onComplete } = options;
  const rs: RunnerState = {
    paused: options.startPaused !== false,
    speed: options.speed ?? 1.0,
    disposed: false,
    sectionIndex: 0,
    stepIndex: 0,
    visitedSections: new Set(),
    resumeResolve: null,
  };

  const outline = buildOutline(scenario);
  const templates = new Map<number, string>();

  const onCommand = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { command: string; speed?: number; label?: string };
    switch (detail.command) {
      case 'pause': runner.pause(); break;
      case 'resume': runner.play(); break;
      case 'step': runner.step(); break;
      case 'speed': if (detail.speed != null) runner.setSpeed(detail.speed); break;
      case 'run-to': if (detail.label) runner.runTo(detail.label); break;
    }
  };
  eventTarget.addEventListener('scenario-command', onCommand);

  // Fire initial state with outline (no content yet — templates not resolved)
  fireState(eventTarget, scenario, rs, outline, undefined, templates);

  // Start async execution loop
  void (async () => {
    // Pre-resolve templates
    try {
      const resolved = await resolveTemplates(scenario.sections, contentBase);
      for (const [k, v] of resolved) templates.set(k, v);
    } catch {
      // Template resolution failed — fire error and stop
      return;
    }

    // Re-fire initial state with resolved content
    const initialContent = resolveContent(scenario.sections[0], 0, templates);
    fireState(eventTarget, scenario, rs, undefined, initialContent, templates);

    await waitIfPaused(rs);
    if (rs.disposed) return;

    for (let si = rs.sectionIndex; si < scenario.sections.length; si++) {
      if (rs.disposed) return;
      rs.sectionIndex = si;
      rs.stepIndex = 0;
      rs.visitedSections.add(si);

      const section = scenario.sections[si];
      const content = resolveContent(section, si, templates);
      fireState(eventTarget, scenario, rs, undefined, content, templates);

      if (section.steps.length === 0) {
        rs.paused = true;
        fireState(eventTarget, scenario, rs, undefined, content, templates);
        await waitIfPaused(rs);
        if (rs.disposed) return;
        if (rs.sectionIndex !== si) { si = rs.sectionIndex - 1; }
        continue;
      }

      for (let sti = 0; sti < section.steps.length; sti++) {
        if (rs.disposed) return;
        if (rs.sectionIndex !== si) { si = rs.sectionIndex - 1; break; }
        rs.stepIndex = sti;
        fireState(eventTarget, scenario, rs, undefined, content, templates);

        await waitIfPaused(rs);
        if (rs.disposed) return;
        if (rs.sectionIndex !== si) { si = rs.sectionIndex - 1; break; }

        const step = section.steps[sti];
        if (step.delivery === 'aria') {
          try {
            await executeStep(step as any, eventTarget, rs.speed);
          } catch {
            rs.paused = true;
            fireState(eventTarget, scenario, rs, undefined, content, templates);
            await waitIfPaused(rs);
            if (rs.disposed) return;
          }
        }

        // Delay based on speed
        if (rs.speed > 0 && !rs.paused) {
          await new Promise(r => setTimeout(r, 300 / rs.speed));
        }
      }
      rs.stepIndex = section.steps.length;
    }

    // Tutorial complete — keep index on last section so outline markers persist
    rs.sectionIndex = Math.max(0, scenario.sections.length - 1);
    rs.stepIndex = scenario.sections[rs.sectionIndex]?.steps.length ?? 0;
    const lastContent = resolveContent(scenario.sections[rs.sectionIndex], rs.sectionIndex, templates);
    fireState(eventTarget, scenario, rs, undefined, lastContent, templates);
    onComplete?.(scenario.scenario);
  })();

  const runner: TutorialRunner = {
    play(): void {
      rs.paused = false;
      if (rs.resumeResolve) { rs.resumeResolve(); rs.resumeResolve = null; }
    },
    pause(): void {
      rs.paused = true;
    },
    step(): void {
      rs.paused = false;
      if (rs.resumeResolve) { rs.resumeResolve(); rs.resumeResolve = null; }
      queueMicrotask(() => { rs.paused = true; });
    },
    runTo(sectionTitle: string): void {
      const targetIdx = scenario.sections.findIndex(s => s.title === sectionTitle);
      if (targetIdx < 0) return;
      rs.sectionIndex = targetIdx;
      rs.stepIndex = 0;
      rs.paused = true;
      const content = resolveContent(scenario.sections[targetIdx], targetIdx, templates);
      rs.visitedSections.add(targetIdx);
      fireState(eventTarget, scenario, rs, undefined, content, templates);
      if (rs.resumeResolve) { rs.resumeResolve(); rs.resumeResolve = null; }
    },
    setSpeed(speed: number): void {
      rs.speed = speed;
    },
    dispose(): void {
      rs.disposed = true;
      eventTarget.removeEventListener('scenario-command', onCommand);
      if (rs.resumeResolve) { rs.resumeResolve(); rs.resumeResolve = null; }
      fireClearState(eventTarget);
    },
  };

  return runner;
}
