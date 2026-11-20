import { describe, it, expect } from 'vitest';
import { DefaultEventEmitter } from './emit-event-emitter.js';
import type { CloudEventSpec } from './types.js';

describe('DefaultEventEmitter', () => {
  it('emits an event and records it', () => {
    const emitter = new DefaultEventEmitter();
    const event: CloudEventSpec = { type: 'test.event', data: { key: 'val' } };
    const resolved = emitter.emit(event);
    expect(resolved.type).toBe('test.event');
    expect(resolved.data).toEqual({ key: 'val' });
    expect(emitter.emittedEvents).toHaveLength(1);
    expect(emitter.emittedEvents[0]).toBe(resolved);
  });

  it('assigns default id when not provided', () => {
    const emitter = new DefaultEventEmitter();
    const resolved = emitter.emit({ type: 'a.b', data: {} });
    expect(resolved.id).toBeDefined();
    expect(typeof resolved.id).toBe('string');
    expect(resolved.id!.length).toBeGreaterThan(0);
  });

  it('preserves provided id', () => {
    const emitter = new DefaultEventEmitter();
    const resolved = emitter.emit({ type: 'a.b', data: {}, id: 'custom-id' });
    expect(resolved.id).toBe('custom-id');
  });

  it('assigns specversion 1.0 when not provided', () => {
    const emitter = new DefaultEventEmitter();
    const resolved = emitter.emit({ type: 'a.b', data: {} });
    expect(resolved.specversion).toBe('1.0');
  });

  it('preserves provided specversion', () => {
    const emitter = new DefaultEventEmitter();
    const resolved = emitter.emit({ type: 'a.b', data: {}, specversion: '0.3' });
    expect(resolved.specversion).toBe('0.3');
  });

  it('assigns default source from constructor config', () => {
    const emitter = new DefaultEventEmitter('my-scenario');
    const resolved = emitter.emit({ type: 'a.b', data: {} });
    expect(resolved.source).toBe('my-scenario');
  });

  it('preserves provided source over default', () => {
    const emitter = new DefaultEventEmitter('default-source');
    const resolved = emitter.emit({ type: 'a.b', data: {}, source: '/custom' });
    expect(resolved.source).toBe('/custom');
  });

  it('assigns time when not provided', () => {
    const emitter = new DefaultEventEmitter();
    const resolved = emitter.emit({ type: 'a.b', data: {} });
    expect(resolved.time).toBeDefined();
    expect(() => new Date(resolved.time!)).not.toThrow();
  });

  it('preserves provided time', () => {
    const emitter = new DefaultEventEmitter();
    const resolved = emitter.emit({ type: 'a.b', data: {}, time: '2026-01-01T00:00:00Z' });
    expect(resolved.time).toBe('2026-01-01T00:00:00Z');
  });

  it('preserves extension attributes', () => {
    const emitter = new DefaultEventEmitter();
    const resolved = emitter.emit({ type: 'a.b', data: {}, priority: 'high', traceid: 'xyz' });
    expect((resolved as Record<string, unknown>).priority).toBe('high');
    expect((resolved as Record<string, unknown>).traceid).toBe('xyz');
  });

  it('emits batch and records all', () => {
    const emitter = new DefaultEventEmitter();
    emitter.emit({ type: 'a', data: {} });
    emitter.emit({ type: 'b', data: {} });
    emitter.emit({ type: 'c', data: {} });
    expect(emitter.emittedEvents).toHaveLength(3);
    expect(emitter.emittedEvents.map(e => e.type)).toEqual(['a', 'b', 'c']);
  });

  it('generates unique ids for each event', () => {
    const emitter = new DefaultEventEmitter();
    const r1 = emitter.emit({ type: 'a', data: {} });
    const r2 = emitter.emit({ type: 'b', data: {} });
    expect(r1.id).not.toBe(r2.id);
  });
});
