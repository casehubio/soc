import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showSpotlight, dismissAllSpotlights } from './spotlight.js';

describe('spotlight', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    dismissAllSpotlights();
  });

  afterEach(() => {
    dismissAllSpotlights();
    document.body.innerHTML = '';
  });

  function addTarget(): HTMLElement {
    const el = document.createElement('div');
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Test Region');
    el.style.position = 'fixed';
    el.style.left = '100px';
    el.style.top = '100px';
    el.style.width = '200px';
    el.style.height = '50px';
    document.body.appendChild(el);
    return el;
  }

  it('creates backdrop, ring, and callout elements', () => {
    addTarget();
    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Hello spotlight',
      position: 'right',
      duration: 0,
    });

    expect(document.querySelector('.scenario-spotlight-backdrop')).not.toBeNull();
    expect(document.querySelector('.scenario-spotlight-ring')).not.toBeNull();
    expect(document.querySelector('.scenario-spotlight-callout')).not.toBeNull();
    expect(document.querySelector('.scenario-spotlight-callout')!.textContent).toBe('Hello spotlight');
  });

  it('callout has aria-live for accessibility', () => {
    addTarget();
    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Accessible callout',
    });

    const callout = document.querySelector('.scenario-spotlight-callout')!;
    expect(callout.getAttribute('role')).toBe('status');
    expect(callout.getAttribute('aria-live')).toBe('polite');
  });

  it('injects spotlight styles idempotently', () => {
    addTarget();
    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'First',
    });
    dismissAllSpotlights();
    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Second',
    });

    const styles = document.querySelectorAll('#scenario-spotlight-styles');
    expect(styles.length).toBe(1);
  });

  it('dismissAllSpotlights removes all elements', () => {
    addTarget();
    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Will be dismissed',
    });

    expect(document.querySelector('.scenario-spotlight-backdrop')).not.toBeNull();
    dismissAllSpotlights();
    expect(document.querySelector('.scenario-spotlight-backdrop')).toBeNull();
    expect(document.querySelector('.scenario-spotlight-ring')).toBeNull();
    expect(document.querySelector('.scenario-spotlight-callout')).toBeNull();
  });

  it('auto-dismisses after duration', async () => {
    addTarget();
    const promise = showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Timed',
      duration: 50,
    });

    expect(document.querySelector('.scenario-spotlight-backdrop')).not.toBeNull();
    await promise;
    expect(document.querySelector('.scenario-spotlight-backdrop')).toBeNull();
  });

  it('backdrop has clip-path for cutout', () => {
    addTarget();
    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Cutout test',
    });

    const backdrop = document.querySelector('.scenario-spotlight-backdrop') as HTMLElement;
    expect(backdrop.style.clipPath).toContain('polygon');
  });

  it('renders multiple rings for additional targets', () => {
    addTarget();
    const extra = document.createElement('div');
    extra.setAttribute('role', 'button');
    extra.setAttribute('aria-label', 'Extra Target');
    extra.style.cssText = 'position:fixed;left:400px;top:200px;width:100px;height:30px;';
    document.body.appendChild(extra);

    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Multi-target',
      also: [{ role: 'button', name: 'Extra Target' }],
    });

    const rings = document.querySelectorAll('.scenario-spotlight-ring');
    expect(rings.length).toBe(2);
    expect(document.querySelectorAll('.scenario-spotlight-callout').length).toBe(1);
    expect(document.querySelectorAll('.scenario-spotlight-backdrop').length).toBe(1);
  });

  it('renders separate callouts for also targets with content', () => {
    addTarget();
    const extra = document.createElement('div');
    extra.setAttribute('role', 'button');
    extra.setAttribute('aria-label', 'Annotated');
    extra.style.cssText = 'position:fixed;left:400px;top:200px;width:100px;height:30px;';
    document.body.appendChild(extra);

    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Primary callout',
      also: [{ role: 'button', name: 'Annotated', content: 'Secondary callout' }],
    });

    const callouts = document.querySelectorAll('.scenario-spotlight-callout');
    expect(callouts.length).toBe(2);
    expect(callouts[0].textContent).toBe('Primary callout');
    expect(callouts[1].textContent).toBe('Secondary callout');
  });

  it('also target without content gets ring only', () => {
    addTarget();
    const extra = document.createElement('div');
    extra.setAttribute('role', 'button');
    extra.setAttribute('aria-label', 'RingOnly');
    extra.style.cssText = 'position:fixed;left:400px;top:200px;width:100px;height:30px;';
    document.body.appendChild(extra);

    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Only callout',
      also: [{ role: 'button', name: 'RingOnly' }],
    });

    const callouts = document.querySelectorAll('.scenario-spotlight-callout');
    expect(callouts.length).toBe(1);
    expect(callouts[0].textContent).toBe('Only callout');
  });

  it('dismissAllSpotlights clears multi-target rings', () => {
    addTarget();
    const extra = document.createElement('div');
    extra.setAttribute('role', 'button');
    extra.setAttribute('aria-label', 'Extra2');
    extra.style.cssText = 'position:fixed;left:400px;top:200px;width:100px;height:30px;';
    document.body.appendChild(extra);

    void showSpotlight({
      target: { role: 'region', name: 'Test Region' },
      content: 'Multi dismiss',
      also: [{ role: 'button', name: 'Extra2' }],
    });

    expect(document.querySelectorAll('.scenario-spotlight-ring').length).toBe(2);
    dismissAllSpotlights();
    expect(document.querySelectorAll('.scenario-spotlight-ring').length).toBe(0);
  });
});
