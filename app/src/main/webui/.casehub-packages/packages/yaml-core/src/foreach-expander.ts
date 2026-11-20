import type { ForEachDirective, IterationGroup } from './types.js';
import { forEachContextSource } from './types.js';
import { isTruthy } from './truthiness.js';
import type { VariableResolver } from './variable-resolver.js';
import type { CsvDataSource } from './csv-parser.js';

export interface Reference {
  targetId: string;
  optional: boolean;
}

export interface ForEachAdapter<E> {
  stamp(template: E, stampedId: string, scopedResolver: VariableResolver): E;
  getForEach(element: E): ForEachDirective | null;
  getCondition(element: E): string | null;
  getReferences(element: E): Reference[];
  withReferences(element: E, rewritten: Reference[]): E;
}

export interface ExpansionResult<E> {
  elements: Map<string, E>;
  excludedIds: Set<string>;
}

export type IterationValueExpander = (resolvedValue: string, groupContext: string) => string[];

export function commaSplitExpander(): IterationValueExpander {
  return (value) =>
    value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

function resolveValues(
  inList: unknown[],
  resolver: VariableResolver,
  context: string,
  valueExpander: IterationValueExpander | null,
): string[] {
  const values: string[] = [];
  for (const item of inList) {
    let s = String(item);
    if (s.includes('${')) {
      s = resolver.resolveString(s, `forEach.${context}`);
    }
    if (valueExpander) {
      try {
        values.push(...valueExpander(s, context));
      } catch (e) {
        throw new Error(
          `IterationValueExpander failed for group '${context}': resolved value '${s}'`,
          { cause: e },
        );
      }
    } else {
      values.push(s);
    }
  }
  return values;
}

function resolveAs(
  forEach: ForEachDirective,
  iterationGroups: Record<string, IterationGroup>,
): string {
  if (forEach.type === 'inline') return forEach.as;
  if (forEach.as) return forEach.as;
  const group = iterationGroups[forEach.groupName];
  return group?.as ?? forEach.groupName;
}

function originalId(stampedId: string): string {
  const dot = stampedId.lastIndexOf('.');
  return dot >= 0 ? stampedId.substring(0, dot) : stampedId;
}

function extractValue(stampedId: string): string | null {
  const dot = stampedId.lastIndexOf('.');
  return dot >= 0 ? stampedId.substring(dot + 1) : null;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Preserve the published static facade.
export class ForEachExpander {
  static expand<E>(
    elements: Map<string, E>,
    iterationGroups: Record<string, IterationGroup>,
    resolver: VariableResolver,
    adapter: ForEachAdapter<E>,
    maxExpansion: number,
    valueExpander: IterationValueExpander | null = null,
  ): ExpansionResult<E> {
    const allElements = new Map<string, E>();
    const excludedIds = new Set<string>();
    const elementToGroup = new Map<string, string | null>();
    const groupValues = new Map<string, string[]>();

    for (const [elementId, element] of elements) {
      const forEach = adapter.getForEach(element);
      if (!forEach) {
        elementToGroup.set(elementId, null);
        continue;
      }

      let groupKey: string;
      if (forEach.type === 'group-ref') {
        groupKey = forEach.groupName;
        if (!groupValues.has(groupKey)) {
          const group = iterationGroups[groupKey];
          if (!group) {
            throw new Error(
              `forEach on '${elementId}' references unknown iteration group '${groupKey}'.`,
            );
          }
          const values = resolveValues(
            group.in, resolver, groupKey, valueExpander);
          groupValues.set(groupKey, values);
        }
      } else {
        groupKey = `__inline__${elementId}`;
        const values = resolveValues(forEach.in, resolver, elementId, valueExpander);
        groupValues.set(groupKey, values);
      }

      elementToGroup.set(elementId, groupKey);

      const values = groupValues.get(groupKey)!;
      if (values.length > maxExpansion) {
        throw new Error(
          `forEach template '${elementId}' would expand to ${values.length} elements (limit: ${maxExpansion}).`,
        );
      }
    }

    for (const [elementId, element] of elements) {
      const groupKey = elementToGroup.get(elementId)!;

      if (groupKey === null) {
        const condition = adapter.getCondition(element);
        if (condition !== null) {
          const resolved = resolver.resolveString(condition, elementId);
          if (!isTruthy(resolved)) {
            excludedIds.add(elementId);
            continue;
          }
        }
        allElements.set(elementId, adapter.stamp(element, elementId, resolver));
        continue;
      }

      const values = groupValues.get(groupKey)!;
      const forEach = adapter.getForEach(element)!;
      const as = resolveAs(forEach, iterationGroups);

      for (const value of values) {
        const stampedId = `${elementId}.${value}`;
        const eachResolver = resolver.withScope('each',
          forEachContextSource({ [as]: value }, null));

        const condition = adapter.getCondition(element);
        if (condition !== null) {
          const resolved = eachResolver.resolveString(condition, stampedId);
          if (!isTruthy(resolved)) {
            excludedIds.add(stampedId);
            continue;
          }
        }

        if (allElements.has(stampedId)) {
          throw new Error(
            `Duplicate stamped ID '${stampedId}' — forEach values must be unique within each template.`,
          );
        }
        allElements.set(stampedId, adapter.stamp(element, stampedId, eachResolver));
      }
    }

    rewriteReferences(allElements, excludedIds, elementToGroup, adapter);

    return { elements: allElements, excludedIds };
  }

  static expandWithCsv<E>(
    elements: Map<string, E>,
    iterationGroups: Record<string, IterationGroup>,
    dataSources: Record<string, CsvDataSource>,
    resolver: VariableResolver,
    adapter: ForEachAdapter<E>,
    maxExpansion: number,
  ): ExpansionResult<E> {
    const allElements = new Map<string, E>();
    const excludedIds = new Set<string>();
    const elementToGroup = new Map<string, string | null>();
    const groupValues = new Map<string, string[]>();
    const csvGroups = new Set<string>();

    for (const [elementId, element] of elements) {
      const forEach = adapter.getForEach(element);
      if (!forEach) {
        elementToGroup.set(elementId, null);
        continue;
      }

      let groupKey: string;
      if (forEach.type === 'group-ref') {
        groupKey = forEach.groupName;
        if (!groupValues.has(groupKey)) {
          const csv = dataSources[groupKey];
          if (csv && csv.rows.length > 0) {
            csvGroups.add(groupKey);
            const firstCol = csv.columns[0]!.name;
            const values = csv.rows.map((row) => String(row[firstCol]));
            groupValues.set(groupKey, values);
          } else {
            const group = iterationGroups[groupKey];
            if (!group) {
              throw new Error(
                `forEach on '${elementId}' references unknown group or data source '${groupKey}'.`,
              );
            }
            const values = resolveValues(group.in, resolver, groupKey, null);
            groupValues.set(groupKey, values);
          }
        }
      } else {
        groupKey = `__inline__${elementId}`;
        const values = resolveValues(forEach.in, resolver, elementId, null);
        groupValues.set(groupKey, values);
      }

      elementToGroup.set(elementId, groupKey);

      const values = groupValues.get(groupKey)!;
      if (values.length > maxExpansion) {
        throw new Error(
          `forEach template '${elementId}' would expand to ${values.length} elements (limit: ${maxExpansion}).`,
        );
      }
    }

    for (const [elementId, element] of elements) {
      const groupKey = elementToGroup.get(elementId)!;

      if (groupKey === null) {
        const condition = adapter.getCondition(element);
        if (condition !== null) {
          const resolved = resolver.resolveString(condition, elementId);
          if (!isTruthy(resolved)) {
            excludedIds.add(elementId);
            continue;
          }
        }
        allElements.set(elementId, adapter.stamp(element, elementId, resolver));
        continue;
      }

      const values = groupValues.get(groupKey)!;
      const forEach = adapter.getForEach(element)!;
      const as = resolveAs(forEach, iterationGroups);
      const isCsv = csvGroups.has(groupKey);

      if (isCsv) {
        const csv = dataSources[groupKey]!;
        for (let i = 0; i < csv.rows.length; i++) {
          const row = csv.rows[i]!;
          const rowKey = values[i]!;
          const stampedId = `${elementId}.${rowKey}`;

          const rowResolver = resolver.withScope('each',
            forEachContextSource(
              { [as]: rowKey, index: String(i) },
              { [as]: row },
            ));

          const condition = adapter.getCondition(element);
          if (condition !== null) {
            const resolved = rowResolver.resolveString(condition, stampedId);
            if (!isTruthy(resolved)) {
              excludedIds.add(stampedId);
              continue;
            }
          }

          if (allElements.has(stampedId)) {
            throw new Error(
              `Duplicate stamped ID '${stampedId}' — forEach values must be unique within each template.`,
            );
          }
          allElements.set(stampedId, adapter.stamp(element, stampedId, rowResolver));
        }
      } else {
        for (const value of values) {
          const stampedId = `${elementId}.${value}`;
          const eachResolver = resolver.withScope('each',
            forEachContextSource({ [as]: value }, null));

          const condition = adapter.getCondition(element);
          if (condition !== null) {
            const resolved = eachResolver.resolveString(condition, stampedId);
            if (!isTruthy(resolved)) {
              excludedIds.add(stampedId);
              continue;
            }
          }

          if (allElements.has(stampedId)) {
            throw new Error(
              `Duplicate stamped ID '${stampedId}' — forEach values must be unique within each template.`,
            );
          }
          allElements.set(stampedId, adapter.stamp(element, stampedId, eachResolver));
        }
      }
    }

    rewriteReferences(allElements, excludedIds, elementToGroup, adapter);

    return { elements: allElements, excludedIds };
  }
}

function rewriteReferences<E>(
  allElements: Map<string, E>,
  excludedIds: Set<string>,
  elementToGroup: Map<string, string | null>,
  adapter: ForEachAdapter<E>,
): void {
  for (const [stampedId, element] of [...allElements.entries()]) {
    const refs = adapter.getReferences(element);
    if (refs.length === 0) continue;

    const origId = originalId(stampedId);
    const sourceGroup = elementToGroup.get(origId) ?? null;
    const sourceValue = extractValue(stampedId);

    const rewritten: Reference[] = [];
    for (const ref of refs) {
      const targetGroup = elementToGroup.get(ref.targetId) ?? null;

      if (targetGroup === null) {
        rewritten.push(ref);
      } else if (targetGroup === sourceGroup && sourceValue !== null) {
        rewritten.push({ targetId: `${ref.targetId}.${sourceValue}`, optional: ref.optional });
      } else if (ref.optional) {
        // skip optional cross-group ref
      } else {
        throw new Error(
          `Element '${stampedId}' references forEach element '${ref.targetId}' in a different group.`,
        );
      }
    }

    for (const ref of rewritten) {
      if (excludedIds.has(ref.targetId) && !ref.optional) {
        throw new Error(
          `Element '${stampedId}' references excluded element '${ref.targetId}'.`,
        );
      }
    }

    allElements.set(stampedId, adapter.withReferences(element, rewritten));
  }
}
