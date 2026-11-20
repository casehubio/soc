import type {
  CoordinationPipeline,
  CoordinationStep,
  PhaseItem,
} from './coordination-types.js';
import type {
  AnnotatedPhaseItem,
  DiffAnnotation,
  DiffResult,
  DiffSummary,
  FieldChange,
} from './coordination-diff-types.js';

function phaseKey(phase: PhaseItem): string {
  switch (phase.type) {
    case 'step': return `step:${phase.action}:${phase.target ?? ''}`;
    case 'signal': return `signal:${phase.name}`;
    case 'quorum': return `quorum:${phase.name}`;
    case 'parallel': return 'parallel';
  }
}

function compareStepParams(
  oldParams: Record<string, string> | undefined,
  newParams: Record<string, string> | undefined,
): FieldChange[] {
  const changes: FieldChange[] = [];
  const allKeys = new Set([
    ...Object.keys(oldParams ?? {}),
    ...Object.keys(newParams ?? {}),
  ]);
  for (const key of allKeys) {
    const oldVal = oldParams?.[key];
    const newVal = newParams?.[key];
    if (oldVal !== newVal) {
      changes.push({ field: `params.${key}`, oldValue: oldVal, newValue: newVal });
    }
  }
  return changes;
}

function compareStep(oldStep: CoordinationStep, newStep: CoordinationStep): FieldChange[] {
  const changes: FieldChange[] = [];
  const fields: (keyof CoordinationStep)[] = ['model', 'outputFormat', 'channel'];
  for (const f of fields) {
    if (oldStep[f] !== newStep[f]) {
      changes.push({ field: f, oldValue: oldStep[f] as string | undefined, newValue: newStep[f] as string | undefined });
    }
  }
  changes.push(...compareStepParams(oldStep.params, newStep.params));
  return changes;
}

function diffPhase(oldPhase: PhaseItem, newPhase: PhaseItem): DiffAnnotation {
  const changes: FieldChange[] = [];

  switch (newPhase.type) {
    case 'step': {
      const old = oldPhase as typeof newPhase;
      changes.push(...compareStep(old, newPhase));
      break;
    }
    case 'signal': {
      const old = oldPhase as typeof newPhase;
      if (old.description !== newPhase.description) {
        changes.push({ field: 'description', oldValue: old.description, newValue: newPhase.description });
      }
      break;
    }
    case 'quorum': {
      const old = oldPhase as typeof newPhase;
      if (old.required !== newPhase.required) {
        changes.push({ field: 'required', oldValue: old.required, newValue: newPhase.required });
      }
      if (old.of !== newPhase.of) {
        changes.push({ field: 'of', oldValue: old.of, newValue: newPhase.of });
      }
      break;
    }
    case 'parallel': {
      const old = oldPhase as typeof newPhase;
      const oldLanes = new Set(Object.keys(old.lanes));
      const newLanes = new Set(Object.keys(newPhase.lanes));
      for (const lane of newLanes) {
        if (!oldLanes.has(lane)) {
          changes.push({ field: `lane.${lane}`, oldValue: undefined, newValue: 'added' });
        }
      }
      for (const lane of oldLanes) {
        if (!newLanes.has(lane)) {
          changes.push({ field: `lane.${lane}`, oldValue: 'present', newValue: undefined });
        }
      }
      break;
    }
  }

  if (changes.length === 0) return { status: 'unchanged' };
  return { status: 'modified', changes };
}

function phaseName(phase: PhaseItem): string {
  switch (phase.type) {
    case 'step': return phase.target ?? phase.action;
    case 'signal': return phase.name;
    case 'quorum': return phase.name;
    case 'parallel': return Object.keys(phase.lanes).join(', ');
  }
}

function buildSummary(phases: AnnotatedPhaseItem[]): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, modified: 0, unchanged: 0, details: [] };
  for (const { phase, diff } of phases) {
    summary[diff.status]++;
    const name = phaseName(phase);
    switch (diff.status) {
      case 'added':
        summary.details.push(`${name} added`);
        break;
      case 'removed':
        summary.details.push(`${name} removed`);
        break;
      case 'modified': {
        if (phase.type === 'quorum' && diff.changes) {
          const req = diff.changes.find(c => c.field === 'required');
          const of_ = diff.changes.find(c => c.field === 'of');
          if (req && of_) {
            summary.details.push(`quorum ${req.oldValue}/${of_.oldValue} → ${req.newValue}/${of_.newValue}`);
          } else {
            summary.details.push(`${name} modified`);
          }
        } else if (phase.type === 'parallel' && diff.changes) {
          for (const change of diff.changes) {
            if (change.field.startsWith('lane.')) {
              const laneName = change.field.slice(5);
              if (change.oldValue === undefined) {
                summary.details.push(`${laneName} added`);
              } else {
                summary.details.push(`${laneName} removed`);
              }
            }
          }
        } else {
          summary.details.push(`${name} modified`);
        }
        break;
      }
    }
  }
  return summary;
}

export function computeCoordinationDiff(
  oldPipeline: CoordinationPipeline,
  newPipeline: CoordinationPipeline,
): DiffResult {
  const oldMap = new Map<string, PhaseItem>();
  const oldOrder: string[] = [];
  for (const phase of oldPipeline.phases) {
    const key = phaseKey(phase);
    oldMap.set(key, phase);
    oldOrder.push(key);
  }

  const consumed = new Set<string>();
  const annotated: AnnotatedPhaseItem[] = [];

  for (const phase of newPipeline.phases) {
    const key = phaseKey(phase);
    const oldPhase = oldMap.get(key);
    if (oldPhase) {
      consumed.add(key);
      annotated.push({ phase, diff: diffPhase(oldPhase, phase) });
    } else {
      annotated.push({ phase, diff: { status: 'added' } });
    }
  }

  for (let i = 0; i < oldOrder.length; i++) {
    const key = oldOrder[i];
    if (!key) continue;
    if (!consumed.has(key)) {
      const oldPhase = oldMap.get(key)!;
      let insertIdx = annotated.length;
      for (let j = i - 1; j >= 0; j--) {
        const prevKey = oldOrder[j];
        if (!prevKey) continue;
        if (consumed.has(prevKey)) {
          const matchIdx = annotated.findIndex(a => phaseKey(a.phase) === prevKey);
          if (matchIdx >= 0) {
            insertIdx = matchIdx + 1;
            break;
          }
        }
      }
      annotated.splice(insertIdx, 0, { phase: oldPhase, diff: { status: 'removed' } });
    }
  }

  return {
    name: newPipeline.name,
    phases: annotated,
    summary: buildSummary(annotated),
  };
}
