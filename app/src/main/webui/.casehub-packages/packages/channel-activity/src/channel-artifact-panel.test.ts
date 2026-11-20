import { describe, it, expect, afterEach } from 'vitest';
import './channel-artifact-panel.js';
import type { ArtefactRef, ResolvedArtifact } from './types.js';

function makeRef(overrides: Partial<ArtefactRef> = {}): ArtefactRef {
  return { uri: 'doc://case-123/report.md', type: 'DOCUMENT', label: 'Case Report', ...overrides };
}

describe('agency-channel-artifact-panel', () => {
  let element: HTMLElement;

  afterEach(() => { element?.remove(); });

  it('shows empty state when no artifact selected', async () => {
    element = document.createElement('agency-channel-artifact-panel') as any;
    document.body.appendChild(element);
    await (element as any).updateComplete;

    expect(element.shadowRoot!.querySelector('.empty')?.textContent).toContain('Select a message');
  });

  it('renders artifact header with label and type badge', async () => {
    element = document.createElement('agency-channel-artifact-panel') as any;
    (element as any).selectedArtefactRef = makeRef({ label: 'Risk Report', type: 'DOCUMENT' });
    document.body.appendChild(element);
    await (element as any).updateComplete;

    expect(element.shadowRoot!.querySelector('.artifact-label')?.textContent).toBe('Risk Report');
    expect(element.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('DOCUMENT');
  });

  it('renders card view for CASE type artifacts', async () => {
    element = document.createElement('agency-channel-artifact-panel') as any;
    (element as any).selectedArtefactRef = makeRef({ type: 'CASE', label: 'Case AML-4521', uri: 'case://aml-4521' });
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const card = element.shadowRoot!.querySelector('.artifact-card');
    expect(card).not.toBeNull();
    expect(card?.querySelector('.card-label')?.textContent).toBe('Case AML-4521');
  });

  it('calls resolveArtifact callback and renders content', async () => {
    element = document.createElement('agency-channel-artifact-panel') as any;
    const ref = makeRef({ type: 'CODE', label: 'main.ts' });
    (element as any).resolveArtifact = async (_r: ArtefactRef): Promise<ResolvedArtifact> =>
      ({ content: 'console.log("hello")', language: 'typescript' });
    (element as any).selectedArtefactRef = ref;
    document.body.appendChild(element);
    await (element as any).updateComplete;
    await new Promise(r => setTimeout(r, 10));
    await (element as any).updateComplete;

    expect(element.shadowRoot!.querySelector('.content-text')?.textContent).toBe('console.log("hello")');
  });

  it('maintains navigation history', async () => {
    element = document.createElement('agency-channel-artifact-panel') as any;
    document.body.appendChild(element);

    (element as any).selectedArtefactRef = makeRef({ uri: 'doc://a', label: 'A' });
    await (element as any).updateComplete;

    (element as any).selectedArtefactRef = makeRef({ uri: 'doc://b', label: 'B' });
    await (element as any).updateComplete;

    const backBtn = element.shadowRoot!.querySelector('.nav-back') as HTMLButtonElement;
    expect(backBtn.disabled).toBe(false);

    backBtn.click();
    await (element as any).updateComplete;
    expect(element.shadowRoot!.querySelector('.artifact-label')?.textContent).toBe('A');
  });

  it('renders scope highlight when selectedText present', async () => {
    element = document.createElement('agency-channel-artifact-panel') as any;
    (element as any).selectedArtefactRef = makeRef({
      scope: { startLine: 10, endLine: 15, selectedText: 'highlighted section' },
    });
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const highlight = element.shadowRoot!.querySelector('.scope-highlight');
    expect(highlight?.textContent).toContain('highlighted section');
    expect(highlight?.textContent).toContain('10');
  });
});
