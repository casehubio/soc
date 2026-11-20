import type { PartsCollection, AvatarSize, FamilyPalette, HeadFaceSpec, PartAssignment } from './types.js';
import { DetailLevel, DETAIL_TIERS } from './types.js';
import { HEAD_FACE_SPECS, CANONICAL_FACE, PART_DELTAS } from './config-table.js';


const LAYER_ORDER: readonly string[] = [
  'costume', 'head', 'eyes', 'nose', 'mouth', 'hair', 'hat', 'beard', 'expression', 'brow', 'glasses', 'prop', 'acc',
];

type PosGroup = 'eye-split' | 'nose' | 'mouth' | 'beard' | 'hat' | 'hair' | 'none';

function posGroup(category: string): PosGroup {
  switch (category) {
    case 'eyes': case 'brow': case 'glasses': case 'expression':
      return 'eye-split';
    case 'nose':
      return 'nose';
    case 'mouth':
      return 'mouth';
    case 'beard':
      return 'beard';
    case 'hat':
      return 'hat';
    case 'hair':
      return 'hair';
    default:
      return 'none';
  }
}

function splitAtRightEye(content: string): [string, string] {
  const idx = content.indexOf('<!-- Right eye');
  if (idx !== -1) return [content.substring(0, idx), content.substring(idx)];
  return splitByCenter(content);
}

function splitByCenter(content: string): [string, string] {
  const lines = content.split('\n');
  const left: string[] = [];
  const right: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('<!--')) continue;
    const xMatch = trimmed.match(/\bx="(\d+(?:\.\d+)?)"/);
    const widthMatch = trimmed.match(/\bwidth="(\d+(?:\.\d+)?)"/);
    if (xMatch && widthMatch) {
      const centerX = parseFloat(xMatch[1]!) + parseFloat(widthMatch[1]!) / 2;
      (centerX < 100 ? left : right).push(line);
    } else {
      left.push(line);
    }
  }
  return [left.join('\n'), right.join('\n')];
}

function wrapTranslate(content: string, dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return content;
  return `<g transform="translate(${dx},${dy})">${content}</g>`;
}

interface Layer {
  readonly category: string;
  readonly partId: string;
  readonly content: string;
}

function collectLayers(config: PartAssignment, detail: DetailLevel, collection: PartsCollection): Layer[] {
  const layers: Layer[] = [];

  function add(category: string, partId: string | null): void {
    if (partId === null) return;
    const key = `${category}:${partId}`;
    const content = collection.parts.get(key);
    if (content) layers.push({ category, partId, content });
  }

  add('costume', config.costume);
  add('head', config.head);
  add('eyes', config.eyes);
  add('nose', config.nose);
  add('mouth', config.mouth);
  add('hair', config.hair);

  if (detail >= DetailLevel.MD) {
    add('hat', config.hat);
  }

  add('beard', config.facialHair === 'none' ? null : config.facialHair);

  if (detail >= DetailLevel.SM) {
    add('expression', config.expression);
  }

  add('brow', config.eyebrows);

  if (detail >= DetailLevel.SM) {
    add('glasses', config.glasses);
  }

  if (detail >= DetailLevel.MD) {
    for (const p of config.props) {
      add('prop', p);
    }
  }

  if (detail >= DetailLevel.LG) {
    for (const a of config.accessories) {
      add('acc', a);
    }
  }

  return layers;
}

function applyPalette(svg: string, palette: FamilyPalette): string {
  return svg
    .replaceAll('var(--skin)', palette.skin)
    .replaceAll('var(--primary)', palette.primary)
    .replaceAll('var(--secondary)', palette.secondary)
    .replaceAll('var(--accent)', palette.accent)
    .replaceAll('var(--hair-color)', palette.hairColor)
    .replaceAll('var(--iris)', palette.iris)
    .replaceAll('var(--iris-dark)', palette.irisDark);
}

function sortByLayerOrder(layers: Layer[]): Layer[] {
  return [...layers].sort((a, b) => {
    const ai = LAYER_ORDER.indexOf(a.category);
    const bi = LAYER_ORDER.indexOf(b.category);
    return ai - bi;
  });
}

function partDelta(l: Layer): { dx: number; dy: number } {
  const d = PART_DELTAS[`${l.category}:${l.partId}`];
  return { dx: d?.dx ?? 0, dy: d?.dy ?? 0 };
}

function renderLayer(l: Layer, spec: HeadFaceSpec): string {
  const tag = `data-part="${l.category}:${l.partId}"`;
  const group = posGroup(l.category);
  const faceLift = Math.round(spec.yOffset * -0.2);
  const pd = partDelta(l);

  if (group === 'eye-split') {
    const eyeYDelta = spec.eyeY - CANONICAL_FACE.eyeY + faceLift + pd.dy;
    const leftXDelta = spec.eyeLeftX - CANONICAL_FACE.eyeLeftX + pd.dx;
    const rightXDelta = spec.eyeRightX - CANONICAL_FACE.eyeRightX + pd.dx;

    if (leftXDelta === 0 && rightXDelta === 0 && eyeYDelta === 0) {
      return `  <g ${tag}>${l.content}</g>`;
    }

    const [leftContent, rightContent] = l.category === 'eyes'
      ? splitAtRightEye(l.content)
      : splitByCenter(l.content);

    const hasLeft = leftContent.trim().length > 0;
    const hasRight = rightContent.trim().length > 0;

    if (!hasLeft && !hasRight) return `  <g ${tag}>${l.content}</g>`;

    const parts: string[] = [];
    if (hasLeft) parts.push(wrapTranslate(leftContent, leftXDelta, eyeYDelta));
    if (hasRight) parts.push(wrapTranslate(rightContent, rightXDelta, eyeYDelta));
    return `  <g ${tag}>${parts.join('')}</g>`;
  }

  if (group === 'nose') {
    const dy = spec.noseY - CANONICAL_FACE.noseY + faceLift + pd.dy;
    const dx = pd.dx;
    const inner = (dx !== 0 || dy !== 0) ? wrapTranslate(l.content, dx, dy) : l.content;
    return `  <g ${tag}>${inner}</g>`;
  }

  if (group === 'mouth') {
    const dy = spec.mouthY - CANONICAL_FACE.mouthY + faceLift + pd.dy;
    const dx = pd.dx;
    const inner = (dx !== 0 || dy !== 0) ? wrapTranslate(l.content, dx, dy) : l.content;
    return `  <g ${tag}>${inner}</g>`;
  }

  if (group === 'beard') {
    const dy = spec.beardDy + pd.dy;
    const dx = pd.dx;
    const inner = (dx !== 0 || dy !== 0) ? wrapTranslate(l.content, dx, dy) : l.content;
    return `  <g ${tag}>${inner}</g>`;
  }

  if (group === 'hair') {
    const dy = hairShift(l.content, spec.yOffset) + pd.dy;
    const inner = (pd.dx !== 0 || dy !== 0) ? wrapTranslate(l.content, pd.dx, dy) : l.content;
    return `  <g ${tag}>${inner}</g>`;
  }

  if (group === 'hat') {
    const dy = spec.yOffset + pd.dy;
    const dx = pd.dx;
    const inner = (dx !== 0 || dy !== 0) ? wrapTranslate(l.content, dx, dy) : l.content;
    return `  <g ${tag}>${inner}</g>`;
  }

  const scaled = l.category === 'prop' ? normalizeProp(l.content) : l.content;
  return `  <g ${tag}>${scaled}</g>`;
}

function hairShift(content: string, yOffset: number): number {
  if (yOffset === 0) return 0;
  let minY = Infinity;
  const pathM = content.match(/M\s*\d+,(\d+)/);
  if (pathM) minY = parseInt(pathM[1]!, 10);
  const re = /\by="(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) minY = Math.min(minY, parseInt(m[1]!, 10));
  if (minY === Infinity) return Math.round(yOffset * 0.5);
  const headroom = 30 - minY;
  const factor = headroom >= 8 ? 0.6 : headroom >= 4 ? 0.35 : 0.15;
  return Math.round(yOffset * factor);
}

const TARGET_PROP_AREA = 1244;
const MAX_UP_SCALE = 3;
const MIN_DOWN_SCALE = 0.3;

function normalizeProp(content: string): string {
  const re = /\bx="(\d+)"\s+y="(\d+)"\s+width="(\d+)"\s+height="(\d+)"/g;
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const x = parseInt(m[1]!, 10), y = parseInt(m[2]!, 10);
    const w = parseInt(m[3]!, 10), h = parseInt(m[4]!, 10);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  if (minX === Infinity) return content;
  const area = (maxX - minX) * (maxY - minY);
  const ratio = TARGET_PROP_AREA / area;
  if (ratio > 0.85 && ratio < 1.2) return content;
  const rawScale = Math.sqrt(ratio);
  let scale = rawScale * 0.7 + 0.3;
  scale = Math.max(MIN_DOWN_SCALE, Math.min(scale, MAX_UP_SCALE));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return `<g transform="translate(${cx},${cy}) scale(${scale.toFixed(2)}) translate(${-cx},${-cy})">${content}</g>`;
}

let _uid = 0;

export function buildAvatar(
  config: PartAssignment,
  palette: FamilyPalette,
  size: AvatarSize,
  collection: PartsCollection,
): string {
  const detail = DETAIL_TIERS[size];
  const layers = collectLayers(config, detail, collection);
  const sorted = sortByLayerOrder(layers);
  const spec = HEAD_FACE_SPECS[config.head] ?? CANONICAL_FACE;
  const uid = _uid++;
  let inner = sorted.map(l => renderLayer(l, spec)).join('\n');
  inner = inner.replace(/id="([^"]+)"/g, (_, id) => `id="${id}-${uid}"`).replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${id}-${uid})`);
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" role="img">\n${inner}\n</svg>`;
  return applyPalette(raw, palette);
}
