import { html, type TemplateResult } from 'lit';

export interface SparklineOptions {
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  readonly domain?: [number, number];
}

let nextId = 0;

export function renderSparkline(
  data: readonly number[],
  options?: SparklineOptions,
): TemplateResult {
  if (data.length < 2) return html``;

  const w = options?.width ?? 80;
  const h = options?.height ?? 24;
  const color = options?.color ?? 'currentColor';
  const gradientId = `spark-fill-${nextId++}`;

  let min: number;
  let max: number;
  if (options?.domain) {
    [min, max] = options.domain;
  } else {
    min = Math.min(...data);
    max = Math.max(...data);
  }
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const polygonPoints = `0,${h} ${points} ${w},${h}`;

  return html`
    <svg
      width="${w}"
      height="${h}"
      viewBox="0 0 ${w} ${h}"
      aria-hidden="true"
      class="sparkline"
    >
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.2" />
          <stop offset="100%" stop-color="${color}" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points="${polygonPoints}"
        fill="url(#${gradientId})"
      />
      <polyline
        points="${points}"
        fill="none"
        stroke="${color}"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
  `;
}
