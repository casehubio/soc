/**
 * Recursively walks a data structure and replaces `${name}` patterns with values
 * from a properties map.
 *
 * IMPORTANT: Skips metric template fields (`html.html` and `html.javascript`)
 * which use `${value}`, `${title}`, `${this}` as render-time variables.
 *
 * @param data - The data structure to process
 * @param properties - Map of property names to their values
 * @returns A new data structure with substitutions applied
 */
export declare function substituteProperties(data: unknown, properties: Readonly<Record<string, string>>): unknown;
//# sourceMappingURL=property-substitution.d.ts.map