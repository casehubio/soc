import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './agent-manifest-editor.js';
import type { Manifest } from '@casehubio/mosaic-core';

type EditorEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  data: Manifest;
  endpoint: string;
  providersEndpoint: string;
  systemPrompt: string;
  devMode: boolean;
};

describe('agent-manifest-editor', () => {
  let el: EditorEl;

  beforeEach(() => {
    el = document.createElement('agent-manifest-editor') as EditorEl;
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  describe('ARIA', () => {
    it('renders with role="form" and aria-label', async () => {
      await el.updateComplete;
      expect(el.getAttribute('role')).toBe('form');
      expect(el.getAttribute('aria-label')).toBe('LLM configuration editor');
    });
  });

  describe('layout', () => {
    it('renders preset bar with 6 presets', async () => {
      await el.updateComplete;
      const presets = el.shadowRoot!.querySelectorAll('.preset-card');
      expect(presets.length).toBe(6);
    });

    it('renders provider cards (4 built-in + Other)', async () => {
      await el.updateComplete;
      const cards = el.shadowRoot!.querySelectorAll('manifest-provider-card');
      expect(cards.length).toBe(5);
    });

    it('renders alias editor section', async () => {
      await el.updateComplete;
      const aliasSection = el.shadowRoot!.querySelector('.alias-editor');
      expect(aliasSection).toBeTruthy();
    });
  });

  describe('system prompt preview', () => {
    it('shows prompt text when set', async () => {
      el.systemPrompt = 'You are a helpful assistant.';
      await el.updateComplete;
      const preview = el.shadowRoot!.querySelector('.prompt-preview');
      expect(preview?.textContent).toContain('You are a helpful assistant.');
    });

    it('shows empty state when no systemPrompt', async () => {
      await el.updateComplete;
      const preview = el.shadowRoot!.querySelector('.prompt-preview');
      expect(preview?.textContent).toContain('No personality profile configured');
    });
  });

  describe('dev mode', () => {
    it('banner hidden by default', async () => {
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.dev-banner')).toBeNull();
    });

    it('banner visible when devMode is true', async () => {
      el.devMode = true;
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.dev-banner')).toBeTruthy();
    });
  });

  describe('preset selection', () => {
    it('clicking preset populates state and highlights', async () => {
      await el.updateComplete;
      const preset = el.shadowRoot!.querySelector('[data-preset="anthropic-direct"]') as HTMLElement;
      preset.click();
      await el.updateComplete;
      expect(preset.classList.contains('active')).toBe(true);
    });

    it('clicking different preset unhighlights previous', async () => {
      await el.updateComplete;
      const p1 = el.shadowRoot!.querySelector('[data-preset="anthropic-direct"]') as HTMLElement;
      const p2 = el.shadowRoot!.querySelector('[data-preset="openai-standard"]') as HTMLElement;
      p1.click();
      await el.updateComplete;
      p2.click();
      await el.updateComplete;
      expect(p1.classList.contains('active')).toBe(false);
      expect(p2.classList.contains('active')).toBe(true);
    });

    it('clicking already-active preset is a no-op', async () => {
      await el.updateComplete;
      const events: any[] = [];
      el.addEventListener('pages-event', ((e: CustomEvent) => {
        if (e.detail?.topic === 'manifest:configured') events.push(e.detail.payload);
      }) as EventListener);

      const preset = el.shadowRoot!.querySelector('[data-preset="anthropic-direct"]') as HTMLElement;
      preset.click();
      await el.updateComplete;
      const firstCount = events.length;

      preset.click();
      await el.updateComplete;
      expect(events.length).toBe(firstCount);
    });

    it('preset selection emits manifest:configured with models', async () => {
      await el.updateComplete;
      const events: any[] = [];
      el.addEventListener('pages-event', ((e: CustomEvent) => {
        if (e.detail?.topic === 'manifest:configured') events.push(e.detail.payload);
      }) as EventListener);

      const preset = el.shadowRoot!.querySelector('[data-preset="anthropic-direct"]') as HTMLElement;
      preset.click();
      await el.updateComplete;

      expect(events.length).toBeGreaterThan(0);
      const manifest = events[events.length - 1] as Manifest;
      expect(manifest.providers).toBeDefined();
      expect(manifest.providers![0]!.vendor).toBe('anthropic');
      expect(manifest.models!.length).toBeGreaterThan(0);
      expect(manifest.models!.some(m => m.id === 'claude-opus-4-6')).toBe(true);
    });

    it('preset selection populates provider card selectedModels', async () => {
      await el.updateComplete;
      const preset = el.shadowRoot!.querySelector('[data-preset="anthropic-direct"]') as HTMLElement;
      preset.click();
      await el.updateComplete;
      await el.updateComplete;

      const cards = el.shadowRoot!.querySelectorAll('manifest-provider-card');
      const anthropicCard = Array.from(cards).find(c => (c as any).vendor === 'anthropic') as any;
      expect(anthropicCard).toBeTruthy();
      expect(anthropicCard.selectedModels.length).toBeGreaterThan(0);
      expect(anthropicCard.selectedModels).toContain('claude-opus-4-6');
    });
  });

  describe('alias editor', () => {
    it('add alias row', async () => {
      await el.updateComplete;
      const addBtn = el.shadowRoot!.querySelector('.add-alias-btn') as HTMLElement;
      addBtn.click();
      await el.updateComplete;
      const rows = el.shadowRoot!.querySelectorAll('.alias-row');
      expect(rows.length).toBe(1);
    });

    it('duplicate alias key shows error', async () => {
      await el.updateComplete;
      const addBtn = el.shadowRoot!.querySelector('.add-alias-btn') as HTMLElement;
      addBtn.click();
      addBtn.click();
      await el.updateComplete;

      const inputs = el.shadowRoot!.querySelectorAll('.alias-key-input') as NodeListOf<HTMLInputElement>;
      inputs[0]!.value = 'reasoning';
      inputs[0]!.dispatchEvent(new Event('input', { bubbles: true }));
      inputs[1]!.value = 'reasoning';
      inputs[1]!.dispatchEvent(new Event('input', { bubbles: true }));
      await el.updateComplete;

      const errors = el.shadowRoot!.querySelectorAll('.alias-duplicate-error');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('data property', () => {
    it('initialises from data', async () => {
      el.data = {
        providers: [{ vendor: 'openai', credential: 'env:KEY' }],
        models: [{ id: 'gpt-4o', vendor: 'openai' }],
        aliases: { fast: { tier: 'FAST' } },
      };
      await el.updateComplete;
      await el.updateComplete;

      const aliasRows = el.shadowRoot!.querySelectorAll('.alias-row');
      expect(aliasRows.length).toBe(1);
    });

    it('re-setting data resets state (cancel semantics)', async () => {
      const original: Manifest = {
        providers: [{ vendor: 'openai', credential: 'env:KEY' }],
        models: [{ id: 'gpt-4o', vendor: 'openai' }],
        aliases: { fast: { tier: 'FAST' } },
      };
      el.data = original;
      await el.updateComplete;
      await el.updateComplete;

      el.data = { providers: [], models: [], aliases: {} };
      await el.updateComplete;
      await el.updateComplete;
      const aliasRows = el.shadowRoot!.querySelectorAll('.alias-row');
      expect(aliasRows.length).toBe(0);
    });

    it('passthrough fields preserved on emission', async () => {
      const events: Manifest[] = [];
      el.addEventListener('pages-event', ((e: CustomEvent) => {
        if (e.detail?.topic === 'manifest:configured') events.push(e.detail.payload);
      }) as EventListener);

      el.data = {
        providers: [{ vendor: 'anthropic', credential: 'env:KEY' }],
        models: [{ id: 'claude-opus-4-6', vendor: 'anthropic' }],
        sources: [{ uri: 'https://example.com', priority: 1 }],
        defaults: { backend: 'anthropic' },
      };
      await el.updateComplete;

      const preset = el.shadowRoot!.querySelector('[data-preset="openai-standard"]') as HTMLElement;
      preset.click();
      await el.updateComplete;

      if (events.length > 0) {
        const last = events[events.length - 1]!;
        expect(last.sources).toEqual([{ uri: 'https://example.com', priority: 1 }]);
        expect(last.defaults).toEqual({ backend: 'anthropic' });
      }
    });
  });

  describe('pipeline steps', () => {
    it('renders two pipeline steps with step numbers', async () => {
      await el.updateComplete;
      const steps = el.shadowRoot!.querySelectorAll('.pipeline-step');
      expect(steps.length).toBe(2);
      const numbers = el.shadowRoot!.querySelectorAll('.step-number');
      expect(numbers[0]?.textContent?.trim()).toBe('1');
      expect(numbers[1]?.textContent?.trim()).toBe('2');
    });

    it('pipeline step has ARIA label with step number and status', async () => {
      await el.updateComplete;
      const steps = el.shadowRoot!.querySelectorAll('.pipeline-step');
      expect(steps[0]?.getAttribute('aria-label')).toMatch(/Step 1.*Providers/);
    });

    it('providers step shows incomplete when no providers configured', async () => {
      await el.updateComplete;
      const steps = el.shadowRoot!.querySelectorAll('.pipeline-step');
      const status = steps[0]?.querySelector('.step-status');
      expect(status?.classList.contains('incomplete')).toBe(true);
    });

    it('providers step shows complete when a provider has credential', async () => {
      el.data = {
        providers: [{ vendor: 'anthropic', credential: 'env:KEY' }],
        models: [{ id: 'claude-opus-4-6', vendor: 'anthropic' }],
      };
      await el.updateComplete;
      await el.updateComplete;
      const steps = el.shadowRoot!.querySelectorAll('.pipeline-step');
      const status = steps[0]?.querySelector('.step-status');
      expect(status?.classList.contains('complete')).toBe(true);
    });

    it('aliases section shows dimmed tooltip when no models selected', async () => {
      await el.updateComplete;
      const tooltip = el.shadowRoot!.querySelector('.step-dimmed-tooltip');
      expect(tooltip).toBeTruthy();
      expect(tooltip?.textContent).toContain('Select models first');
    });

    it('aliases section is dimmed when no models selected', async () => {
      await el.updateComplete;
      const aliasEditor = el.shadowRoot!.querySelector('.alias-editor');
      expect(aliasEditor?.classList.contains('step-dimmed')).toBe(true);
    });
  });

  describe('alias resolution preview', () => {
    it('shows resolved model name when alias matches', async () => {
      el.data = {
        providers: [{ vendor: 'anthropic', credential: 'env:KEY' }],
        models: [
          { id: 'claude-opus-4-6', displayName: 'Claude Opus 4.6', vendor: 'anthropic', tier: 'FLAGSHIP', capabilities: ['vision', 'tool_use'], contextWindow: 1000000 },
          { id: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', vendor: 'anthropic', tier: 'FAST', capabilities: ['tool_use'], contextWindow: 200000 },
        ],
        aliases: { 'reasoning-heavy': { tier: 'FLAGSHIP', capabilities: ['tool_use'] } },
      };
      await el.updateComplete;
      await el.updateComplete;

      const resolution = el.shadowRoot!.querySelector('.alias-resolution');
      expect(resolution?.textContent).toContain('Claude Opus 4.6');
    });

    it('shows no-match warning when alias cannot resolve', async () => {
      el.data = {
        providers: [{ vendor: 'anthropic', credential: 'env:KEY' }],
        models: [{ id: 'claude-haiku-4-5', vendor: 'anthropic', tier: 'FAST' }],
        aliases: { 'embedding': { tier: 'EMBEDDING' } },
      };
      await el.updateComplete;
      await el.updateComplete;

      const resolution = el.shadowRoot!.querySelector('.alias-resolution');
      expect(resolution?.textContent).toContain('(no match)');
      expect(resolution?.classList.contains('no-match')).toBe(true);
    });

    it('resolution has aria-live="polite"', async () => {
      el.data = {
        providers: [{ vendor: 'anthropic', credential: 'env:KEY' }],
        models: [{ id: 'claude-opus-4-6', vendor: 'anthropic', tier: 'FLAGSHIP' }],
        aliases: { fast: { tier: 'FLAGSHIP' } },
      };
      await el.updateComplete;
      await el.updateComplete;

      const resolution = el.shadowRoot!.querySelector('.alias-resolution');
      expect(resolution?.getAttribute('aria-live')).toBe('polite');
    });

    it('preferVendor is a soft preference in resolution', async () => {
      el.data = {
        providers: [
          { vendor: 'openai', credential: 'env:KEY' },
        ],
        models: [
          { id: 'gpt-4o', displayName: 'GPT-4o', vendor: 'openai', tier: 'FLAGSHIP', contextWindow: 128000 },
        ],
        aliases: { 'reasoning-heavy': { tier: 'FLAGSHIP', preferVendor: 'anthropic' } },
      };
      await el.updateComplete;
      await el.updateComplete;

      const resolution = el.shadowRoot!.querySelector('.alias-resolution');
      expect(resolution?.textContent).toContain('GPT-4o');
    });

    it('stale-vendor warning is replaced by resolution preview', async () => {
      el.data = {
        providers: [{ vendor: 'openai', credential: 'env:KEY' }],
        models: [{ id: 'gpt-4o', vendor: 'openai', tier: 'FLAGSHIP' }],
        aliases: { test: { preferVendor: 'anthropic', tier: 'FLAGSHIP' } },
      };
      await el.updateComplete;
      await el.updateComplete;

      expect(el.shadowRoot!.querySelector('.alias-stale-warning')).toBeNull();
    });
  });
});
