import type { CloudEventSpec } from './types.js';

export interface EventEmitter {
  emit(event: CloudEventSpec): CloudEventSpec;
  readonly emittedEvents: readonly CloudEventSpec[];
}

let idCounter = 0;
function generateId(): string {
  idCounter++;
  const ts = Date.now().toString(36);
  const seq = idCounter.toString(36).padStart(4, '0');
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}-${seq}-${rand}`;
}

export class DefaultEventEmitter implements EventEmitter {
  private readonly events: CloudEventSpec[] = [];
  private readonly defaultSource: string | undefined;

  constructor(defaultSource?: string) {
    this.defaultSource = defaultSource;
  }

  emit(event: CloudEventSpec): CloudEventSpec {
    const source = event.source ?? this.defaultSource;
    const base: Record<string, unknown> = { ...event };
    base.id = event.id ?? generateId();
    base.specversion = event.specversion ?? '1.0';
    if (source !== undefined) base.source = source;
    base.time = event.time ?? new Date().toISOString();
    const resolved = base as unknown as CloudEventSpec;
    this.events.push(resolved);
    return resolved;
  }

  get emittedEvents(): readonly CloudEventSpec[] {
    return this.events;
  }
}
