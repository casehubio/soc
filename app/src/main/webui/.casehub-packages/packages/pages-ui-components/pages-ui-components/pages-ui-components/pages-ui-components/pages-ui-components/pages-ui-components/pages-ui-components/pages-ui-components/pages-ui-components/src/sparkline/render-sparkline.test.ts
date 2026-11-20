import { describe, it, expect } from 'vitest';
import { html, type TemplateResult } from 'lit';
import { renderSparkline } from './render-sparkline.js';

function renderToString(result: TemplateResult): string {
  if (!result || !('strings' in result)) return '';
  const strings = (result as any).strings as readonly string[];
  const values = (result as any).values as readonly unknown[];
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += String(values[i]);
  }
  return out;
}

describe('renderSparkline', () => {
  it('returns empty template for empty array', () => {
    const result = renderSparkline([]);
    expect(result).toEqual(html``);
  });

  it('returns empty template for single point', () => {
    const result = renderSparkline([0.5]);
    expect(result).toEqual(html``);
  });

  it('renders SVG for two points', () => {
    const rendered = renderToString(renderSparkline([0.2, 0.8]));
    expect(rendered).toContain('<svg');
    expect(rendered).toContain('<polyline');
    expect(rendered).toContain('<polygon');
  });

  it('renders SVG for normal data', () => {
    const rendered = renderToString(renderSparkline([0.1, 0.5, 0.3, 0.9, 0.7]));
    expect(rendered).toContain('<svg');
    expect(rendered).toContain('viewBox="0 0 80 24"');
  });

  it('respects width and height options', () => {
    const rendered = renderToString(renderSparkline([0.2, 0.8], { width: 48, height: 20 }));
    expect(rendered).toContain('viewBox="0 0 48 20"');
  });

  it('respects color option', () => {
    const rendered = renderToString(renderSparkline([0.2, 0.8], { color: '#ff0000' }));
    expect(rendered).toContain('stroke="#ff0000"');
  });

  it('defaults to currentColor', () => {
    const rendered = renderToString(renderSparkline([0.2, 0.8]));
    expect(rendered).toContain('stroke="currentColor"');
  });

  it('uses fixed domain when provided', () => {
    const withDomain = renderToString(
      renderSparkline([0.4, 0.6], { domain: [0, 1], height: 100 }),
    );
    const withoutDomain = renderToString(
      renderSparkline([0.4, 0.6], { height: 100 }),
    );
    expect(withDomain).not.toBe(withoutDomain);
  });

  it('generates unique gradient IDs per invocation', () => {
    const a = renderToString(renderSparkline([0.2, 0.8]));
    const b = renderToString(renderSparkline([0.3, 0.7]));
    const idA = a.match(/id="([^"]+)"/)?.[1];
    const idB = b.match(/id="([^"]+)"/)?.[1];
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
  });

  it('handles all identical values without crashing', () => {
    const rendered = renderToString(renderSparkline([0.5, 0.5, 0.5]));
    expect(rendered).toContain('<svg');
  });
});
