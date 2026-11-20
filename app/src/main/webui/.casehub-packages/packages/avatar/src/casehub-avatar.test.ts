import { describe, it, expect, vi, afterEach } from 'vitest';

const mockShowAvatar = vi.fn().mockResolvedValue(undefined);

vi.mock('talkinghead', () => ({
  TalkingHead: class {
    showAvatar = mockShowAvatar;
    scene = null;
  },
}));

import './casehub-avatar.js';

async function createElement(avatarUrl = './test.glb') {
  const el = document.createElement('casehub-avatar') as any;
  el.avatarUrl = avatarUrl;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('CasehubAvatar', () => {
  it('has correct ARIA attributes', async () => {
    const el = await createElement();
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('3D avatar');
  });

  it('sets aria-busy during loading', async () => {
    const el = await createElement();
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('creates a container div in shadow DOM', async () => {
    const el = await createElement();
    const container = el.shadowRoot!.querySelector('.avatar-container');
    expect(container).toBeTruthy();
  });

  it('exposes default property values', async () => {
    const el = await createElement();
    expect(el.body).toBe('F');
    expect(el.mood).toBe('neutral');
    expect(el.cameraView).toBe('head');
    expect(el.cameraRotate).toBe(true);
    expect(el.cameraZoom).toBe(true);
    expect(el.cameraPan).toBe(true);
    expect(el.lipsyncLang).toBe('en');
    expect(el.speed).toBe(0.9);
  });

  it('calls TalkingHead showAvatar on init', async () => {
    const el = await createElement('./custom.glb');
    await new Promise(r => setTimeout(r, 50));
    expect(mockShowAvatar).toHaveBeenCalledWith(
      expect.objectContaining({ url: './custom.glb', body: 'F', avatarMood: 'neutral' })
    );
  });

  it('clears aria-busy after TalkingHead initializes', async () => {
    const el = await createElement();
    await new Promise(r => setTimeout(r, 50));
    expect(el.getAttribute('aria-busy')).toBe('false');
  });
});
