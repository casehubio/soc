import type { TokenMap, TokenLeaf } from '../types.js';

function oklchToApproxY(value: string): number | null {
  const match = value.match(/^oklch\((\d+\.?\d*)%/);
  if (!match) return null;
  return parseFloat(match[1]!) / 100;
}

function apcaContrast(textY: number, bgY: number): number {
  const sapc = textY > bgY
    ? Math.pow(bgY, 0.56) - Math.pow(textY, 0.57)
    : Math.pow(bgY, 0.65) - Math.pow(textY, 0.62);
  return Math.abs(sapc * 100);
}

function resolveVarRef(value: string, tokens: TokenMap): string | null {
  const match = value.match(/^var\(--pages-([a-z]+)-(\d+)\)$/);
  if (!match) return value;
  const [, group, step] = match;
  const g = tokens[group!] as TokenMap | undefined;
  if (!g) return null;
  const leaf = g[step!] as TokenLeaf | undefined;
  return leaf?.$value ?? null;
}

interface ContrastViolation {
  readonly textToken: string;
  readonly bgToken: string;
  readonly contrast: number;
  readonly required: number;
}

export function contrastCheck(tokens: TokenMap, params: Record<string, unknown>): TokenMap {
  const minContrast = (params['minContrast'] as number) ?? 60;
  const fix = (params['fix'] as boolean) ?? false;

  const roles = tokens['role'] as TokenMap | undefined;
  if (!roles) return tokens;

  const textBgPairs: [string, string][] = [
    ['text-primary', 'surface-primary'],
    ['text-secondary', 'surface-primary'],
    ['text-muted', 'surface-primary'],
    ['interactive', 'surface-primary'],
  ];

  const violations: ContrastViolation[] = [];

  for (const [textRole, bgRole] of textBgPairs) {
    const textLeaf = roles[textRole] as TokenLeaf | undefined;
    const bgLeaf = roles[bgRole] as TokenLeaf | undefined;
    if (!textLeaf || !bgLeaf) continue;

    const textRef = resolveVarRef(textLeaf.$value, tokens);
    const bgRef = resolveVarRef(bgLeaf.$value, tokens);
    if (!textRef || !bgRef) continue;

    const textY = oklchToApproxY(textRef);
    const bgY = oklchToApproxY(bgRef);
    if (textY === null || bgY === null) continue;

    const contrast = apcaContrast(textY, bgY);
    if (contrast < minContrast) {
      violations.push({ textToken: textRole, bgToken: bgRole, contrast, required: minContrast });
    }
  }

  if (violations.length === 0) return tokens;

  if (!fix) {
    const details = violations.map(v =>
      `${v.textToken} on ${v.bgToken}: APCA ${v.contrast.toFixed(1)} < ${v.required}`
    ).join('\n');
    throw new Error(`Contrast violations:\n${details}`);
  }

  return tokens;
}
