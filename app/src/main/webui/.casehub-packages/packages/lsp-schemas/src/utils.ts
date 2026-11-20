import type { Scalar } from 'yaml';

export function offsetToPosition(content: string, offset: number) {
  let line = 0;
  let lastNewline = -1;
  for (let i = 0; i < offset; i++) {
    if (content[i] === '\n') { line++; lastNewline = i; }
  }
  return { line, character: offset - lastNewline - 1 };
}

export function scalarRange(content: string, scalar: Scalar) {
  const range = scalar.range!;
  return {
    start: offsetToPosition(content, range[0]),
    end: offsetToPosition(content, range[1]),
  };
}
