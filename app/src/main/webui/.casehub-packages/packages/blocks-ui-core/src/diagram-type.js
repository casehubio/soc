import { parse as parseYaml } from 'yaml';
export function detectDiagramType(yaml) {
    try {
        const parsed = parseYaml(yaml);
        if (!parsed || typeof parsed !== 'object')
            return 'unknown';
        const spec = parsed['spec'];
        if (spec?.['decomposition'])
            return 'htn';
        if (spec && (spec['bindings'] || spec['workers']))
            return 'case';
        if (parsed['document'] && parsed['do'])
            return 'swf';
        return 'unknown';
    }
    catch {
        return 'unknown';
    }
}
//# sourceMappingURL=diagram-type.js.map