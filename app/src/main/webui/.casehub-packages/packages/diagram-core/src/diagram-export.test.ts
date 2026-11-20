import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { computeNodeBounds, computeExportViewport, exportDiagram } from './diagram-export.js';
import { toSvg, toPng } from 'html-to-image';

vi.mock('html-to-image', () => ({
  toSvg: vi.fn().mockResolvedValue('data:image/svg+xml;base64,fake'),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,fake'),
}));

const mockToSvg = vi.mocked(toSvg);
const mockToPng = vi.mocked(toPng);

beforeAll(() => {
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
  }
});

describe('computeNodeBounds', () => {
  it('returns zero bounds for empty array', () => {
    expect(computeNodeBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('computes bounds from a single node with measured dimensions', () => {
    const nodes = [{ position: { x: 10, y: 20 }, measured: { width: 100, height: 50 } }];
    expect(computeNodeBounds(nodes)).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('computes bounds from a single node with explicit width/height', () => {
    const nodes = [{ position: { x: 5, y: 15 }, width: 200, height: 80 }];
    expect(computeNodeBounds(nodes)).toEqual({ x: 5, y: 15, width: 200, height: 80 });
  });

  it('uses defaults when no dimensions are provided', () => {
    const nodes = [{ position: { x: 0, y: 0 } }];
    expect(computeNodeBounds(nodes)).toEqual({ x: 0, y: 0, width: 150, height: 40 });
  });

  it('prefers measured over explicit dimensions', () => {
    const nodes = [{ position: { x: 0, y: 0 }, measured: { width: 300, height: 100 }, width: 150, height: 40 }];
    expect(computeNodeBounds(nodes)).toEqual({ x: 0, y: 0, width: 300, height: 100 });
  });

  it('computes bounding box across multiple nodes', () => {
    const nodes = [
      { position: { x: 0, y: 0 }, measured: { width: 100, height: 50 } },
      { position: { x: 200, y: 100 }, measured: { width: 100, height: 50 } },
      { position: { x: 50, y: 300 }, measured: { width: 80, height: 30 } },
    ];
    expect(computeNodeBounds(nodes)).toEqual({ x: 0, y: 0, width: 300, height: 330 });
  });

  it('handles negative positions', () => {
    const nodes = [
      { position: { x: -100, y: -50 }, measured: { width: 100, height: 50 } },
      { position: { x: 100, y: 100 }, measured: { width: 100, height: 50 } },
    ];
    expect(computeNodeBounds(nodes)).toEqual({ x: -100, y: -50, width: 300, height: 200 });
  });
});

describe('computeExportViewport', () => {
  it('returns identity for zero-size bounds', () => {
    expect(computeExportViewport({ x: 0, y: 0, width: 0, height: 0 }, 1920, 1080)).toEqual({
      x: 0, y: 0, zoom: 1,
    });
  });

  it('zooms to fit a small diagram into a large target', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 100 };
    const vp = computeExportViewport(bounds, 1920, 1080, 20);
    // padded: 240 x 140, zoom = min(1920/240, 1080/140) = min(8, 7.714) = 7.714
    expect(vp.zoom).toBeCloseTo(7.714, 2);
  });

  it('zooms down for a large diagram', () => {
    const bounds = { x: 0, y: 0, width: 4000, height: 3000 };
    const vp = computeExportViewport(bounds, 1920, 1080, 20);
    // padded: 4040 x 3040, zoom = min(1920/4040, 1080/3040) = min(0.475, 0.355) = 0.5 (MIN_ZOOM clamped)
    expect(vp.zoom).toBe(0.5);
  });

  it('centres the diagram within the target', () => {
    const bounds = { x: 0, y: 0, width: 920, height: 520 };
    const vp = computeExportViewport(bounds, 1920, 1080, 20);
    // padded: 960 x 560, zoom = min(1920/960, 1080/560) = min(2, 1.928) ≈ 1.928
    expect(vp.zoom).toBeCloseTo(1.928, 2);
    // x = (1920 - 960 * z) / 2 - (0 - 20) * z
    // y = (1920 and 1080 - padded * z) / 2 centred
    expect(vp.x).toBeGreaterThan(0);
    expect(vp.y).toBeGreaterThan(0);
  });

  it('handles non-zero origin bounds', () => {
    const bounds = { x: 500, y: 300, width: 200, height: 100 };
    const vp = computeExportViewport(bounds, 1920, 1080, 20);
    // The viewport x/y should offset to bring the bounds into view
    expect(vp.x).toBeLessThan(0);
    expect(vp.y).toBeLessThan(0);
  });
});

describe('exportDiagram', () => {
  beforeEach(() => {
    mockToSvg.mockClear();
    mockToPng.mockClear();
  });

  it('throws when viewport element is not found', async () => {
    const el = document.createElement('div');
    await expect(exportDiagram(el, [], 'png')).rejects.toThrow('viewport not found');
  });

  it('finds the viewport and calls toPng for png format', async () => {
    const el = document.createElement('div');
    const viewport = document.createElement('div');
    viewport.classList.add('react-flow__viewport');
    el.appendChild(viewport);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const nodes = [{ position: { x: 0, y: 0 }, measured: { width: 200, height: 100 } }];
    await exportDiagram(el, nodes, 'png', 'test-diagram');

    expect(mockToPng).toHaveBeenCalledWith(viewport, expect.objectContaining({
      width: 1920,
      height: 1080,
      pixelRatio: 2,
    }));
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('calls toSvg for svg format without pixelRatio', async () => {
    const el = document.createElement('div');
    const viewport = document.createElement('div');
    viewport.classList.add('react-flow__viewport');
    el.appendChild(viewport);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const nodes = [{ position: { x: 0, y: 0 }, measured: { width: 200, height: 100 } }];
    await exportDiagram(el, nodes, 'svg');

    expect(mockToSvg).toHaveBeenCalledWith(viewport, expect.not.objectContaining({
      pixelRatio: expect.anything(),
    }));

    clickSpy.mockRestore();
  });

  it('uses correct filename with extension', async () => {
    const el = document.createElement('div');
    const viewport = document.createElement('div');
    viewport.classList.add('react-flow__viewport');
    el.appendChild(viewport);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function(this: HTMLAnchorElement) {
      expect(this.download).toBe('my-case.png');
    });

    const nodes = [{ position: { x: 0, y: 0 }, measured: { width: 100, height: 50 } }];
    await exportDiagram(el, nodes, 'png', 'my-case');

    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });
});
