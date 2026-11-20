import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAvatar } from '../builder.js';
import { ARCHETYPE_CONFIGS } from '../config-table.js';
import { FAMILY_PALETTES } from '../palettes.js';
import { registerCollection } from '../collections/registry.js';
import { mythicCollection } from '../collections/mythic/index.js';
import type { ArchetypeFamily, AvatarSize } from '../types.js';

registerCollection(mythicCollection);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../gallery.html');

const sizes: AvatarSize[] = ['xs', 'sm', 'md', 'lg'];
const families = [
  'Caregiver', 'Creator', 'Everyman', 'Explorer', 'Hero', 'Innocent',
  'Jester', 'Lover', 'Magician', 'Rebel', 'Sage', 'Sovereign',
] as const;

let cards = '';

for (const family of families) {
  const palette = FAMILY_PALETTES[family]!;
  const subs = Object.keys(ARCHETYPE_CONFIGS)
    .filter(k => k.startsWith(`${family}/`))
    .sort();

  cards += `<div class="family-row">
    <h2 style="color:${palette.primary};border-bottom:3px solid ${palette.primary}">${family}</h2>
    <div class="sub-grid">\n`;

  for (const key of subs) {
    const config = ARCHETYPE_CONFIGS[key]!;
    const sub = key.split('/')[1]!;
    const svgLg = buildAvatar(config, palette, 'lg', mythicCollection);
    const svgMd = buildAvatar(config, palette, 'md', mythicCollection);
    const svgSm = buildAvatar(config, palette, 'sm', mythicCollection);
    const svgXs = buildAvatar(config, palette, 'xs', mythicCollection);

    cards += `      <div class="card">
        <div class="avatar-row">
          <div class="av av-lg">${svgLg}</div>
          <div class="av av-md">${svgMd}</div>
          <div class="av av-sm">${svgSm}</div>
          <div class="av av-xs">${svgXs}</div>
        </div>
        <div class="label">${sub}</div>
        <div class="parts">${config.eyes} · ${config.nose} · ${config.mouth}</div>
      </div>\n`;
  }

  cards += `    </div>\n  </div>\n`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Archetype Avatar Gallery — Mythic Collection</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    padding: 24px;
  }
  h1 {
    text-align: center;
    font-size: 28px;
    margin-bottom: 8px;
    color: #fff;
  }
  .subtitle {
    text-align: center;
    color: #888;
    margin-bottom: 32px;
    font-size: 14px;
  }
  .family-row {
    margin-bottom: 40px;
  }
  .family-row h2 {
    font-size: 20px;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .sub-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .card {
    background: #16213e;
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }
  .avatar-row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .av svg { display: block; }
  .av-lg { width: 128px; height: 154px; }
  .av-md { width: 64px; height: 77px; }
  .av-sm { width: 40px; height: 48px; }
  .av-xs { width: 24px; height: 29px; }
  .label {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 4px;
  }
  .parts {
    font-size: 11px;
    color: #888;
  }
  @media (max-width: 900px) {
    .sub-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>
<h1>Archetype Avatar Gallery</h1>
<p class="subtitle">48 archetypes · 12 families · 4 size tiers (lg / md / sm / xs) · Mythic collection</p>
${cards}
</body>
</html>
`;

writeFileSync(OUT, html, 'utf-8');
console.log(`Gallery written to ${OUT}`);
