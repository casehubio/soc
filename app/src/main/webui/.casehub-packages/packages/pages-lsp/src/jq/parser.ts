export interface JqDiagnostic {
  offset: number;
  length: number;
  message: string;
}

export function validateJqExpression(expr: string): JqDiagnostic[] {
  const trimmed = expr.trim();
  if (!trimmed) return [];

  const triplePipe = trimmed.indexOf('|||');
  if (triplePipe !== -1) {
    return [{ offset: triplePipe, length: 3, message: 'Invalid pipe sequence' }];
  }

  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]!;
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') {
      depth--;
      if (depth < 0) {
        return [{ offset: i, length: 1, message: `Unmatched '${ch}'` }];
      }
    }
  }
  if (depth > 0) {
    return [{ offset: trimmed.length - 1, length: 1, message: 'Unclosed bracket or parenthesis' }];
  }

  return [];
}
