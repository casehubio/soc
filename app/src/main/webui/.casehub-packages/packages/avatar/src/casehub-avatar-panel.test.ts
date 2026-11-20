import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('talkinghead', () => ({
  TalkingHead: class {
    showAvatar = vi.fn().mockResolvedValue(undefined);
    speakAudio = vi.fn().mockResolvedValue(undefined);
    get isSpeaking() { return false; }
  },
}));

import './casehub-avatar-panel.js';

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

let mockWs: MockWebSocket;

beforeEach(() => {
  mockWs = new MockWebSocket();
  const WsCtor = class { constructor() { return mockWs; } static readonly OPEN = 1; };
  vi.stubGlobal('WebSocket', WsCtor);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function createElement(avatarUrl = './test.glb') {
  const el = document.createElement('casehub-avatar-panel') as any;
  el.avatarUrl = avatarUrl;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('CasehubAvatarPanel', () => {
  it('has correct ARIA attributes', async () => {
    const el = await createElement();
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Avatar conversation');
  });

  it('composes avatar, transcript, and speech components', async () => {
    const el = await createElement();
    const avatar = el.shadowRoot!.querySelector('casehub-avatar');
    const transcript = el.shadowRoot!.querySelector('casehub-transcript');
    const speech = el.shadowRoot!.querySelector('casehub-speech');
    expect(avatar).toBeTruthy();
    expect(transcript).toBeTruthy();
    expect(speech).toBeTruthy();
  });

  it('shows connection status', async () => {
    const el = await createElement();
    const status = el.shadowRoot!.querySelector('.status');
    expect(status).toBeTruthy();
  });

  it('passes avatarUrl to child avatar component', async () => {
    const el = await createElement('./custom.glb');
    const avatar = el.shadowRoot!.querySelector('casehub-avatar') as any;
    expect(avatar.getAttribute('avatar-url')).toBe('./custom.glb');
  });

  it('disables speech when not connected', async () => {
    const el = await createElement();
    const speech = el.shadowRoot!.querySelector('casehub-speech') as any;
    expect(speech.disabled).toBe(true);
  });

  it('enables speech when connected', async () => {
    const el = await createElement();
    mockWs.onopen!();
    await el.updateComplete;
    const speech = el.shadowRoot!.querySelector('casehub-speech') as any;
    expect(speech.disabled).toBe(false);
  });

  it('wires speech:start event to controller', async () => {
    const el = await createElement();
    mockWs.onopen!();
    await el.updateComplete;

    const speech = el.shadowRoot!.querySelector('casehub-speech')!;
    speech.dispatchEvent(new CustomEvent('speech:start', {
      detail: { sampleRate: 16000 }, bubbles: true, composed: true,
    }));

    expect(mockWs.sent.length).toBeGreaterThanOrEqual(1);
    const sent = JSON.parse(mockWs.sent[0]);
    expect(sent.type).toBe('start');
    expect(sent.sampleRate).toBe(16000);
  });

  it('wires speech:audio event to controller binary send', async () => {
    const el = await createElement();
    mockWs.onopen!();
    await el.updateComplete;

    const speech = el.shadowRoot!.querySelector('casehub-speech')!;
    const buf = new ArrayBuffer(16);
    speech.dispatchEvent(new CustomEvent('speech:audio', {
      detail: { buffer: buf }, bubbles: true, composed: true,
    }));

    expect(mockWs.sent).toContain(buf);
  });

  it('wires speech:stop event to controller', async () => {
    const el = await createElement();
    mockWs.onopen!();
    await el.updateComplete;

    const speech = el.shadowRoot!.querySelector('casehub-speech')!;
    speech.dispatchEvent(new CustomEvent('speech:stop', {
      detail: {}, bubbles: true, composed: true,
    }));

    const sent = JSON.parse(mockWs.sent[0]);
    expect(sent.type).toBe('stop');
  });
});
