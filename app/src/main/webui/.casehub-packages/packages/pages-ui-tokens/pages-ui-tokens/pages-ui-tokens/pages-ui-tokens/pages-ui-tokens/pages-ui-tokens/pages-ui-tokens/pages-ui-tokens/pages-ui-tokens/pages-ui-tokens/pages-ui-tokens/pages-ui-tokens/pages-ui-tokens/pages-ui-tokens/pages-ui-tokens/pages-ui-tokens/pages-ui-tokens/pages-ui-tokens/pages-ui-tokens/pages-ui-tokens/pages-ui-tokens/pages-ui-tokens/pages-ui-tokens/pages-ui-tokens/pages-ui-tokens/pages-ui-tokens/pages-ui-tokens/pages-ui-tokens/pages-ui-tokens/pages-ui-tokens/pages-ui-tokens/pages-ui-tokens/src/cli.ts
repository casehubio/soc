import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initPresets } from './transforms/index.js';
import { runPipeline, buildInitialTokenMap } from './pipeline.js';
import { generateCSS, generateDTCG, generateDensityCSS } from './output.js';
import { getBuiltinPreset, listBuiltinPresets, resolvePresetChain } from './preset-loader.js';
import { getTransform } from './registry.js';
import type { TokenMap } from './types.js';
import { isTokenLeaf } from './types.js';

initPresets();

const [,, command, ...args] = process.argv;

function buildPreset(name: string, outDir: string): void {
  const preset = getBuiltinPreset(name);
  if (!preset) throw new Error(`Unknown preset: ${name}`);

  const tokens = runPipeline(preset);
  const css = generateCSS(tokens, name);
  const dtcg = generateDTCG(tokens, name);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.css`), css + '\n\n' + generateDensityCSS() + '\n');
  writeFileSync(join(outDir, `${name}.tokens.json`), JSON.stringify(dtcg, null, 2) + '\n');
  console.log(`  ✓ ${name}.css + ${name}.tokens.json`);
}

function debugPreset(name: string): void {
  const preset = getBuiltinPreset(name);
  if (!preset) throw new Error(`Unknown preset: ${name}`);

  const chain = resolvePresetChain(preset);
  console.log(`\nPreset: ${name}`);
  if (preset.$extends) console.log(`Extends: ${preset.$extends}`);
  console.log(`Pipeline (${chain.length} transforms):\n`);

  let tokens: TokenMap = buildInitialTokenMap();
  for (const def of chain) {
    const fn = getTransform(def.transform);
    tokens = fn(tokens, def.params ?? {});
    const count = countLeaves(tokens);
    console.log(`  [${def.transform}] → ${count} tokens`);
    if (def.params) console.log(`    params: ${JSON.stringify(def.params)}`);
  }
}

function countLeaves(tokens: TokenMap): number {
  let count = 0;
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) continue;
    if (isTokenLeaf(value)) count++;
    else count += countLeaves(value);
  }
  return count;
}

switch (command) {
  case 'build': {
    const outDir = resolve(args.find(a => a.startsWith('--out='))?.slice(6) ?? 'dist/themes');
    const presetArg = args.find(a => !a.startsWith('--'));
    const names = presetArg ? [presetArg] : listBuiltinPresets();
    console.log(`Building ${names.length} preset(s)...`);
    for (const name of names) buildPreset(name, outDir);
    console.log('Done.');
    break;
  }
  case 'validate': {
    const names = args.length > 0 ? args : listBuiltinPresets();
    console.log(`Validating ${names.length} preset(s)...`);
    let failed = false;
    for (const name of names) {
      try {
        const preset = getBuiltinPreset(name);
        if (!preset) throw new Error(`Unknown preset: ${name}`);
        runPipeline(preset);
        console.log(`  ✓ ${name}`);
      } catch (e) {
        console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`);
        failed = true;
      }
    }
    if (failed) process.exit(1);
    break;
  }
  case 'debug': {
    const name = args[0];
    if (!name) { console.error('Usage: pages-tokens debug <preset-name>'); process.exit(1); }
    debugPreset(name);
    break;
  }
  default:
    console.error('Usage: pages-tokens <build|validate|debug> [preset] [--out=dir]');
    process.exit(1);
}
