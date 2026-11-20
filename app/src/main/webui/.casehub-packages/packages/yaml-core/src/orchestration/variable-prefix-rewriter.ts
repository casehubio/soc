const VAR_RE = /\$\{([^}]+)}/g;

export function rewriteVariablePrefixes(
  input: string,
  defaultPrefix: string,
  knownPrefixes: Set<string>,
  forEachVars: Set<string>,
): string {
  return input.replace(VAR_RE, (match, content: string) => {
    const defaultSep = content.indexOf(':-');
    const varPart = defaultSep >= 0 ? content.substring(0, defaultSep) : content;
    const defaultVal = defaultSep >= 0 ? content.substring(defaultSep) : '';
    const dot = varPart.indexOf('.');
    if (dot >= 0) {
      const prefix = varPart.substring(0, dot);
      if (knownPrefixes.has(prefix)) return match;
      if (forEachVars.has(prefix)) return `\${each.${varPart}${defaultVal}}`;
    } else {
      if (forEachVars.has(varPart)) return `\${each.${varPart}${defaultVal}}`;
    }
    return `\${${defaultPrefix}.${varPart}${defaultVal}}`;
  });
}
