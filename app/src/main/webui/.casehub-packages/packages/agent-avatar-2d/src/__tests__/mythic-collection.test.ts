import { describe, it, expect } from 'vitest';
import { mythicCollection } from '../collections/mythic/index.js';
import { ARCHETYPE_CONFIGS } from '../config-table.js';

describe('mythic collection', () => {
  it('has id "mythic"', () => {
    expect(mythicCollection.id).toBe('mythic');
  });

  it('provides parts for all config-referenced part IDs', () => {
    const neededIds = new Set<string>();
    for (const config of Object.values(ARCHETYPE_CONFIGS)) {
      neededIds.add(`head:${config.head}`);
      neededIds.add(`eyes:${config.eyes}`);
      neededIds.add(`nose:${config.nose}`);
      neededIds.add(`mouth:${config.mouth}`);
      neededIds.add(`hair:${config.hair}`);
      neededIds.add(`costume:${config.costume}`);
      neededIds.add(`brow:${config.eyebrows}`);
      if (config.facialHair !== 'none') neededIds.add(`beard:${config.facialHair}`);
      if (config.glasses) neededIds.add(`glasses:${config.glasses}`);
      if (config.hat) neededIds.add(`hat:${config.hat}`);
      if (config.expression) neededIds.add(`expression:${config.expression}`);
      for (const p of config.props) neededIds.add(`prop:${p}`);
      for (const a of config.accessories) neededIds.add(`acc:${a}`);
    }
    const missing = [...neededIds].filter(id => !mythicCollection.parts.has(id));
    expect(missing, `Missing parts: ${missing.join(', ')}`).toEqual([]);
  });

  it('every part contains valid SVG content', () => {
    for (const [id, content] of mythicCollection.parts.entries()) {
      expect(content, `${id} is empty`).toBeTruthy();
      expect(content, `${id} has no SVG elements`).toMatch(/<[a-z]/);
    }
  });

  it('has at least 100 parts', () => {
    expect(mythicCollection.parts.size).toBeGreaterThanOrEqual(100);
  });
});
