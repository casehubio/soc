import { registerTheme } from './runtime.js';
import { initPresets } from './transforms/index.js';
import { runPipeline } from './pipeline.js';
import { generateCSS, generateDensityCSS } from './output.js';
import { getBuiltinPreset, listBuiltinPresets } from './preset-loader.js';

initPresets();

const densityCSS = generateDensityCSS();

for (const name of listBuiltinPresets()) {
  const preset = getBuiltinPreset(name)!;
  const tokens = runPipeline(preset);
  const css = generateCSS(tokens, name) + '\n\n' + densityCSS;
  registerTheme(name, css);
}

import { LocalStorageThemeStorage } from './theme-storage.js';

try {
  if (typeof globalThis.localStorage === 'undefined') throw new Error('no localStorage');
  const storage = new LocalStorageThemeStorage();
  void storage.list().then(names => {
    for (const name of names) {
      void storage.load(name).then(config => {
        if (!config) return;
        try {
          const tokens = runPipeline(config);
          const themeCss = generateCSS(tokens, config.$name) + '\n\n' + densityCSS;
          registerTheme(config.$name, themeCss);
        } catch { /* invalid custom preset — skip */ }
      });
    }
  });
} catch { /* localStorage unavailable (SSR, test) — skip */ }
