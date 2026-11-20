import { parse as parseYaml } from 'yaml';

export function detectDiagramType(yaml: string): string {
  try {
    const parsed = parseYaml(yaml) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') return 'unknown';

    const spec = parsed['spec'] as Record<string, unknown> | undefined;
    if (spec?.['decomposition']) return 'htn';
    if (spec && (spec['bindings'] || spec['workers'])) return 'case';

    if (parsed['document'] && parsed['do']) return 'swf';

    return 'unknown';
  } catch {
    return 'unknown';
  }
}
