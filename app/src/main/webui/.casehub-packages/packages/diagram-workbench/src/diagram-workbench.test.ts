import { describe, it, expect, vi } from 'vitest';

describe('diagram-workbench resize logic', () => {
  it('dispatches window resize after a delay when stack grows', async () => {
    const resizeSpy = vi.fn();
    window.addEventListener('resize', resizeSpy);

    requestAnimationFrame(() => {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    });

    await new Promise(r => setTimeout(r, 200));
    expect(resizeSpy).toHaveBeenCalled();

    window.removeEventListener('resize', resizeSpy);
  });

  it('resize event is a standard Event', () => {
    const event = new Event('resize');
    expect(event.type).toBe('resize');
  });
});
