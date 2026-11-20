import { ARCHETYPE_CONFIGS, HEAD_FACE_SPECS } from '../config-table.js';
import { buildAvatar } from '../builder.js';
import { FAMILY_PALETTES } from '../palettes.js';
import { mythicCollection } from '../collections/mythic/index.js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../../beard-test.html');

const families = ['Caregiver', 'Creator', 'Everyman', 'Explorer', 'Hero', 'Jester', 'Lover', 'Magician', 'Rebel', 'Sage', 'Sovereign'];

let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Beard Test</title>
<style>body{background:#1a1a2e;color:#eee;font-family:sans-serif;padding:24px}
.row{display:flex;gap:24px;margin-bottom:32px;flex-wrap:wrap}
.card{background:#16213e;border-radius:12px;padding:16px;text-align:center;width:180px}
.card svg{display:block;margin:0 auto}
h2{margin:8px 0 16px;color:#e44}</style></head><body>
<h1>Beard Calibration</h1>\n`;

for (const fam of families) {
  const entries = Object.entries(ARCHETYPE_CONFIGS).filter(([n]) => n.startsWith(fam + '/'));
  const hasBeard = entries.some(([, c]) => c.facialHair !== 'none');
  if (!hasBeard) continue;

  html += `<h2>${fam}</h2><div class="row">\n`;
  for (const [name, config] of entries) {
    if (config.facialHair === 'none') continue;
    const sub = name.split('/')[1]!;
    const palette = FAMILY_PALETTES[fam as keyof typeof FAMILY_PALETTES];
    const svg = buildAvatar(config, palette, 'lg', mythicCollection);
    const spec = HEAD_FACE_SPECS[config.head];
    html += `<div class="card">
      ${svg}
      <div style="margin-top:8px;font-weight:bold">${sub}</div>
      <div style="font-size:11px;color:#888">${config.head} beardDy=${spec?.beardDy} ${config.facialHair}</div>
    </div>\n`;
  }
  html += `</div>\n`;
}
html += `</body></html>`;

writeFileSync(outPath, html);
console.log(`Written ${outPath}`);
