import { PageDocument } from '@casehubio/pages-document';
import { parseDocument, stringify } from 'yaml';

export function serializeNode(doc: PageDocument, path: readonly (string | number)[]): string {
  const fresh = parseDocument(doc.toString(), { keepSourceTokens: true });
  const node = fresh.getIn(path as (string | number)[], true);
  if (!node) return '';
  return stringify(node);
}

export function parseFragment(yaml: string): { type: string } | null {
  if (!yaml || !yaml.trim()) return null;
  try {
    const doc = parseDocument(yaml);
    if (doc.errors.length > 0) return null;
    const contents = doc.toJSON();
    if (typeof contents !== 'object' || contents === null) return null;
    if ('type' in contents) return { type: 'component' };
    if ('span' in contents) return { type: 'column' };
    if ('columns' in contents) return { type: 'row' };
    if ('rows' in contents || 'components' in contents || 'name' in contents) return { type: 'page' };
    return null;
  } catch {
    return null;
  }
}
