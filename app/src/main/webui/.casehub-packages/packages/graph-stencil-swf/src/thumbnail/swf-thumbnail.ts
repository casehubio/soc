import { toSwfGraph, wrapDoBlock } from '../adapter/swf-adapter.js';
import { SYNTHETIC_TYPES, SWF_TYPE_PREFIX } from '../types.js';

const MAX_CACHE_ENTRIES = 100;
const cache = new Map<string, Map<string, string>>();

export function createSwfThumbnailRenderer(): (doBlock: unknown, container: HTMLElement) => void {
  return (doBlock: unknown, container: HTMLElement) => {
    const cacheKey = JSON.stringify(doBlock);
    const width = container.clientWidth || 180;
    const height = container.clientHeight || 100;
    const sizeKey = `${width}x${height}`;

    let sizeCache = cache.get(cacheKey);
    if (sizeCache) {
      const cached = sizeCache.get(sizeKey);
      if (cached) {
        container.innerHTML = cached;
        return;
      }
    } else {
      sizeCache = new Map();
      if (cache.size >= MAX_CACHE_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(cacheKey, sizeCache);
    }

    const yaml = wrapDoBlock(doBlock);
    const { model } = toSwfGraph(yaml);

    const taskNodes = model.nodes.filter(n => {
      const rawType = n.type.startsWith(SWF_TYPE_PREFIX) ? n.type.slice(SWF_TYPE_PREFIX.length) : n.type;
      return !SYNTHETIC_TYPES.has(rawType);
    });

    if (taskNodes.length === 0) return;

    const scale = Math.min(width / 180, height / 100);
    const nodeW = Math.round(40 * scale);
    const nodeH = Math.round(14 * scale);
    const padX = 10;
    const padY = 8;
    const availH = height - padY * 2;
    const spacingY = Math.min(20, (availH - nodeH) / Math.max(taskNodes.length - 1, 1));
    const centerX = width / 2;

    const positioned = taskNodes.map((node, i) => ({
      id: node.id,
      type: node.type,
      label: String(node.properties['label'] ?? node.id.split('/').pop() ?? ''),
      x: centerX - nodeW / 2,
      y: padY + i * spacingY,
    }));

    const typeColors: Record<string, string> = {
      'swf-call': '#4a9eff',
      'swf-set': '#10b981',
      'swf-switch': '#f59e0b',
      'swf-raise': '#ef4444',
      'swf-try': '#6366f1',
      'swf-try-catch': '#f97316',
      'swf-generic': '#9ca3af',
    };

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    for (let i = 0; i < positioned.length - 1; i++) {
      const from = positioned[i]!;
      const to = positioned[i + 1]!;
      svg += `<line x1="${centerX}" y1="${from.y + nodeH}" x2="${centerX}" y2="${to.y}" stroke="currentColor" stroke-opacity="0.4" stroke-width="1"/>`;
    }

    for (const p of positioned) {
      const fill = typeColors[p.type] ?? '#9ca3af';
      svg += `<rect x="${p.x}" y="${p.y}" width="${nodeW}" height="${nodeH}" rx="2" fill="${fill}" opacity="0.8"/>`;
      const labelText = p.label.length > 6 ? p.label.slice(0, 5) + '…' : p.label;
      const fontSize = Math.round(6 * scale);
      svg += `<text x="${p.x + nodeW / 2}" y="${p.y + nodeH / 2 + 1}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="${fontSize}" font-family="sans-serif">${escapeXml(labelText)}</text>`;
    }

    svg += '</svg>';
    sizeCache.set(sizeKey, svg);
    container.innerHTML = svg;
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
