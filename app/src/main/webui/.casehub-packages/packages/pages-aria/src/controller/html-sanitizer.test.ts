import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './html-sanitizer.js';

describe('sanitizeHtml', () => {
  it('passes through SVG elements', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect fill="red" width="50" height="50"/></svg>';
    const result = sanitizeHtml(svg);
    expect(result).toContain('<svg');
    expect(result).toContain('<rect');
  });

  it('strips script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<script');
    expect(result).toContain('Hello');
  });

  it('strips event handler attributes', () => {
    const html = '<svg onclick="alert(1)"><rect fill="red"/></svg>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('onclick');
  });

  it('allows CSS custom properties in style', () => {
    const svg = '<rect style="fill: var(--pages-neutral-3)"/>';
    const result = sanitizeHtml(`<svg>${svg}</svg>`);
    expect(result).toContain('var(--pages-neutral-3)');
  });

  it('strips style values with url()', () => {
    const svg = '<rect style="background: url(evil.png)"/>';
    const result = sanitizeHtml(`<svg>${svg}</svg>`);
    expect(result).not.toContain('url(');
  });

  it('strips iframe elements', () => {
    const html = '<iframe src="evil.com"></iframe>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<iframe');
  });

  it('allows SVG text elements', () => {
    const svg = '<svg><text fill="var(--pages-neutral-12)" x="10" y="20">Label</text></svg>';
    const result = sanitizeHtml(svg);
    expect(result).toContain('<text');
    expect(result).toContain('Label');
  });

  it('strips form elements', () => {
    const html = '<form action="evil"><input type="text"/></form>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<form');
    expect(result).not.toContain('<input');
  });

  it('allows gradient elements', () => {
    const svg = '<svg><defs><linearGradient id="g1"><stop offset="0" stop-color="red"/></linearGradient></defs></svg>';
    const result = sanitizeHtml(svg);
    expect(result).toContain('linearGradient');
    expect(result).toContain('stop');
  });

  it('strips javascript: in href', () => {
    const html = '<svg><text href="javascript:alert(1)">click</text></svg>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('javascript:');
  });
});
