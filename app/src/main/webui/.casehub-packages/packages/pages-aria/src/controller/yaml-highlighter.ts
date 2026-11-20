import { parseDocument } from 'yaml';

export interface YamlToken {
  text: string;
  type: 'key' | 'string' | 'comment' | 'literal' | 'punct' | 'plain';
}

export interface LineRange {
  startLine: number;
  endLine: number;
}

const LITERAL_RE = /^(true|false|null|\d+(\.\d+)?)$/;

export function tokenizeYamlLine(line: string): YamlToken[] {
  if (line.length === 0) return [];

  const tokens: YamlToken[] = [];
  let rest = line;

  const leadingMatch = rest.match(/^(\s+)/);
  if (leadingMatch) {
    tokens.push({ text: leadingMatch[1], type: 'plain' });
    rest = rest.slice(leadingMatch[1].length);
  }

  if (rest.startsWith('#')) {
    tokens.push({ text: rest, type: 'comment' });
    return tokens;
  }

  if (rest.startsWith('- ')) {
    tokens.push({ text: '- ', type: 'punct' });
    rest = rest.slice(2);
  }

  const kvMatch = rest.match(/^([\w][\w.-]*)(:\s*)/);
  if (kvMatch) {
    tokens.push({ text: kvMatch[1], type: 'key' });
    tokens.push({ text: kvMatch[2], type: 'punct' });
    rest = rest.slice(kvMatch[0].length);
  }

  if (rest.length === 0) return tokens;

  const quotedMatch = rest.match(/^("[^"]*"|'[^']*')/);
  if (quotedMatch) {
    tokens.push({ text: quotedMatch[1], type: 'string' });
    rest = rest.slice(quotedMatch[1].length);
  } else {
    const commentIdx = rest.indexOf(' #');
    if (commentIdx >= 0) {
      const beforeComment = rest.slice(0, commentIdx + 1);
      const comment = rest.slice(commentIdx + 1);
      if (beforeComment.trim().length > 0) {
        const trimmed = beforeComment.trim();
        tokens.push({
          text: beforeComment,
          type: LITERAL_RE.test(trimmed) ? 'literal' : 'plain',
        });
      }
      tokens.push({ text: comment, type: 'comment' });
      rest = '';
    } else if (rest.trim().length > 0) {
      const trimmed = rest.trim();
      tokens.push({
        text: rest,
        type: LITERAL_RE.test(trimmed) ? 'literal' : 'plain',
      });
      rest = '';
    }
  }

  if (rest.length > 0) {
    const trailingComment = rest.match(/^(\s*)(#.*)/);
    if (trailingComment) {
      if (trailingComment[1]) tokens.push({ text: trailingComment[1], type: 'plain' });
      tokens.push({ text: trailingComment[2], type: 'comment' });
    } else if (rest.trim().length > 0) {
      tokens.push({ text: rest, type: 'plain' });
    }
  }

  return tokens;
}

function offsetToLine(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

export function buildStepLineMap(yamlSource: string): Map<string, LineRange> {
  const map = new Map<string, LineRange>();

  let doc;
  try {
    doc = parseDocument(yamlSource);
  } catch {
    return map;
  }

  const root = doc.get('sections');
  if (!root || !('items' in root)) return map;

  for (const section of (root as { items: { get(k: string): unknown; items?: unknown[]; range?: [number, number, number] }[] }).items) {
    const steps = section.get('steps');
    if (!steps || !('items' in (steps))) continue;

    for (const step of (steps as { items: { get(k: string): unknown; range?: [number, number, number] }[] }).items) {
      const range = step.range;
      if (!range) continue;

      const label = step.get('label') as string | undefined;
      const name = step.get('name') as string | undefined;
      const startLine = offsetToLine(yamlSource, range[0]);
      const endLine = offsetToLine(yamlSource, (range[2]) - 1);

      if (label) map.set(label, { startLine, endLine });
      if (name) map.set(name, { startLine, endLine });
    }
  }

  return map;
}
