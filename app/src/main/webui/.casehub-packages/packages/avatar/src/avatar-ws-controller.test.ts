import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AvatarWsController } from './avatar-ws-controller.js';
import type { AvatarWsHost } from './avatar-ws-controller.js';
import type { ConversationTurn, PlaybackItem } from './types.js';

class MockHost implements AvatarWsHost {
  controllers: any[] = [];
  turns: ConversationTurn[] = [];
  avatarAudioQueue: PlaybackItem[] = [];
  connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  updateCount = 0;
  addController(c: any) { this.controllers.push(c); }
  removeController() {}
  requestUpdate() { this.updateCount++; }
  get updateComplete() { return Promise.resolve(true); }
}

class MockWebSocket {
  readyState = 1;
  sent: any[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((evt: any) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send(data: any) { this.sent.push(data); }
  close() { this.readyState = 3; }
  static readonly OPEN = 1;
}

describe('AvatarWsController', () => {
  let host: MockHost;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    host = new MockHost();
    mockWs = new MockWebSocket();
    const WsCtor = class { constructor() { return mockWs; } static readonly OPEN = 1; };
    vi.stubGlobal('WebSocket', WsCtor);
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('registers itself with the host', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    expect(host.controllers).toContain(ctrl);
  });

  it('connects WebSocket on hostConnected', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    expect(host.connectionState).toBe('connecting');
  });

  it('updates connectionState on open', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();
    expect(host.connectionState).toBe('connected');
  });

  it('routes partial message to turns', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();

    mockWs.onmessage!({ data: JSON.stringify({ type: 'partial', text: 'Hel' }) });
    expect(host.turns).toHaveLength(1);
    expect(host.turns[0]!.role).toBe('user');
    expect(host.turns[0]!.status).toBe('partial');
    expect(host.turns[0]!.text).toBe('Hel');
  });

  it('routes transcript message — finalizes partial turn', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();

    mockWs.onmessage!({ data: JSON.stringify({ type: 'partial', text: 'Hel' }) });
    mockWs.onmessage!({ data: JSON.stringify({ type: 'transcript', text: 'Hello' }) });

    expect(host.turns).toHaveLength(1);
    expect(host.turns[0]!.status).toBe('final');
    expect(host.turns[0]!.text).toBe('Hello');
  });

  it('routes response message as avatar turn', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();

    mockWs.onmessage!({ data: JSON.stringify({ type: 'response', text: 'Hi there' }) });
    expect(host.turns).toHaveLength(1);
    expect(host.turns[0]!.role).toBe('avatar');
    expect(host.turns[0]!.text).toBe('Hi there');
  });

  it('stores phonemes as pending visemes', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();

    const visemes = [{ viseme: 'aa', startMs: 0, endMs: 80 }];
    mockWs.onmessage!({ data: JSON.stringify({ type: 'phonemes', data: visemes }) });
    // Phonemes are stored internally, consumed on next binary message
    expect(host.avatarAudioQueue).toHaveLength(0);
  });

  it('sendStart sends JSON text frame', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();

    ctrl.sendStart({ sampleRate: 16000 });
    const sent = JSON.parse(mockWs.sent[0]);
    expect(sent.type).toBe('start');
    expect(sent.sampleRate).toBe(16000);
  });

  it('sendAudio sends binary frame', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();

    const buf = new ArrayBuffer(16);
    ctrl.sendAudio(buf);
    expect(mockWs.sent[0]).toBe(buf);
  });

  it('sendText sends text message with type field', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();

    ctrl.sendText('Hello', { llmModel: 'haiku' });
    const sent = JSON.parse(mockWs.sent[0]);
    expect(sent.type).toBe('text');
    expect(sent.text).toBe('Hello');
    expect(sent.llmModel).toBe('haiku');
  });

  it('sendStop sends stop message', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();

    ctrl.sendStop();
    const sent = JSON.parse(mockWs.sent[0]);
    expect(sent.type).toBe('stop');
  });

  it('closes WebSocket on hostDisconnected', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    vi.spyOn(mockWs, 'close');
    ctrl.hostDisconnected();
    expect(mockWs.close).toHaveBeenCalled();
  });

  it('updates connectionState to disconnected on close', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    mockWs.onopen!();
    expect(host.connectionState).toBe('connected');

    mockWs.onclose!();
    expect(host.connectionState).toBe('disconnected');
  });

  it('does not send when WebSocket is not open', () => {
    const ctrl = new AvatarWsController(host, { wsUrl: '/ws/avatar' });
    ctrl.hostConnected();
    // Don't call onopen — WS not connected
    mockWs.readyState = 0;

    ctrl.sendStart({ sampleRate: 16000 });
    expect(mockWs.sent).toHaveLength(0);
  });
});
