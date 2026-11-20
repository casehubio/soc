import type { Fact, FactBase } from './types.js';

export function createFactBase(): FactBase {
  const store = new Map<string, Fact>();

  function key(subject: string, predicate: string): string {
    return `${subject}\0${predicate}`;
  }

  return {
    assert(subject, predicate, value) {
      store.set(key(subject, predicate), { subject, predicate, value });
    },
    has(subject, predicate) {
      return store.has(key(subject, predicate));
    },
    get(subject, predicate) {
      return store.get(key(subject, predicate))?.value;
    },
    query(predicate) {
      const results: Array<{ subject: string; value: unknown }> = [];
      for (const fact of store.values()) {
        if (fact.predicate === predicate) {
          results.push({ subject: fact.subject, value: fact.value });
        }
      }
      return results;
    },
    facts() {
      return [...store.values()];
    },
  };
}
