import { describe, it, expect, afterEach } from 'vitest';
import './document-timeline.js';

afterEach(() => { document.body.innerHTML = ''; });

describe('document-timeline', () => {
  it('hides when no snapshots', async () => {
    const el = document.createElement('document-timeline') as any;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.classList.contains('hidden')).toBe(true);
  });

  it('renders markers for snapshots', async () => {
    const el = document.createElement('document-timeline') as any;
    el._snapshots = [
      { label: 'Initial', round: 0, commitHash: 'abc', documentPath: 'spec.md' },
      { label: 'Round 1', round: 1, commitHash: 'def', documentPath: 'spec.md' },
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const markers = el.shadowRoot!.querySelectorAll('.marker');
    expect(markers.length).toBe(2);
  });

  it('emits timeline-comparison-changed on click', async () => {
    const el = document.createElement('document-timeline') as any;
    el._snapshots = [
      { label: 'Initial', round: 0, commitHash: 'abc', documentPath: 'spec.md' },
      { label: 'Round 1', round: 1, commitHash: 'def', documentPath: 'spec.md' },
      { label: 'Round 2', round: 2, commitHash: 'ghi', documentPath: 'spec.md' },
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    let detail: any = null;
    el.addEventListener('timeline-comparison-changed', (e: CustomEvent) => { detail = e.detail; });

    const markers = el.shadowRoot!.querySelectorAll('.marker');
    markers[1].click();

    expect(detail).toBeTruthy();
    expect(detail.indexA).toBeDefined();
    expect(detail.indexB).toBeDefined();
  });

  it('auto-selects last two snapshots', async () => {
    const el = document.createElement('document-timeline') as any;
    el.configure({ sessionId: 's-1' });
    document.body.appendChild(el);
    await el.updateComplete;

    let detail: any = null;
    el.addEventListener('timeline-comparison-changed', (e: CustomEvent) => { detail = e.detail; });

    el._handleEntries([
      { entryType: 'ROUND_SNAPSHOT', content: 'Initial', round: 0, commitHash: 'abc', documentPath: 'spec.md' },
      { entryType: 'ROUND_SNAPSHOT', content: 'Round 1', round: 1, commitHash: 'def', documentPath: 'spec.md' },
    ]);
    await el.updateComplete;

    expect(detail).toBeTruthy();
    expect(detail.indexA).toBe(0);
    expect(detail.indexB).toBe(1);
  });

  it('renders connectors between markers', async () => {
    const el = document.createElement('document-timeline') as any;
    el._snapshots = [
      { label: 'Initial', round: 0, commitHash: 'abc', documentPath: 'spec.md' },
      { label: 'Round 1', round: 1, commitHash: 'def', documentPath: 'spec.md' },
      { label: 'Round 2', round: 2, commitHash: 'ghi', documentPath: 'spec.md' },
    ];
    document.body.appendChild(el);
    await el.updateComplete;

    const connectors = el.shadowRoot!.querySelectorAll('.connector');
    expect(connectors.length).toBe(2);
  });
});
