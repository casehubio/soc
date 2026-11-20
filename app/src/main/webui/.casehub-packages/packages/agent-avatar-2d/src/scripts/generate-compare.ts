import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAvatar } from '../builder.js';
import { ARCHETYPE_CONFIGS } from '../config-table.js';
import { FAMILY_PALETTES } from '../palettes.js';
import { registerCollection } from '../collections/registry.js';
import { mythicCollection } from '../collections/mythic/index.js';
import type { ArchetypeFamily } from '../types.js';

registerCollection(mythicCollection);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../compare.html');

const CHARS = [
  'Sage/Mentor',
  'Hero/Warrior',
  'Explorer/Adventurer',
  'Rebel/Maverick',
  'Caregiver/Angel',
  'Magician/Engineer',
];

function renderChar(key: string): string {
  const config = ARCHETYPE_CONFIGS[key]!;
  const family = key.split('/')[0]! as ArchetypeFamily;
  const palette = FAMILY_PALETTES[family]!;
  return buildAvatar(config, palette, 'lg', mythicCollection);
}

let panels = '';
for (const key of CHARS) {
  const sub = key.split('/')[1]!;
  const svg = renderChar(key);
  panels += `
  <div class="compare-row">
    <div class="panel">
      <h3>${sub} — 4x</h3>
      <div class="avatar-4x">${svg}</div>
    </div>
    <div class="panel">
      <h3>${sub} — 2x</h3>
      <div class="avatar-2x">${svg}</div>
      <div class="size-row">
        <div class="avatar-1x">${svg}</div>
      </div>
    </div>
  </div>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Avatar Comparison</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    padding: 24px;
  }
  h1 { text-align: center; color: #fff; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #888; margin-bottom: 24px; font-size: 14px; }
  .compare-row {
    display: flex;
    gap: 32px;
    justify-content: center;
    align-items: flex-start;
    margin-bottom: 32px;
  }
  .panel {
    background: #16213e;
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }
  .panel h3 { margin-bottom: 8px; font-size: 14px; color: #aaa; }
  .avatar-4x svg { display: block; width: 400px; height: 480px; image-rendering: pixelated; }
  .avatar-2x svg { display: block; width: 200px; height: 240px; image-rendering: pixelated; }
  .avatar-1x svg { display: block; width: 128px; height: 154px; image-rendering: pixelated; }
  .size-row {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    justify-content: center;
    margin-top: 12px;
  }
</style>
</head>
<body>
<h1>Avatar Detail Check</h1>
<p class="subtitle">6 characters at 4x, 2x, and 1x scale</p>
${panels}
</body>
</html>`;

writeFileSync(OUT, html);
console.log(`Compare page written to ${OUT}`);
