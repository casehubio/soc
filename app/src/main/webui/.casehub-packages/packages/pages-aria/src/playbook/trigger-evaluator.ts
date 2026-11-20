import type { ScenarioScope } from '@casehubio/yaml-core/orchestration';
import type { VirtualClock } from './virtual-clock.js';
import type { DataTrigger, TimeTrigger } from './types.js';

export function evaluateTrigger(
  trigger: DataTrigger | TimeTrigger,
  scope: ScenarioScope,
  clock: VirtualClock,
): boolean {
  if (trigger.type === 'data') {
    return !scope.channel(trigger.channel).isEmpty();
  }
  if (trigger.type === 'time' && trigger.fireTime !== undefined) {
    return clock.now() >= trigger.fireTime;
  }
  return false;
}
