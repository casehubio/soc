import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './manifest-provider-card.js';
import type { ModelDescriptor } from '@casehubio/mosaic-core';

type CardEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  vendor: string;
  displayName: string;
  provider: { vendor: string; credential?: string | Record<string, string>; host?: string };
  models: ModelDescriptor[];
  selectedModels: string[];
  detection: 'detected' | 'partial' | 'none';
  devMode: boolean;
  testEndpoint: string;
  isOther: boolean;
};

const MODELS: ModelDescriptor[] = [
  { id: 'claude-opus-4-6', displayName: 'Claude Opus 4.6', tier: 'FLAGSHIP', capabilities: ['vision', 'tool_use'], contextWindow: 1000000, vendor: 'anthropic' },
  { id: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', tier: 'FAST', capabilities: ['tool_use'], contextWindow: 200000, vendor: 'anthropic' },
];

describe('manifest-provider-card', () => {
  let el: CardEl;

  beforeEach(() => {
    el = document.createElement('manifest-provider-card') as CardEl;
    el.vendor = 'anthropic';
    el.displayName = 'Anthropic';
    el.provider = { vendor: 'anthropic' };
    el.models = MODELS;
    el.selectedModels = [];
    el.detection = 'none';
    el.devMode = false;
    el.testEndpoint = '';
    el.isOther = false;
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  describe('ARIA', () => {
    it('renders with role="region" and aria-label', async () => {
      await el.updateComplete;
      expect(el.getAttribute('role')).toBe('region');
      expect(el.getAttribute('aria-label')).toBe('Anthropic provider configuration');
    });
  });

  describe('expand/collapse', () => {
    it('starts collapsed', async () => {
      await el.updateComplete;
      const header = el.shadowRoot!.querySelector('.card-header')!;
      expect(header.getAttribute('aria-expanded')).toBe('false');
    });

    it('expands on header click', async () => {
      await el.updateComplete;
      const header = el.shadowRoot!.querySelector('.card-header') as HTMLElement;
      header.click();
      await el.updateComplete;
      expect(header.getAttribute('aria-expanded')).toBe('true');
    });

    it('shows expanded content when expanded', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.card-body')).toBeTruthy();
    });
  });

  describe('detection badge', () => {
    it('shows detected state', async () => {
      el.detection = 'detected';
      await el.updateComplete;
      const badge = el.shadowRoot!.querySelector('.detection-badge');
      expect(badge?.classList.contains('detected')).toBe(true);
    });

    it('shows partial state', async () => {
      el.detection = 'partial';
      await el.updateComplete;
      const badge = el.shadowRoot!.querySelector('.detection-badge');
      expect(badge?.classList.contains('partial')).toBe(true);
    });

    it('shows none state', async () => {
      el.detection = 'none';
      await el.updateComplete;
      const badge = el.shadowRoot!.querySelector('.detection-badge');
      expect(badge?.classList.contains('none')).toBe(true);
    });
  });

  describe('auth pattern', () => {
    it('shows connection method selector for providers with multiple patterns', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;
      const radios = el.shadowRoot!.querySelectorAll('input[name="auth-pattern"]');
      expect(radios.length).toBe(3);
    });

    it('shows auth fields for the selected pattern', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;
      const fields = el.shadowRoot!.querySelectorAll('.auth-field-row');
      expect(fields.length).toBeGreaterThan(0);
    });

    it('dev-mode shows inline key section for api-key pattern', async () => {
      el.devMode = true;
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;
      const devSection = el.shadowRoot!.querySelector('input[type="password"]');
      expect(devSection).toBeTruthy();
    });

    it('emits auth pattern ID in provider-changed', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;

      const events: any[] = [];
      el.addEventListener('provider-changed', ((e: CustomEvent) => events.push(e.detail)) as EventListener);

      const field = el.shadowRoot!.querySelector('.auth-field-row input') as HTMLInputElement;
      if (field) {
        field.value = 'test-value';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        await el.updateComplete;
        expect(events.length).toBeGreaterThan(0);
        expect(events[0].authPatternId).toBeDefined();
      }
    });
  });

  describe('model list', () => {
    it('renders models grouped by tier', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;
      const tiers = el.shadowRoot!.querySelectorAll('.tier-group');
      expect(tiers.length).toBeGreaterThanOrEqual(2);
    });

    it('shows capability pills', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;
      const pills = el.shadowRoot!.querySelectorAll('.capability-pill');
      expect(pills.length).toBeGreaterThan(0);
    });

    it('checkbox selection fires provider-changed', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;

      const events: any[] = [];
      el.addEventListener('provider-changed', ((e: CustomEvent) => events.push(e.detail)) as EventListener);

      const checkbox = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.click();
      await el.updateComplete;

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].selectedModels.length).toBe(1);
    });

    it('provider-changed emits full ModelDescriptor in selectedModels', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;

      const events: any[] = [];
      el.addEventListener('provider-changed', ((e: CustomEvent) => events.push(e.detail)) as EventListener);

      const checkbox = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.click();
      await el.updateComplete;

      const model = events[0].selectedModels[0];
      expect(model.id).toBeDefined();
      expect(model.vendor).toBe('anthropic');
    });

    it('shows model count in collapsed header', async () => {
      el.selectedModels = ['claude-opus-4-6'];
      await el.updateComplete;
      const count = el.shadowRoot!.querySelector('.model-count');
      expect(count?.textContent).toContain('1');
    });
  });

  describe('add model on built-in card', () => {
    it('shows "Add model" button when expanded', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;

      const addBtn = el.shadowRoot!.querySelector('.add-model-btn');
      expect(addBtn).toBeTruthy();
      expect(addBtn?.getAttribute('aria-label')).toBe('Add a model to Anthropic configuration');
    });

    it('clicking "Add model" creates an editable row', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;

      const addBtn = el.shadowRoot!.querySelector('.add-model-btn') as HTMLElement;
      addBtn.click();
      await el.updateComplete;

      const addedRows = el.shadowRoot!.querySelectorAll('.added-model-row');
      expect(addedRows.length).toBe(1);
    });

    it('added model can be selected via checkbox', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;

      const addBtn = el.shadowRoot!.querySelector('.add-model-btn') as HTMLElement;
      addBtn.click();
      await el.updateComplete;

      const idInput = el.shadowRoot!.querySelector('.added-model-row input[placeholder="Model ID"]') as HTMLInputElement;
      idInput.value = 'claude-sonnet-5-5';
      idInput.dispatchEvent(new Event('input', { bubbles: true }));
      await el.updateComplete;

      const events: any[] = [];
      el.addEventListener('provider-changed', ((e: CustomEvent) => events.push(e.detail)) as EventListener);

      const checkboxes = el.shadowRoot!.querySelectorAll('input[type="checkbox"]');
      const lastCheckbox = checkboxes[checkboxes.length - 1] as HTMLInputElement;
      lastCheckbox.click();
      await el.updateComplete;

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].selectedModels.some((m: any) => m.id === 'claude-sonnet-5-5')).toBe(true);
    });

    it('duplicate model ID shows validation error', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;

      const addBtn = el.shadowRoot!.querySelector('.add-model-btn') as HTMLElement;
      addBtn.click();
      await el.updateComplete;

      const idInput = el.shadowRoot!.querySelector('.added-model-row input[placeholder="Model ID"]') as HTMLInputElement;
      idInput.value = 'claude-opus-4-6';
      idInput.dispatchEvent(new Event('input', { bubbles: true }));
      await el.updateComplete;

      const error = el.shadowRoot!.querySelector('.added-model-row .validation-error');
      expect(error).toBeTruthy();
    });

    it('removing an added model removes it from the list', async () => {
      await el.updateComplete;
      (el.shadowRoot!.querySelector('.card-header') as HTMLElement).click();
      await el.updateComplete;

      const addBtn = el.shadowRoot!.querySelector('.add-model-btn') as HTMLElement;
      addBtn.click();
      await el.updateComplete;

      const deleteBtn = el.shadowRoot!.querySelector('.added-model-row .delete-btn') as HTMLElement;
      deleteBtn.click();
      await el.updateComplete;

      expect(el.shadowRoot!.querySelectorAll('.added-model-row').length).toBe(0);
    });
  });
});
