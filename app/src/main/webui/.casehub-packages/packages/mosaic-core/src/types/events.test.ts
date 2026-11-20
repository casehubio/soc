import { describe, it, expect } from 'vitest';
import { WorkItemEventTopics } from './events.js';

describe('WorkItemEventTopics', () => {
  it('uses colon separators per matchesTopic protocol', () => {
    expect(WorkItemEventTopics.SELECTED).toBe('work-item:selected');
    expect(WorkItemEventTopics.DESELECTED).toBe('work-item:deselected');
    expect(WorkItemEventTopics.QUEUE_SCOPE_CHANGED).toBe('queue:scope-changed');
  });

  it('does not have legacy QUEUE_SELECTED or QUEUE_DESELECTED', () => {
    expect('QUEUE_SELECTED' in WorkItemEventTopics).toBe(false);
    expect('QUEUE_DESELECTED' in WorkItemEventTopics).toBe(false);
  });
});
