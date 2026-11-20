import { describe, it, expect } from 'vitest';
import { DIAGRAM_TAGS } from './diagram-tags.js';

describe('DIAGRAM_TAGS', () => {
  it('maps all four domain formats', () => {
    expect(DIAGRAM_TAGS).toEqual({
      case: 'casehub-diagram',
      swf: 'swf-diagram',
      htn: 'htn-diagram',
      org: 'blocks-org-diagram',
    });
  });

  it('does not include page format', () => {
    expect(DIAGRAM_TAGS).not.toHaveProperty('page');
  });
});
