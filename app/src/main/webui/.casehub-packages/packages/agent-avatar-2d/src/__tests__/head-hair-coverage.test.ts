import { describe, it, expect } from 'vitest';
import { mythicCollection } from '../collections/mythic/index.js';
import { ARCHETYPE_CONFIGS } from '../config-table.js';

function headTopLeftX(headSvg: string): number | null {
  const m = headSvg.match(/d="M\s*(\d+),(\d+)/);
  return m ? Number(m[1]) : null;
}

function headTopRightX(headSvg: string): number | null {
  const m = headSvg.match(/d="M\s*(\d+),(\d+)\s+h(\d+)/);
  return m ? Number(m[1]) + Number(m[3]) : null;
}

function maxLeftInnerEdge(svg: string): number {
  let maxInner = 0;
  const re = /x="(\d+)"\s+y="(\d+)"\s+width="(\d+)"\s+height="(\d+)"/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const x = Number(m[1]), w = Number(m[3]), h = Number(m[4]);
    if (x < 80 && h >= 2) {
      maxInner = Math.max(maxInner, x + w);
    }
  }
  return maxInner;
}

function coversRightEdge(svg: string, headRight: number): boolean {
  const re = /x="(\d+)"\s+y="(\d+)"\s+width="(\d+)"\s+height="(\d+)"/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const x = Number(m[1]), w = Number(m[3]), h = Number(m[4]);
    if (h >= 2 && x <= headRight && x + w >= headRight) {
      return true;
    }
  }
  return false;
}

describe('head-hair coverage: no gaps at top corners', () => {
  it('combined head+hair left coverage reaches head top-left for every archetype', () => {
    const failures: string[] = [];

    for (const [key, config] of Object.entries(ARCHETYPE_CONFIGS)) {
      const headSvg = mythicCollection.parts.get(`head:${config.head}`) ?? '';
      const hairSvg = mythicCollection.parts.get(`hair:${config.hair}`) ?? '';
      const combined = headSvg + '\n' + hairSvg;

      const headLeft = headTopLeftX(headSvg);
      if (headLeft === null) continue;

      const innerEdge = maxLeftInnerEdge(combined);
      if (innerEdge > 0 && innerEdge < headLeft) {
        failures.push(`${key}: combined left inner (${innerEdge}) < head left (${headLeft}), gap=${headLeft - innerEdge}px`);
      }
    }

    expect(failures, `Coverage gaps:\n${failures.join('\n')}`).toEqual([]);
  });

  it('combined head+hair right coverage reaches head top-right for every archetype', () => {
    const failures: string[] = [];

    for (const [key, config] of Object.entries(ARCHETYPE_CONFIGS)) {
      const headSvg = mythicCollection.parts.get(`head:${config.head}`) ?? '';
      const hairSvg = mythicCollection.parts.get(`hair:${config.hair}`) ?? '';
      const combined = headSvg + '\n' + hairSvg;

      const headRight = headTopRightX(headSvg);
      if (headRight === null) continue;

      if (!coversRightEdge(combined, headRight)) {
        failures.push(`${key}: no rect covers head right edge (${headRight})`);
      }
    }

    expect(failures, `Coverage gaps:\n${failures.join('\n')}`).toEqual([]);
  });
});
