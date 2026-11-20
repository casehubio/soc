import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import './casehub-speech.js';

const mockProcessor = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  onaudioprocess: null as any,
};
const mockSource = { connect: vi.fn(), disconnect: vi.fn() };
const mockAudioCtx = {
  sampleRate: 48000,
  destination: {},
  createMediaStreamSource: vi.fn(() => mockSource),
  createScriptProcessor: vi.fn(() => mockProcessor),
};

async function createElement(disabled = false) {
  const el = document.createElement('casehub-speech') as any;
  el.disabled = disabled;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', class { sampleRate = mockAudioCtx.sampleRate; destination = mockAudioCtx.destination; createMediaStreamSource = mockAudioCtx.createMediaStreamSource; createScriptProcessor = mockAudioCtx.createScriptProcessor; });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('CasehubSpeech', () => {
  it('has correct ARIA attributes', async () => {
    const el = await createElement();
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toBe('Speech controls');
  });

  it('renders mic button with aria-pressed=false initially', async () => {
    const el = await createElement();
    const btn = el.shadowRoot!.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn!.getAttribute('aria-pressed')).toBe('false');
    expect(btn!.textContent).toContain('Mic');
  });

  it('button is disabled when disabled property is true', async () => {
    const el = await createElement(true);
    const btn = el.shadowRoot!.querySelector('button');
    expect(btn!.disabled).toBe(true);
  });

  it('emits speech:start on first click', async () => {
    const el = await createElement();
    const events: CustomEvent[] = [];
    el.addEventListener('speech:start', (e: Event) => events.push(e as CustomEvent));

    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    });

    const btn = el.shadowRoot!.querySelector('button')!;
    btn.click();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.sampleRate).toBe(16000);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('emits speech:stop on second click', async () => {
    const el = await createElement();
    const stopEvents: CustomEvent[] = [];
    el.addEventListener('speech:stop', (e: Event) => stopEvents.push(e as CustomEvent));

    const mockTrack = { stop: vi.fn() };
    const mockStream = { getTracks: () => [mockTrack] };
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    });

    const btn = el.shadowRoot!.querySelector('button')!;
    btn.click();
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));

    btn.click();
    await el.updateComplete;
    // Wait for 500ms trailing capture delay (matches original)
    await new Promise(r => setTimeout(r, 600));
    await el.updateComplete;

    expect(stopEvents).toHaveLength(1);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });
});
