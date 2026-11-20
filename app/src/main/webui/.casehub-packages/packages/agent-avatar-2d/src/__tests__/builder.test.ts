import { describe, it, expect, beforeAll } from 'vitest';
import { buildAvatar } from '../builder.js';
import { registerCollection, getCollection } from '../collections/registry.js';
import { ARCHETYPE_CONFIGS } from '../config-table.js';
import { FAMILY_PALETTES } from '../palettes.js';
import type { AvatarCollection } from '../types.js';

function stubCollection(): AvatarCollection {
  const parts = new Map<string, string>();
  parts.set('head:oval', '<ellipse cx="100" cy="95" rx="38" ry="42" fill="var(--skin)"/>');
  parts.set('eyes:narrow', '<g><ellipse cx="85" cy="90" rx="7" ry="3" fill="white"/><ellipse cx="85" cy="90" rx="3" ry="2" fill="var(--iris)"/></g>');
  parts.set('nose:aquiline', '<path d="M100,92 L100,104 L96,106" fill="none" stroke="rgba(0,0,0,0.2)"/>');
  parts.set('mouth:line-neutral', '<line x1="90" y1="114" x2="110" y2="114" stroke="rgba(0,0,0,0.3)"/>');
  parts.set('hair:bald-sides', '<path d="M62,88 Q62,55 80,50" fill="var(--hair-color)"/>');
  parts.set('costume:blazer-tie', '<path d="M60,240 L60,160" fill="var(--primary)"/>');
  parts.set('brow:thin-arched', '<path d="M74,81 Q80,77 96,80" fill="none" stroke="var(--hair-color)"/>');
  parts.set('glasses:round-wire', '<circle cx="85" cy="92" r="12" fill="none" stroke="#333"/>');
  parts.set('prop:magnifying-glass', '<circle cx="158" cy="175" r="18" stroke="var(--accent)"/>');
  parts.set('prop:notebook', '<rect x="150" y="170" width="20" height="28" fill="var(--accent)"/>');
  return { id: 'stub', partsUrl: '', previewUrl: '', parts };
}

describe('collection registry', () => {
  it('registers and retrieves collections', () => {
    registerCollection(stubCollection());
    const c = getCollection('stub');
    expect(c).toBeDefined();
    expect(c!.id).toBe('stub');
  });

  it('returns undefined for unknown collection', () => {
    expect(getCollection('nonexistent')).toBeUndefined();
  });
});

describe('buildAvatar', () => {
  beforeAll(() => {
    registerCollection(stubCollection());
  });

  it('produces valid SVG string', () => {
    const config = ARCHETYPE_CONFIGS['Sage/Detective']!;
    const palette = FAMILY_PALETTES['Sage']!;
    const registry = getCollection('stub')!;
    const svg = buildAvatar(config, palette, 'lg', registry);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('viewBox');
  });

  it('applies palette — no var(--skin/primary/secondary/accent/hair-color) remain', () => {
    const config = ARCHETYPE_CONFIGS['Sage/Detective']!;
    const palette = FAMILY_PALETTES['Sage']!;
    const registry = getCollection('stub')!;
    const svg = buildAvatar(config, palette, 'lg', registry);
    expect(svg).not.toContain('var(--skin)');
    expect(svg).not.toContain('var(--primary)');
    expect(svg).not.toContain('var(--secondary)');
    expect(svg).not.toContain('var(--accent)');
    expect(svg).not.toContain('var(--hair-color)');
    expect(svg).not.toContain('var(--iris)');
    expect(svg).not.toContain('var(--iris-dark)');
  });

  it('xs size omits props and glasses', () => {
    const config = ARCHETYPE_CONFIGS['Sage/Detective']!;
    const palette = FAMILY_PALETTES['Sage']!;
    const registry = getCollection('stub')!;
    const svg = buildAvatar(config, palette, 'xs', registry);
    expect(svg).not.toContain('magnifying');
    expect(svg).not.toContain('round-wire');
    expect(svg).toContain('ellipse');
  });

  it('md size includes props', () => {
    const config = ARCHETYPE_CONFIGS['Sage/Detective']!;
    const palette = FAMILY_PALETTES['Sage']!;
    const registry = getCollection('stub')!;
    const svg = buildAvatar(config, palette, 'md', registry);
    expect(svg).toContain('magnifying');
  });

  it('layers are in correct z-order: costume → head → eyes → nose → mouth → hair', () => {
    const config = ARCHETYPE_CONFIGS['Sage/Detective']!;
    const palette = FAMILY_PALETTES['Sage']!;
    const registry = getCollection('stub')!;
    const svg = buildAvatar(config, palette, 'lg', registry);
    const costumeIdx = svg.indexOf('data-part="costume:');
    const headIdx = svg.indexOf('data-part="head:');
    const eyesIdx = svg.indexOf('data-part="eyes:');
    const noseIdx = svg.indexOf('data-part="nose:');
    const mouthIdx = svg.indexOf('data-part="mouth:');
    const hairIdx = svg.indexOf('data-part="hair:');
    expect(costumeIdx).toBeLessThan(headIdx);
    expect(headIdx).toBeLessThan(eyesIdx);
    expect(eyesIdx).toBeLessThan(noseIdx);
    expect(noseIdx).toBeLessThan(mouthIdx);
    expect(mouthIdx).toBeLessThan(hairIdx);
  });

  it('gracefully handles missing parts', () => {
    const config = ARCHETYPE_CONFIGS['Hero/Warrior']!;
    const palette = FAMILY_PALETTES['Hero']!;
    const registry = getCollection('stub')!;
    const svg = buildAvatar(config, palette, 'lg', registry);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });
});
