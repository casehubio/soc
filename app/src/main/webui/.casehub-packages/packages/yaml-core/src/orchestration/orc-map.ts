export interface OrcMap<K, V> {
  get(key: K): V | undefined;
  put(key: K, value: V): V | undefined;
  putIfAbsent(key: K, value: V): V | undefined;
  computeIfAbsent(key: K, mappingFunction: (key: K) => V): V;
  merge(key: K, value: V, remappingFunction: (oldVal: V, newVal: V) => V): V;
  remove(key: K): V | undefined;
  containsKey(key: K): boolean;
  size(): number;
}

export class DefaultOrcMap<K, V> implements OrcMap<K, V> {
  private readonly map = new Map<K, V>();

  get(key: K): V | undefined { return this.map.get(key); }
  put(key: K, value: V): V | undefined {
    const old = this.map.get(key);
    this.map.set(key, value);
    return old;
  }
  putIfAbsent(key: K, value: V): V | undefined {
    const existing = this.map.get(key);
    if (existing !== undefined) return existing;
    this.map.set(key, value);
    return undefined;
  }
  computeIfAbsent(key: K, mappingFunction: (key: K) => V): V {
    const existing = this.map.get(key);
    if (existing !== undefined) return existing;
    const computed = mappingFunction(key);
    this.map.set(key, computed);
    return computed;
  }
  merge(key: K, value: V, remappingFunction: (oldVal: V, newVal: V) => V): V {
    const existing = this.map.get(key);
    const result = existing !== undefined ? remappingFunction(existing, value) : value;
    this.map.set(key, result);
    return result;
  }
  remove(key: K): V | undefined {
    const old = this.map.get(key);
    this.map.delete(key);
    return old;
  }
  containsKey(key: K): boolean { return this.map.has(key); }
  size(): number { return this.map.size; }
}
