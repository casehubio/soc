import { LitElement, html, css, nothing } from 'lit';
import { registerTheme } from './runtime.js';
import { generateScale } from './colours.js';
import { initPresets } from './transforms/index.js';
import { runPipeline } from './pipeline.js';
import { generateCSS, generateDensityCSS } from './output.js';
import type { ThemeStorage } from './theme-storage.js';
import { detectStorage } from './theme-storage.js';
import type { PresetConfig, TransformDef } from './types.js';
import { DESIGNER_PRESETS, type DesignerPreset } from './designer-presets.js';
import { getBuiltinPreset, listBuiltinPresets } from './preset-loader.js';
import { listThemes, applyTheme, getTheme } from './runtime.js';

const DEFAULT_SEMANTIC_HUES = { success: 145, warning: 55, danger: 25, info: 210 };

const STEP_ROLES = [
  'app bg', 'subtle bg', 'element bg', 'hover bg',
  'border', 'strong border', 'hover border', 'focus ring',
  'solid fill', 'solid hover', 'lo-contrast text', 'hi-contrast text',
];
const GROUP_LABELS = ['backgrounds', 'subtle', 'borders', 'interactive', 'solids', 'text'];

export class PagesThemeDesignerElement extends LitElement {
  static override styles = css`
    :host { display: contents; }

    .designer-overlay {
      position: fixed; inset: 0; z-index: 10000;
      background: oklch(0% 0 0 / 0.6);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--pages-font-family, 'Inter', system-ui, sans-serif);
    }

    .designer-panel {
      background: var(--pages-neutral-2, #1a1a2e);
      color: var(--pages-neutral-12, #eee);
      border: 1px solid var(--pages-neutral-6, #444);
      border-radius: 12px;
      width: min(960px, 95vw); height: min(700px, 90vh);
      display: flex; flex-direction: column;
      box-shadow: 0 8px 32px oklch(0% 0 0 / 0.5);
    }

    .designer-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px; border-bottom: 1px solid var(--pages-neutral-4, #333);
    }

    .designer-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
    .header-spacer { flex: 1; }
    .header-theme-select {
      background: var(--pages-neutral-3, #222);
      color: var(--pages-neutral-12, #eee);
      border: 1px solid var(--pages-neutral-6, #444);
      border-radius: 4px; padding: 4px 8px; font: inherit; font-size: 12px;
    }

    .name-input {
      background: var(--pages-neutral-3, #222);
      color: var(--pages-neutral-12, #eee);
      border: 1px solid var(--pages-neutral-6, #444);
      border-radius: 4px; padding: 4px 8px; font: inherit; font-size: 13px;
      width: 160px;
    }

    .designer-body {
      display: flex; flex: 1; overflow: hidden;
    }

    .controls-panel {
      width: 320px; min-width: 280px;
      padding: 0; overflow-y: auto;
      border-right: 1px solid var(--pages-neutral-4, #333);
      display: flex; flex-direction: column;
    }

    .tab-bar {
      display: flex; border-bottom: 1px solid var(--pages-neutral-4, #333);
      flex-shrink: 0;
    }
    .tab-btn {
      flex: 1; background: none; border: none; border-bottom: 2px solid transparent;
      color: var(--pages-neutral-9, #888); padding: 10px 12px;
      cursor: pointer; font: inherit; font-size: 12px; font-weight: 500;
      text-align: center;
    }
    .tab-btn:hover { color: var(--pages-neutral-11, #bbb); background: var(--pages-neutral-3, #222); }
    .tab-btn.active {
      color: var(--pages-accent-9, #4a9eff);
      border-bottom-color: var(--pages-accent-9, #4a9eff);
    }

    .tab-content {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 16px;
    }

    .preview-panel {
      flex: 1; overflow-y: auto; padding: 20px;
      font-family: var(--pages-font-family, 'Inter', system-ui, sans-serif);
      font-size: var(--pages-font-size, 14px);
    }

    .control-group { display: flex; flex-direction: column; gap: 6px; }
    .control-label {
      font-size: 11px; font-weight: 500; text-transform: uppercase;
      color: var(--pages-neutral-9, #888); letter-spacing: 0.5px;
    }
    .control-row { display: flex; align-items: center; gap: 8px; }
    .control-row input[type="range"] { flex: 1; accent-color: var(--pages-accent-9, #4a9eff); }
    .control-value { font-size: 12px; min-width: 40px; text-align: right; color: var(--pages-neutral-10, #aaa); }

    .hue-slider { -webkit-appearance: none; appearance: none; height: 8px; border-radius: 4px; outline: none; }
    .hue-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 16px; height: 16px;
      border-radius: 50%; border: 2px solid white; cursor: pointer;
    }

    .swatch-section { margin-bottom: 12px; }
    .swatch-label { font-size: 11px; font-weight: 500; color: var(--pages-neutral-9, #888); margin-bottom: 4px; text-transform: capitalize; }
    .swatch-row-grouped { display: flex; gap: 6px; }
    .swatch-group { display: flex; flex-direction: column; flex: 1; gap: 1px; min-width: 0; }
    .swatch-pair { display: flex; gap: 1px; }
    .swatch {
      width: 100%; aspect-ratio: 1; border-radius: 3px;
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; color: white; text-shadow: 0 0 2px black;
    }
    .swatch-group-label {
      font-size: 7px; text-align: center; color: var(--pages-neutral-8, #666);
      text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .toolbar {
      display: flex; gap: 8px; padding: 12px 20px;
      border-top: 1px solid var(--pages-neutral-4, #333);
      align-items: center;
    }
    .toolbar-spacer { flex: 1; }

    button {
      background: var(--pages-neutral-4, #333);
      color: var(--pages-neutral-12, #eee);
      border: 1px solid var(--pages-neutral-6, #444);
      border-radius: 4px; padding: 6px 14px;
      cursor: pointer; font: inherit; font-size: 13px;
    }
    button:hover { background: var(--pages-neutral-5, #444); }
    button.primary {
      background: var(--pages-accent-9, #4a9eff);
      color: var(--pages-neutral-1, #111);
      border-color: var(--pages-accent-9, #4a9eff);
      font-weight: 500;
    }
    button.primary:hover { background: var(--pages-accent-10, #3a8eef); }

    .advanced-toggle {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; cursor: pointer; color: var(--pages-neutral-10, #aaa);
      padding: 8px 16px; border-top: 1px solid var(--pages-neutral-4, #333);
      flex-shrink: 0;
    }
    .advanced-toggle input { accent-color: var(--pages-accent-9, #4a9eff); }

    .theme-list-wrap { position: relative; }
    .theme-list-filter {
      display: none; width: 100%; padding: 3px 6px; margin-bottom: 4px;
      background: var(--pages-neutral-3, #222); color: var(--pages-neutral-12, #eee);
      border: 1px solid var(--pages-neutral-6, #444); border-radius: 3px;
      font: inherit; font-size: 11px; outline: none;
    }
    .theme-list-filter:focus { border-color: var(--pages-accent-8, #4a9eff); }
    .theme-list-wrap.filterable:hover .theme-list-filter,
    .theme-list-wrap.filterable .theme-list-filter:focus,
    .theme-list-wrap.filterable .theme-list-filter.has-value { display: block; }
    .theme-list { display: flex; flex-direction: column; gap: 2px; max-height: 150px; overflow-y: auto; }
    .theme-list-item {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 8px; border-radius: 4px;
      font-size: 12px; color: var(--pages-neutral-11, #aaa);
      cursor: pointer;
    }
    .theme-list-item:hover { background: var(--pages-neutral-4, #333); }
    .theme-list-item.previewing {
      background: var(--pages-accent-3, #1a3050);
      color: var(--pages-accent-11, #8ec8ff);
    }
    .theme-list-item .theme-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .theme-list-item .theme-tag {
      font-size: 9px; padding: 1px 4px; border-radius: 3px;
      background: var(--pages-neutral-5, #444); color: var(--pages-neutral-9, #888);
    }
    .theme-list-actions { display: flex; gap: 2px; margin-left: auto; }
    .theme-list-actions button {
      background: none; border: none; cursor: pointer;
      font-size: 11px; padding: 2px 6px; border-radius: 3px;
      color: var(--pages-neutral-10, #aaa);
    }
    .theme-list-actions button:hover { background: var(--pages-neutral-5, #444); color: var(--pages-neutral-12, #eee); }
    .theme-list-actions .delete-btn:hover { color: var(--pages-danger-9, #e44); }

    .preview-widgets { display: flex; flex-direction: column; gap: var(--pages-space-md, 16px); }

    .widget-section { display: flex; flex-direction: column; gap: var(--pages-space-sm, 8px); }
    .widget-section-title {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      color: var(--pages-neutral-9, #888); letter-spacing: 0.5px;
    }

    .preview-card {
      background: var(--pages-neutral-2, #1a1a2e);
      border: 1px solid var(--pages-neutral-5, #444);
      border-radius: var(--pages-radius, 8px); padding: var(--pages-space-md, 16px);
      box-shadow: var(--pages-shadow, 0 2px 8px oklch(0% 0 0 / 0.1));
    }

    .preview-btn {
      padding: var(--pages-space-xs, 4px) var(--pages-space-sm, 8px); border-radius: var(--pages-radius-sm, 4px);
      font-size: 13px; cursor: pointer; border: none;
    }
    .preview-btn-primary { background: var(--pages-accent-9); color: var(--pages-neutral-1); }
    .preview-btn-secondary { background: var(--pages-neutral-4); color: var(--pages-neutral-12); border: 1px solid var(--pages-neutral-6); }
    .preview-btn-danger { background: var(--pages-danger-9); color: white; }
    .preview-btn-success { background: var(--pages-success-9); color: white; }

    .preview-input {
      background: var(--pages-neutral-3); color: var(--pages-neutral-12);
      border: 1px solid var(--pages-neutral-6); border-radius: var(--pages-radius-sm, 4px);
      padding: 6px 10px; font: inherit; font-size: 13px; width: 200px;
    }
    .preview-input:focus { border-color: var(--pages-accent-8); outline: none; box-shadow: 0 0 0 2px var(--pages-accent-8 / 0.3); }

    .preview-select {
      background: var(--pages-neutral-3); color: var(--pages-neutral-12);
      border: 1px solid var(--pages-neutral-6); border-radius: var(--pages-radius-sm, 4px);
      padding: 6px 10px; font: inherit; font-size: 13px;
    }

    .preview-badge {
      display: inline-flex; padding: var(--pages-space-xs, 4px) var(--pages-space-sm, 8px); border-radius: var(--pages-radius-full, 9999px);
      font-size: 11px; font-weight: 500;
    }
    .badge-success { background: var(--pages-success-3); color: var(--pages-success-11); }
    .badge-warning { background: var(--pages-warning-3); color: var(--pages-warning-11); }
    .badge-danger { background: var(--pages-danger-3); color: var(--pages-danger-11); }
    .badge-info { background: var(--pages-info-3); color: var(--pages-info-11); }

    .preview-text-primary { color: var(--pages-neutral-12); }
    .preview-text-secondary { color: var(--pages-neutral-11); }
    .preview-text-muted { color: var(--pages-neutral-8); }

    .preview-table {
      width: 100%; border-collapse: collapse; font-size: 13px;
    }
    .preview-table th {
      text-align: left; padding: var(--pages-space-xs, 4px) var(--pages-space-sm, 8px); font-weight: 500;
      border-bottom: 1px solid var(--pages-neutral-6);
      color: var(--pages-neutral-11);
    }
    .preview-table td {
      padding: var(--pages-space-xs, 4px) var(--pages-space-sm, 8px);
      border-bottom: 1px solid var(--pages-neutral-4);
      color: var(--pages-neutral-12);
    }
    .preview-table tr:hover td { background: var(--pages-neutral-3); }

    .preview-progress {
      width: 100%; height: 6px; border-radius: var(--pages-radius-sm, 3px);
      background: var(--pages-neutral-4); overflow: hidden;
    }
    .preview-progress-fill {
      height: 100%; border-radius: var(--pages-radius-sm, 3px); transition: width 0.3s;
    }

    .preview-row { display: flex; gap: var(--pages-space-sm, 8px); align-items: center; flex-wrap: wrap; }

    .preview-alert {
      display: flex; align-items: center; gap: var(--pages-space-sm, 8px);
      padding: var(--pages-space-sm, 8px) var(--pages-space-md, 16px); border-radius: var(--pages-radius, 8px);
      font-size: 13px;
    }
    .alert-success { background: var(--pages-success-3); color: var(--pages-success-11); border: 1px solid var(--pages-success-6); }
    .alert-warning { background: var(--pages-warning-3); color: var(--pages-warning-11); border: 1px solid var(--pages-warning-6); }
    .alert-danger { background: var(--pages-danger-3); color: var(--pages-danger-11); border: 1px solid var(--pages-danger-6); }
    .alert-info { background: var(--pages-info-3); color: var(--pages-info-11); border: 1px solid var(--pages-info-6); }

    .preview-chip {
      display: inline-flex; align-items: center; gap: var(--pages-space-xs, 4px);
      padding: var(--pages-space-xs, 4px) var(--pages-space-sm, 8px); border-radius: var(--pages-radius-full, 9999px);
      font-size: 12px; font-weight: 500;
    }
    .chip-success { background: var(--pages-success-4); color: var(--pages-success-11); }
    .chip-warning { background: var(--pages-warning-4); color: var(--pages-warning-11); }
    .chip-danger { background: var(--pages-danger-4); color: var(--pages-danger-11); }
    .chip-info { background: var(--pages-info-4); color: var(--pages-info-11); }
    .chip-accent { background: var(--pages-accent-4); color: var(--pages-accent-11); }

    .preview-switch {
      position: relative; width: 36px; height: 20px;
      background: var(--pages-neutral-5); border-radius: var(--pages-radius-full, 9999px);
      cursor: pointer; transition: background 0.2s; flex-shrink: 0;
    }
    .preview-switch.on { background: var(--pages-accent-9); }
    .preview-switch-knob {
      position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px; border-radius: 50%;
      background: white; transition: transform 0.2s;
    }
    .preview-switch.on .preview-switch-knob { transform: translateX(16px); }

    .preview-tabs {
      display: flex; border-bottom: 2px solid var(--pages-neutral-4);
    }
    .preview-tab {
      padding: 8px 16px; font-size: 12px; cursor: pointer;
      border: none; background: none;
      border-bottom: 2px solid transparent; margin-bottom: -2px;
      color: var(--pages-neutral-9);
    }
    .preview-tab.active {
      color: var(--pages-accent-9);
      border-bottom-color: var(--pages-accent-9);
    }

    .preview-nav { display: flex; flex-direction: column; gap: 1px; }
    .preview-nav-item {
      padding: 6px 12px; border-radius: var(--pages-radius-sm, 4px);
      font-size: 13px; color: var(--pages-neutral-11); cursor: pointer;
    }
    .preview-nav-item:hover { background: var(--pages-neutral-3); }
    .preview-nav-item.active { background: var(--pages-accent-3); color: var(--pages-accent-11); }

    .preview-input-error {
      background: var(--pages-neutral-3); color: var(--pages-neutral-12);
      border: 1px solid var(--pages-danger-6); border-radius: var(--pages-radius-sm, 4px);
      padding: 6px 10px; font: inherit; font-size: 13px; width: 200px;
    }
    .preview-input-success {
      background: var(--pages-neutral-3); color: var(--pages-neutral-12);
      border: 1px solid var(--pages-success-6); border-radius: var(--pages-radius-sm, 4px);
      padding: 6px 10px; font: inherit; font-size: 13px; width: 200px;
    }
    .preview-input-focused {
      background: var(--pages-neutral-3); color: var(--pages-neutral-12);
      border: 1px solid var(--pages-accent-8); border-radius: var(--pages-radius-sm, 4px);
      padding: 6px 10px; font: inherit; font-size: 13px; width: 200px;
      box-shadow: 0 0 0 2px var(--pages-accent-5);
    }
    .field-hint { font-size: 11px; margin-top: 2px; }
    .hint-error { color: var(--pages-danger-9); }
    .hint-success { color: var(--pages-success-9); }

    .state-label {
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--pages-neutral-8); text-align: center; margin-top: 2px;
    }
    .preview-btn-hover { background: var(--pages-accent-10); color: var(--pages-neutral-1); }
    .preview-btn-active { background: var(--pages-accent-8); color: var(--pages-neutral-1); }
    .preview-btn-disabled { background: var(--pages-neutral-5); color: var(--pages-neutral-8); cursor: not-allowed; opacity: 0.7; }

    .preview-link { color: var(--pages-accent-9); text-decoration: underline; cursor: pointer; font-size: 13px; }
    .preview-link:hover { color: var(--pages-accent-10); }

    .dashboard-mockup {
      background: var(--pages-neutral-1); border: 1px solid var(--pages-neutral-4);
      border-radius: var(--pages-radius, 8px); overflow: hidden;
    }
    .dash-header {
      display: flex; align-items: center; gap: var(--pages-space-sm, 8px);
      padding: var(--pages-space-sm, 8px) var(--pages-space-md, 16px);
      border-bottom: 1px solid var(--pages-neutral-4);
      background: var(--pages-neutral-2);
    }
    .dash-logo {
      width: 20px; height: 20px; border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-accent-9); flex-shrink: 0;
    }
    .dash-title { font-size: 13px; font-weight: 600; color: var(--pages-neutral-12); }
    .dash-spacer { flex: 1; }
    .dash-search {
      background: var(--pages-neutral-3); border: 1px solid var(--pages-neutral-5);
      border-radius: var(--pages-radius-sm, 4px); padding: 3px 8px;
      font-size: 11px; color: var(--pages-neutral-9); width: 120px;
    }
    .dash-avatar {
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--pages-accent-4); color: var(--pages-accent-11);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 600; flex-shrink: 0;
    }
    .dash-notif {
      position: relative; width: 20px; height: 20px; display: flex;
      align-items: center; justify-content: center;
      color: var(--pages-neutral-10); font-size: 14px; flex-shrink: 0;
    }
    .dash-notif-dot {
      position: absolute; top: 0; right: 0; width: 7px; height: 7px;
      border-radius: 50%; background: var(--pages-danger-9);
    }
    .dash-body { display: flex; }
    .dash-sidebar {
      width: 100px; padding: var(--pages-space-sm, 8px);
      border-right: 1px solid var(--pages-neutral-4); flex-shrink: 0;
    }
    .dash-sidebar-item {
      padding: 4px 8px; font-size: 11px; border-radius: var(--pages-radius-sm, 4px);
      color: var(--pages-neutral-10); cursor: pointer;
    }
    .dash-sidebar-item.active {
      background: var(--pages-accent-3); color: var(--pages-accent-11); font-weight: 500;
    }
    .dash-main { flex: 1; padding: var(--pages-space-sm, 8px); display: flex; flex-direction: column; gap: var(--pages-space-sm, 8px); }
    .dash-breadcrumbs {
      font-size: 11px; color: var(--pages-neutral-9);
      display: flex; gap: 4px; align-items: center;
    }
    .dash-breadcrumbs a { color: var(--pages-accent-9); text-decoration: none; }
    .dash-breadcrumbs span { color: var(--pages-neutral-7); }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--pages-space-xs, 4px); }
    .stat-tile {
      background: var(--pages-neutral-2); border: 1px solid var(--pages-neutral-4);
      border-radius: var(--pages-radius-sm, 4px); padding: var(--pages-space-sm, 8px);
      box-shadow: var(--pages-shadow-sm);
    }
    .stat-value { font-size: 18px; font-weight: 700; color: var(--pages-neutral-12); }
    .stat-label { font-size: 10px; color: var(--pages-neutral-9); margin-top: 2px; }
    .stat-trend { font-size: 10px; margin-top: 2px; }
    .trend-up { color: var(--pages-success-9); }
    .trend-down { color: var(--pages-danger-9); }
    .dash-activity { display: flex; flex-direction: column; gap: 6px; }
    .dash-activity-title { font-size: 11px; font-weight: 600; color: var(--pages-neutral-11); text-transform: uppercase; letter-spacing: 0.3px; }
    .activity-item {
      display: flex; align-items: center; gap: 6px; font-size: 11px;
    }
    .activity-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .activity-text { color: var(--pages-neutral-11); flex: 1; }
    .activity-time { color: var(--pages-neutral-8); font-size: 10px; white-space: nowrap; }
    .dash-pagination {
      display: flex; gap: 2px; align-items: center; justify-content: center;
      padding-top: var(--pages-space-xs, 4px);
      border-top: 1px solid var(--pages-neutral-4);
    }
    .page-btn {
      width: 22px; height: 22px; border-radius: var(--pages-radius-sm, 4px);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; border: none; cursor: pointer;
      background: transparent; color: var(--pages-neutral-10);
    }
    .page-btn.active { background: var(--pages-accent-9); color: var(--pages-neutral-1); }
    .page-btn:hover:not(.active) { background: var(--pages-neutral-3); }

    .avatar-group { display: flex; }
    .avatar-sm {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 600; margin-left: -8px;
      border: 2px solid var(--pages-neutral-2);
    }
    .avatar-sm:first-child { margin-left: 0; }

    .preview-accordion { border: 1px solid var(--pages-neutral-5); border-radius: var(--pages-radius, 8px); overflow: hidden; }
    .preview-accordion details { border-bottom: 1px solid var(--pages-neutral-4); }
    .preview-accordion details:last-child { border-bottom: none; }
    .preview-accordion summary {
      display: flex; align-items: center; gap: 8px;
      padding: var(--pages-space-sm, 8px) var(--pages-space-md, 16px);
      font-size: 13px; font-weight: 500; color: var(--pages-neutral-12);
      cursor: pointer; list-style: none;
    }
    .preview-accordion summary::-webkit-details-marker { display: none; }
    .preview-accordion summary::before {
      content: '▸'; font-size: 10px; color: var(--pages-neutral-8);
      transition: transform 0.15s;
    }
    .preview-accordion details[open] summary::before { transform: rotate(90deg); }
    .preview-accordion summary:hover { background: var(--pages-neutral-3); }
    .preview-accordion .accordion-body {
      padding: 0 var(--pages-space-md, 16px) var(--pages-space-sm, 8px) 34px;
      font-size: 12px; color: var(--pages-neutral-10);
    }

    .preview-toast {
      display: flex; align-items: center; gap: 8px;
      padding: var(--pages-space-sm, 8px) var(--pages-space-md, 16px);
      background: var(--pages-neutral-3); border: 1px solid var(--pages-neutral-5);
      border-radius: var(--pages-radius, 8px); font-size: 12px;
      color: var(--pages-neutral-12);
      box-shadow: var(--pages-shadow-md);
    }
    .toast-icon { font-size: 16px; flex-shrink: 0; }
    .toast-dismiss { margin-left: auto; color: var(--pages-neutral-8); cursor: pointer; font-size: 14px; }

    .preview-checkbox-row {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: var(--pages-neutral-12);
    }
    .preview-checkbox-row input { accent-color: var(--pages-accent-9); }

    .segment-control {
      display: flex; border: 1px solid var(--pages-neutral-6, #444);
      border-radius: 4px; overflow: hidden;
    }
    .segment-btn {
      flex: 1; padding: 6px 8px; font-size: 11px; text-align: center;
      background: var(--pages-neutral-3, #222); color: var(--pages-neutral-10, #aaa);
      border: none; border-right: 1px solid var(--pages-neutral-6, #444);
      cursor: pointer; font: inherit;
    }
    .segment-btn:last-child { border-right: none; }
    .segment-btn:hover { background: var(--pages-neutral-4, #333); }
    .segment-btn.active {
      background: var(--pages-accent-9, #4a9eff);
      color: var(--pages-neutral-1, #111);
    }

    .radius-preview {
      display: flex; gap: 8px; align-items: end;
    }
    .radius-sample {
      width: 40px; height: 40px;
      background: var(--pages-accent-9, #4a9eff);
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: var(--pages-neutral-1, #111);
    }

    .pipeline-editor { display: flex; flex-direction: column; gap: 8px; }
    .pipeline-stage {
      background: var(--pages-neutral-3, #222);
      border: 1px solid var(--pages-neutral-5, #444);
      border-radius: 8px; padding: 12px;
    }
    .pipeline-stage-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600;
    }
    .pipeline-stage-name {
      flex: 1; color: var(--pages-accent-10, #8ec8ff);
    }
    .pipeline-stage-header button {
      padding: 2px 8px; font-size: 11px;
      background: var(--pages-neutral-4, #333);
      border: 1px solid var(--pages-neutral-5, #444);
      border-radius: 3px; color: var(--pages-neutral-10, #aaa);
      cursor: pointer;
    }
    .pipeline-stage-header button:hover {
      background: var(--pages-neutral-5, #444);
      color: var(--pages-neutral-12, #eee);
    }
    .pipeline-stage-params { margin-top: 8px; position: relative; }
    .code-editor-wrap {
      position: relative;
      border: 1px solid var(--pages-neutral-5, #444);
      border-radius: 6px;
      overflow: hidden;
      background: var(--pages-neutral-2, #181825);
    }
    .code-editor-wrap:focus-within {
      border-color: var(--pages-accent-8, #4a9eff);
      box-shadow: 0 0 0 2px oklch(60% 0.15 245 / 0.2);
    }
    .code-highlight, .code-textarea {
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 12px; line-height: 1.5;
      padding: 10px 12px;
      white-space: pre-wrap;
      word-wrap: break-word;
      tab-size: 2;
    }
    .code-highlight {
      position: absolute; inset: 0;
      pointer-events: none;
      overflow: hidden;
      color: transparent;
    }
    .code-textarea {
      position: relative;
      width: 100%; min-height: 140px;
      background: transparent;
      color: oklch(85% 0 0 / 0.5);
      caret-color: var(--pages-accent-9, #4a9eff);
      border: none; outline: none;
      resize: vertical;
    }
    .json-key { color: oklch(75% 0.12 210); }
    .json-string { color: oklch(70% 0.14 145); }
    .json-number { color: oklch(75% 0.14 55); }
    .json-bool { color: oklch(70% 0.12 310); }
    .json-null { color: oklch(60% 0.08 260); }
    .json-bracket { color: oklch(65% 0 0); }
    .json-colon { color: oklch(55% 0 0); }
    .json-comma { color: oklch(55% 0 0); }
    .add-stage-btn { align-self: flex-start; }

    input[type="file"] { display: none; }

    .collapsible-header {
      display: flex; align-items: center; gap: 4px; cursor: pointer;
      user-select: none;
    }
    .collapsible-header .toggle-arrow {
      font-size: 10px; transition: transform 0.15s; color: var(--pages-neutral-8, #666);
    }
    .collapsible-header .toggle-arrow.open { transform: rotate(90deg); }

    .preset-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
    }
    .preset-chip {
      background: var(--pages-neutral-3, #222);
      border: 1px solid var(--pages-neutral-5, #444);
      border-radius: 4px; padding: 4px 6px;
      cursor: pointer; font-size: 10px; text-align: center;
      color: var(--pages-neutral-11, #aaa);
      display: flex; align-items: center; gap: 4px;
      white-space: nowrap; overflow: hidden;
    }
    .preset-chip:hover { background: var(--pages-neutral-4, #333); border-color: var(--pages-neutral-7, #666); }
    .preset-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    }
  `;

  static override properties = {
    open: { type: Boolean, reflect: true },
    target: { attribute: false },
    storage: { attribute: false },
    preset: { attribute: false },
    _accentHue: { state: true },
    _neutralHue: { state: true },
    _chroma: { state: true },
    _contrast: { state: true },
    _successHue: { state: true },
    _warningHue: { state: true },
    _dangerHue: { state: true },
    _infoHue: { state: true },
    _borderRadius: { state: true },
    _density: { state: true },
    _shadowDepth: { state: true },
    _fontFamily: { state: true },
    _baseFontSize: { state: true },
    _themeName: { state: true },
    _advancedMode: { state: true },
    _pipeline: { state: true },
    _savedThemes: { state: true },
    _previewMode: { state: true },
    _activeTab: { state: true },
    _presetsOpen: { state: true },
    _controlsOpen: { state: true },
    _swatchesOpen: { state: true },
    _existingOpen: { state: true },
    _semanticOpen: { state: true },
    _dashNav: { state: true },
    _dashPage: { state: true },
    _previewTab: { state: true },
    _switchOn: { state: true },
    _toasts: { state: true },
    _themeFilter: { state: true },
    _previewThemeName: { state: true },
  };

  declare open: boolean;
  declare target: HTMLElement;
  declare storage: ThemeStorage | undefined;
  declare preset: PresetConfig | undefined;
  declare _accentHue: number;
  declare _neutralHue: number;
  declare _chroma: number;
  declare _contrast: number;
  declare _successHue: number;
  declare _warningHue: number;
  declare _dangerHue: number;
  declare _infoHue: number;
  declare _borderRadius: number;
  declare _density: 'compact' | 'normal' | 'spacious';
  declare _shadowDepth: number;
  declare _fontFamily: string;
  declare _baseFontSize: number;
  declare _themeName: string;
  declare _advancedMode: boolean;
  declare _pipeline: TransformDef[];
  declare _savedThemes: string[];
  declare _previewMode: 'light' | 'dark';
  declare _activeTab: 'colour' | 'shape';
  declare _presetsOpen: boolean;
  declare _controlsOpen: boolean;
  declare _swatchesOpen: boolean;
  declare _existingOpen: boolean;
  declare _semanticOpen: boolean;
  declare _dashNav: string;
  declare _dashPage: number;
  declare _previewTab: string;
  declare _switchOn: boolean;
  declare _toasts: boolean[];
  declare _themeFilter: string;
  declare _previewThemeName: string | null;

  private _resolvedStorage: ThemeStorage | undefined;
  private _previewStyleEl: HTMLStyleElement | null = null;
  private _prevAccentHue = 245;

  constructor() {
    super();
    this.open = false;
    this.target = document.documentElement;
    this._accentHue = 245;
    this._neutralHue = 220;
    this._chroma = 0.12;
    this._contrast = 0.5;
    this._successHue = DEFAULT_SEMANTIC_HUES.success;
    this._warningHue = DEFAULT_SEMANTIC_HUES.warning;
    this._dangerHue = DEFAULT_SEMANTIC_HUES.danger;
    this._infoHue = DEFAULT_SEMANTIC_HUES.info;
    this._borderRadius = 8;
    this._density = 'normal';
    this._shadowDepth = 0.4;
    this._fontFamily = 'system';
    this._baseFontSize = 14;
    this._themeName = 'custom';
    this._advancedMode = false;
    this._pipeline = [];
    this._savedThemes = [];
    this._previewMode = 'dark';
    this._activeTab = 'colour';
    this._presetsOpen = true;
    this._controlsOpen = true;
    this._swatchesOpen = true;
    this._existingOpen = true;
    this._semanticOpen = false;
    this._dashNav = 'Dashboard';
    this._dashPage = 1;
    this._previewTab = 'Overview';
    this._switchOn = true;
    this._toasts = [true, true];
    this._themeFilter = '';
    this._previewThemeName = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this._initStorage();
    document.addEventListener('keydown', this._onKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._onKeyDown);
    this._removePreviewStyle();
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open) this._onClose();
  };

  private async _initStorage(): Promise<void> {
    this._resolvedStorage = this.storage ?? await detectStorage();
    await this._loadSavedList();
  }

  private async _loadSavedList(): Promise<void> {
    if (!this._resolvedStorage) return;
    this._savedThemes = await this._resolvedStorage.list();
  }

  private _getSemanticGroups() {
    return [
      { name: 'accent', hue: this._accentHue, chromaScale: 1 },
      { name: 'neutral', hue: this._neutralHue, chromaScale: 0.15 },
      { name: 'success', hue: this._successHue, chromaScale: 1 },
      { name: 'warning', hue: this._warningHue, chromaScale: 1 },
      { name: 'danger', hue: this._dangerHue, chromaScale: 1 },
      { name: 'info', hue: this._infoHue, chromaScale: 1 },
    ];
  }

  private _buildPresetConfig(mode: 'light' | 'dark'): PresetConfig {
    if (this._advancedMode && this._pipeline.length > 0) {
      return {
        $name: `${this._themeName}-${mode}`,
        pipeline: [
          { transform: mode === 'dark' ? 'dark-mode' : 'light-mode' },
          ...this._pipeline,
        ],
      };
    }
    return {
      $name: `${this._themeName}-${mode}`,
      pipeline: [
        { transform: mode === 'dark' ? 'dark-mode' : 'light-mode' },
        { transform: 'oklch-scale', params: {
          hues: {
            accent: this._accentHue, neutral: this._neutralHue,
            success: this._successHue, warning: this._warningHue,
            danger: this._dangerHue, info: this._infoHue,
          },
          chroma: this._chroma, contrast: this._contrast,
          radius: this._borderRadius, density: this._density, shadow: this._shadowDepth,
          fontFamily: this._fontFamily, fontSize: this._baseFontSize,
        }},
        { transform: 'semantic-map' },
        { transform: 'gamut-clamp' },
      ],
    };
  }

  private _generatePreviewCSS(): string {
    initPresets();
    const config = this._buildPresetConfig(this._previewMode);
    try {
      const tokens = runPipeline(config);
      let themeCss = generateCSS(tokens, config.$name) + '\n\n' + generateDensityCSS();
      const r = this._borderRadius;
      const s = this._shadowDepth;
      const dMap = { compact: 0.75, normal: 1, spacious: 1.25 } as const;
      const d = dMap[this._density];
      themeCss += `\n.pages-theme-${config.$name} {\n`;
      themeCss += `  --pages-radius-sm: ${Math.round(r * 0.5)}px;\n`;
      themeCss += `  --pages-radius: ${r}px;\n`;
      themeCss += `  --pages-radius-md: ${Math.round(r * 1.5)}px;\n`;
      themeCss += `  --pages-radius-lg: ${Math.round(r * 2)}px;\n`;
      themeCss += `  --pages-radius-xl: ${Math.round(r * 3)}px;\n`;
      themeCss += `  --pages-radius-full: 9999px;\n`;
      themeCss += `  --pages-shadow-sm: 0 1px ${Math.round(2 + s * 6)}px oklch(0% 0 0 / ${(0.08 + s * 0.2).toFixed(2)});\n`;
      themeCss += `  --pages-shadow: 0 2px ${Math.round(4 + s * 12)}px oklch(0% 0 0 / ${(0.12 + s * 0.25).toFixed(2)});\n`;
      themeCss += `  --pages-shadow-md: 0 4px ${Math.round(8 + s * 20)}px oklch(0% 0 0 / ${(0.15 + s * 0.3).toFixed(2)});\n`;
      themeCss += `  --pages-shadow-lg: 0 8px ${Math.round(16 + s * 36)}px oklch(0% 0 0 / ${(0.2 + s * 0.35).toFixed(2)});\n`;
      themeCss += `  --pages-space-xs: ${Math.round(4 * d)}px;\n`;
      themeCss += `  --pages-space-sm: ${Math.round(8 * d)}px;\n`;
      themeCss += `  --pages-space-md: ${Math.round(16 * d)}px;\n`;
      themeCss += `  --pages-space-lg: ${Math.round(24 * d)}px;\n`;
      themeCss += `  --pages-space-xl: ${Math.round(32 * d)}px;\n`;
      const fontStacks: Record<string, string> = {
        system: "'Inter', system-ui, -apple-system, sans-serif",
        humanist: "'Atkinson Hyperlegible', Calibri, sans-serif",
        geometric: "'DM Sans', Futura, sans-serif",
        mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
        serif: "'Merriweather', Georgia, 'Times New Roman', serif",
        rounded: "'Nunito', 'Varela Round', sans-serif",
      };
      const ff = fontStacks[this._fontFamily] ?? fontStacks['system'];
      const fs = this._baseFontSize;
      themeCss += `  --pages-font-family: ${ff};\n`;
      themeCss += `  --pages-font-size-xs: ${Math.round(fs * 0.75)}px;\n`;
      themeCss += `  --pages-font-size-sm: ${Math.round(fs * 0.875)}px;\n`;
      themeCss += `  --pages-font-size: ${fs}px;\n`;
      themeCss += `  --pages-font-size-md: ${Math.round(fs * 1.125)}px;\n`;
      themeCss += `  --pages-font-size-lg: ${Math.round(fs * 1.5)}px;\n`;
      themeCss += `  --pages-font-size-xl: ${Math.round(fs * 2)}px;\n`;
      themeCss += `}\n`;
      return themeCss;
    } catch {
      return '';
    }
  }

  private _applyPreview(): void {
    const panel = this.shadowRoot?.querySelector('.designer-panel') as HTMLElement | null;
    if (!panel) return;

    if (this._previewThemeName) {
      const previewCss = this._generateThemePreviewCSS(this._previewThemeName);
      if (!previewCss) return;
      if (!this._previewStyleEl) {
        this._previewStyleEl = document.createElement('style');
        this.shadowRoot?.prepend(this._previewStyleEl);
      }
      this._previewStyleEl.textContent = previewCss.css;
      panel.className = `designer-panel pages-theme-${previewCss.name}`;
      return;
    }

    const css = this._generatePreviewCSS();
    if (!css) return;
    const themeName = `${this._themeName}-${this._previewMode}`;

    if (!this._previewStyleEl) {
      this._previewStyleEl = document.createElement('style');
      this.shadowRoot?.prepend(this._previewStyleEl);
    }
    this._previewStyleEl.textContent = css;
    panel.className = `designer-panel pages-theme-${themeName}`;
  }

  private _generateThemePreviewCSS(familyName: string): { css: string; name: string } | null {
    initPresets();
    const fullName = `${familyName}-${this._previewMode}`;
    const config = getBuiltinPreset(fullName);
    if (!config) return null;
    try {
      const tokens = runPipeline(config);
      let themeCss = generateCSS(tokens, config.$name) + '\n\n' + generateDensityCSS();
      const oklch = config.pipeline.find(t => t.transform === 'oklch-scale');
      const p = oklch?.params ?? {};
      const r = (p['radius'] as number) ?? 8;
      const s = (p['shadow'] as number) ?? 0.4;
      const dMap: Record<string, number> = { compact: 0.75, normal: 1, spacious: 1.25 };
      const d = dMap[(p['density'] as string) ?? 'normal'] ?? 1;
      const fontStacks: Record<string, string> = {
        system: "'Inter', system-ui, -apple-system, sans-serif",
        humanist: "'Atkinson Hyperlegible', Calibri, sans-serif",
        geometric: "'DM Sans', Futura, sans-serif",
        mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
        serif: "'Merriweather', Georgia, 'Times New Roman', serif",
        rounded: "'Nunito', 'Varela Round', sans-serif",
      };
      const ff = fontStacks[(p['fontFamily'] as string) ?? 'system'] ?? fontStacks['system'];
      const fs = (p['fontSize'] as number) ?? 14;
      themeCss += `\n.pages-theme-${config.$name} {\n`;
      themeCss += `  --pages-radius-sm: ${Math.round(r * 0.5)}px; --pages-radius: ${r}px; --pages-radius-md: ${Math.round(r * 1.5)}px; --pages-radius-lg: ${Math.round(r * 2)}px; --pages-radius-xl: ${Math.round(r * 3)}px; --pages-radius-full: 9999px;\n`;
      themeCss += `  --pages-shadow-sm: 0 1px ${Math.round(2 + s * 6)}px oklch(0% 0 0 / ${(0.08 + s * 0.2).toFixed(2)}); --pages-shadow: 0 2px ${Math.round(4 + s * 12)}px oklch(0% 0 0 / ${(0.12 + s * 0.25).toFixed(2)}); --pages-shadow-md: 0 4px ${Math.round(8 + s * 20)}px oklch(0% 0 0 / ${(0.15 + s * 0.3).toFixed(2)}); --pages-shadow-lg: 0 8px ${Math.round(16 + s * 36)}px oklch(0% 0 0 / ${(0.2 + s * 0.35).toFixed(2)});\n`;
      themeCss += `  --pages-space-xs: ${Math.round(4 * d)}px; --pages-space-sm: ${Math.round(8 * d)}px; --pages-space-md: ${Math.round(16 * d)}px; --pages-space-lg: ${Math.round(24 * d)}px; --pages-space-xl: ${Math.round(32 * d)}px;\n`;
      themeCss += `  --pages-font-family: ${ff}; --pages-font-size-xs: ${Math.round(fs * 0.75)}px; --pages-font-size-sm: ${Math.round(fs * 0.875)}px; --pages-font-size: ${fs}px; --pages-font-size-md: ${Math.round(fs * 1.125)}px; --pages-font-size-lg: ${Math.round(fs * 1.5)}px; --pages-font-size-xl: ${Math.round(fs * 2)}px;\n`;
      themeCss += `}\n`;
      return { css: themeCss, name: config.$name };
    } catch {
      return null;
    }
  }

  private _removePreviewStyle(): void {
    this._previewStyleEl?.remove();
    this._previewStyleEl = null;
  }

  override updated(changed: Map<string, unknown>): void {
    const sliderProps = [
      '_accentHue', '_neutralHue', '_chroma', '_contrast', '_previewMode', '_pipeline',
      '_successHue', '_warningHue', '_dangerHue', '_infoHue',
      '_borderRadius', '_density', '_shadowDepth', '_fontFamily', '_baseFontSize',
    ];
    if (sliderProps.some(p => changed.has(p)) && this.open) {
      if (!changed.has('_previewMode')) this._previewThemeName = null;
      this._applyPreview();
    }
    if (changed.has('_previewThemeName') && this.open) {
      this._applyPreview();
    }
    if (changed.has('open') && this.open) {
      this._syncPipelineFromSimple();
      requestAnimationFrame(() => this._applyPreview());
    }
  }

  private _syncPipelineFromSimple(): void {
    if (!this._advancedMode) {
      this._pipeline = [
        { transform: 'oklch-scale', params: {
          hues: {
            accent: this._accentHue, neutral: this._neutralHue,
            success: this._successHue, warning: this._warningHue,
            danger: this._dangerHue, info: this._infoHue,
          },
          chroma: this._chroma, contrast: this._contrast,
          radius: this._borderRadius, density: this._density, shadow: this._shadowDepth,
          fontFamily: this._fontFamily, fontSize: this._baseFontSize,
        }},
        { transform: 'semantic-map' },
        { transform: 'gamut-clamp' },
      ];
    }
  }

  private _onAccentHueChange(newHue: number): void {
    const delta = newHue - this._prevAccentHue;
    this._successHue = ((this._successHue + delta) % 360 + 360) % 360;
    this._warningHue = ((this._warningHue + delta) % 360 + 360) % 360;
    this._dangerHue = ((this._dangerHue + delta) % 360 + 360) % 360;
    this._infoHue = ((this._infoHue + delta) % 360 + 360) % 360;
    this._prevAccentHue = newHue;
    this._accentHue = newHue;
  }

  private _applyDesignerPreset(preset: DesignerPreset): void {
    this._accentHue = preset.accentHue;
    this._neutralHue = preset.neutralHue;
    this._chroma = preset.chroma;
    this._contrast = preset.contrast;
    this._successHue = DEFAULT_SEMANTIC_HUES.success;
    this._warningHue = DEFAULT_SEMANTIC_HUES.warning;
    this._dangerHue = DEFAULT_SEMANTIC_HUES.danger;
    this._infoHue = DEFAULT_SEMANTIC_HUES.info;
    this._prevAccentHue = preset.accentHue;
  }

  private _generateSwatches(isDark: boolean): { name: string; colors: string[] }[] {
    return this._getSemanticGroups().map(g => {
      const chromaVal = this._chroma * g.chromaScale;
      const scale = generateScale(g.hue, chromaVal, this._contrast, isDark);
      return { name: g.name, colors: Object.values(scale) };
    });
  }

  async _onSave(): Promise<void> {
    if (!this._themeName.trim()) return;
    initPresets();
    const isNew = !this._savedThemes.includes(this._themeName);

    for (const mode of ['light', 'dark'] as const) {
      const config = this._buildPresetConfig(mode);
      try {
        const tokens = runPipeline(config);
        const themeCss = generateCSS(tokens, config.$name) + '\n\n' + generateDensityCSS();
        registerTheme(config.$name, themeCss);
        await this._resolvedStorage?.save(config.$name, config);
      } catch { /* invalid pipeline */ }
    }

    await this._loadSavedList();
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent(isNew ? 'pages-theme-created' : 'pages-theme-updated', {
      bubbles: true,
      detail: { name: this._themeName, config: this._buildPresetConfig(this._previewMode) },
    }));
  }

  async _onLoad(name: string): Promise<void> {
    if (!this._resolvedStorage) return;
    const baseName = name.replace(/-(?:light|dark)$/, '');
    const darkName = `${baseName}-dark`;
    const lightName = `${baseName}-light`;
    const config = await this._resolvedStorage.load(darkName) ?? await this._resolvedStorage.load(lightName);
    if (!config) return;
    this._loadFromPresetConfig(config, baseName);
  }

  private _extractDesignerParams(config: PresetConfig): void {
    const oklchStage = config.pipeline.find(t => t.transform === 'oklch-scale');
    if (!oklchStage?.params) return;

    const hues = oklchStage.params['hues'] as Record<string, number | number[]> | undefined;
    if (hues) {
      const val = (k: string) => { const v = hues[k]; return Array.isArray(v) ? v[0]! : v; };
      this._accentHue = val('accent') ?? this._accentHue;
      this._neutralHue = val('neutral') ?? this._neutralHue;
      this._successHue = val('success') ?? DEFAULT_SEMANTIC_HUES.success;
      this._warningHue = val('warning') ?? DEFAULT_SEMANTIC_HUES.warning;
      this._dangerHue = val('danger') ?? DEFAULT_SEMANTIC_HUES.danger;
      this._infoHue = val('info') ?? DEFAULT_SEMANTIC_HUES.info;
      this._prevAccentHue = this._accentHue;
    }
    this._chroma = (oklchStage.params['chroma'] as number) ?? this._chroma;
    this._contrast = (oklchStage.params['contrast'] as number) ?? this._contrast;
    this._borderRadius = (oklchStage.params['radius'] as number) ?? this._borderRadius;
    this._density = (oklchStage.params['density'] as 'compact' | 'normal' | 'spacious') ?? this._density;
    this._shadowDepth = (oklchStage.params['shadow'] as number) ?? this._shadowDepth;
    this._fontFamily = (oklchStage.params['fontFamily'] as string) ?? this._fontFamily;
    this._baseFontSize = (oklchStage.params['fontSize'] as number) ?? this._baseFontSize;
  }

  async _onDelete(name: string): Promise<void> {
    if (!this._resolvedStorage) return;
    await this._resolvedStorage.remove(name);
    await this._loadSavedList();
    this.dispatchEvent(new CustomEvent('pages-theme-deleted', { bubbles: true, detail: { name } }));
  }

  _onImport(): void {
    const input = this.shadowRoot?.querySelector('#import-file') as HTMLInputElement;
    input?.click();
  }

  _onImportFile(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const config = JSON.parse(reader.result as string) as PresetConfig;
        this._loadFromPresetConfig(config, config.$name.replace(/-(?:light|dark)$/, ''));
      } catch { /* invalid JSON */ }
    };
    reader.readAsText(file);
  }

  _onExport(): void {
    const config = this._buildPresetConfig(this._previewMode);
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this._themeName}.theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _onClose(): void {
    this.open = false;
    this._removePreviewStyle();
    this.dispatchEvent(new CustomEvent('pages-designer-closed', { bubbles: true }));
  }

  override render() {
    if (!this.open) return nothing;
    const swatches = this._generateSwatches(this._previewMode === 'dark');
    return html`
      <div class="designer-overlay" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('designer-overlay')) this._onClose(); }}>
        <div class="designer-panel">
          <div class="designer-header">
            <h2>Theme Designer</h2>
            <select class="header-theme-select" @change=${(e: Event) => {
              const name = (e.target as HTMLSelectElement).value;
              if (name) applyTheme(name, this.target);
            }}>
              ${this._deduplicateFamilies(listThemes()).map(fam => html`
                <option value="${fam}-${this._previewMode}"
                  ?selected=${getTheme(this.target)?.replace(/-(?:light|dark)$/, '') === fam}>${fam}</option>
              `)}
            </select>
            <div class="header-spacer"></div>
            <input class="name-input" type="text" placeholder="Theme name"
              .value=${this._themeName}
              @input=${(e: Event) => { this._themeName = (e.target as HTMLInputElement).value; }} />
            <div class="preview-row">
              <button ?disabled=${this._previewMode === 'light'} @click=${() => { this._previewMode = 'light'; }}>Light</button>
              <button ?disabled=${this._previewMode === 'dark'} @click=${() => { this._previewMode = 'dark'; }}>Dark</button>
            </div>
          </div>

          <div class="designer-body">
            <div class="controls-panel">
              ${this._advancedMode ? html`
                <div class="tab-content">
                  ${this._renderPipelineEditor()}
                </div>
              ` : html`
                <div class="tab-bar">
                  <button class="tab-btn ${this._activeTab === 'colour' ? 'active' : ''}"
                    @click=${() => { this._activeTab = 'colour'; }}>Colour</button>
                  <button class="tab-btn ${this._activeTab === 'shape' ? 'active' : ''}"
                    @click=${() => { this._activeTab = 'shape'; }}>Shape</button>
                </div>
                <div class="tab-content">
                  ${this._activeTab === 'colour' ? this._renderColourTab(swatches) : this._renderShapeTab()}
                </div>
              `}

              <label class="advanced-toggle">
                <input type="checkbox" .checked=${this._advancedMode}
                  @change=${(e: Event) => { this._advancedMode = (e.target as HTMLInputElement).checked; }} />
                Advanced (pipeline editor)
              </label>
            </div>

            <div class="preview-panel">
              ${this._renderWidgetPreview()}
            </div>
          </div>

          <div class="toolbar">
            <button @click=${() => { this._onImport(); }}>Import</button>
            <input id="import-file" type="file" accept=".json" @change=${(e: Event) => { this._onImportFile(e); }} />
            <button @click=${() => { this._onExport(); }}>Export</button>
            <div class="toolbar-spacer"></div>
            <button @click=${() => { this._onClose(); }}>Close</button>
            <button class="primary" @click=${() => { void this._onSave(); }}>Save</button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderColourTab(swatches: { name: string; colors: string[] }[]) {
    const hueGradient = 'linear-gradient(to right, hsl(0,80%,50%),hsl(60,80%,50%),hsl(120,80%,50%),hsl(180,80%,50%),hsl(240,80%,50%),hsl(300,80%,50%),hsl(360,80%,50%))';
    const neutralGradient = 'linear-gradient(to right, hsl(0,20%,50%),hsl(60,20%,50%),hsl(120,20%,50%),hsl(180,20%,50%),hsl(240,20%,50%),hsl(300,20%,50%),hsl(360,20%,50%))';
    return html`
      <div class="control-group">
        <div class="collapsible-header control-label" @click=${() => { this._presetsOpen = !this._presetsOpen; }}>
          <span class="toggle-arrow ${this._presetsOpen ? 'open' : ''}">▶</span>
          Starting Point
        </div>
        ${this._presetsOpen ? html`
          <div class="preset-grid">
            ${DESIGNER_PRESETS.map(p => html`
              <button class="preset-chip" @click=${() => { this._applyDesignerPreset(p); }}
                title="${p.name}: hue ${p.accentHue}°, chroma ${p.chroma}">
                <span class="preset-dot" style="background: oklch(55% ${Math.max(p.chroma, 0.02)} ${p.accentHue})"></span>
                ${p.name}
              </button>
            `)}
          </div>
        ` : nothing}
      </div>

      ${this._renderThemeList()}

      <div class="control-group">
        <div class="collapsible-header control-label" @click=${() => { this._controlsOpen = !this._controlsOpen; }}>
          <span class="toggle-arrow ${this._controlsOpen ? 'open' : ''}">▶</span>
          Core
        </div>
        ${this._controlsOpen ? html`
          <div class="control-group">
            <div class="control-label" style="font-size:10px">Accent Hue</div>
            <div class="control-row">
              <input type="range" min="0" max="360" step="1" .value=${String(this._accentHue)}
                style="background: ${hueGradient}" class="hue-slider"
                @input=${(e: Event) => { this._onAccentHueChange(Number((e.target as HTMLInputElement).value)); }} />
              <span class="control-value">${this._accentHue}°</span>
            </div>
          </div>

          <div class="control-group">
            <div class="control-label" style="font-size:10px">Neutral Hue</div>
            <div class="control-row">
              <input type="range" min="0" max="360" step="1" .value=${String(this._neutralHue)}
                style="background: ${neutralGradient}" class="hue-slider"
                @input=${(e: Event) => { this._neutralHue = Number((e.target as HTMLInputElement).value); }} />
              <span class="control-value">${this._neutralHue}°</span>
            </div>
          </div>

          <div class="control-group">
            <div class="control-label" style="font-size:10px">Chroma</div>
            <div class="control-row">
              <input type="range" min="0" max="0.4" step="0.01" .value=${String(this._chroma)}
                @input=${(e: Event) => { this._chroma = Number((e.target as HTMLInputElement).value); }} />
              <span class="control-value">${this._chroma.toFixed(2)}</span>
            </div>
          </div>

          <div class="control-group">
            <div class="control-label" style="font-size:10px">Contrast</div>
            <div class="control-row">
              <input type="range" min="0" max="1" step="0.01" .value=${String(this._contrast)}
                @input=${(e: Event) => { this._contrast = Number((e.target as HTMLInputElement).value); }} />
              <span class="control-value">${this._contrast.toFixed(2)}</span>
            </div>
          </div>
        ` : nothing}
      </div>

      <div class="control-group">
        <div class="collapsible-header control-label" @click=${() => { this._semanticOpen = !this._semanticOpen; }}>
          <span class="toggle-arrow ${this._semanticOpen ? 'open' : ''}">▶</span>
          Semantic Colours
        </div>
        ${this._semanticOpen ? html`
          ${this._renderSemanticSlider('Success', this._successHue, (v: number) => { this._successHue = v; })}
          ${this._renderSemanticSlider('Warning', this._warningHue, (v: number) => { this._warningHue = v; })}
          ${this._renderSemanticSlider('Danger', this._dangerHue, (v: number) => { this._dangerHue = v; })}
          ${this._renderSemanticSlider('Info', this._infoHue, (v: number) => { this._infoHue = v; })}
        ` : nothing}
      </div>

      <div class="control-group">
        <div class="collapsible-header control-label" @click=${() => { this._swatchesOpen = !this._swatchesOpen; }}>
          <span class="toggle-arrow ${this._swatchesOpen ? 'open' : ''}">▶</span>
          Colour Scales
        </div>
        ${this._swatchesOpen ? html`
          ${swatches.map(s => html`
            <div class="swatch-section">
              <div class="swatch-label">${s.name}</div>
              <div class="swatch-row-grouped">
                ${[0, 1, 2, 3, 4, 5].map(gi => html`
                  <div class="swatch-group">
                    <div class="swatch-pair">
                      <div class="swatch" style="background:${s.colors[gi * 2]}" title="${s.name}-${gi * 2 + 1}: ${STEP_ROLES[gi * 2]}">${gi * 2 + 1}</div>
                      <div class="swatch" style="background:${s.colors[gi * 2 + 1]}" title="${s.name}-${gi * 2 + 2}: ${STEP_ROLES[gi * 2 + 1]}">${gi * 2 + 2}</div>
                    </div>
                    <div class="swatch-group-label">${GROUP_LABELS[gi]}</div>
                  </div>
                `)}
              </div>
            </div>
          `)}
        ` : nothing}
      </div>
    `;
  }

  private _renderSemanticSlider(label: string, value: number, onChange: (v: number) => void) {
    const hueGradient = 'linear-gradient(to right, hsl(0,70%,50%),hsl(60,70%,50%),hsl(120,70%,50%),hsl(180,70%,50%),hsl(240,70%,50%),hsl(300,70%,50%),hsl(360,70%,50%))';
    return html`
      <div class="control-group">
        <div class="control-label" style="font-size:10px">${label}</div>
        <div class="control-row">
          <input type="range" min="0" max="360" step="1" .value=${String(Math.round(value))}
            style="background: ${hueGradient}" class="hue-slider"
            @input=${(e: Event) => { onChange(Number((e.target as HTMLInputElement).value)); }} />
          <span class="control-value">${Math.round(value)}°</span>
        </div>
      </div>
    `;
  }

  private _renderShapeTab() {
    return html`
      <div class="control-group">
        <div class="control-label">Border Radius</div>
        <div class="control-row">
          <input type="range" min="0" max="24" step="1" .value=${String(this._borderRadius)}
            @input=${(e: Event) => { this._borderRadius = Number((e.target as HTMLInputElement).value); }} />
          <span class="control-value">${this._borderRadius}px</span>
        </div>
        <div class="radius-preview">
          <div class="radius-sample" style="border-radius: ${Math.round(this._borderRadius * 0.5)}px">sm</div>
          <div class="radius-sample" style="border-radius: ${this._borderRadius}px">md</div>
          <div class="radius-sample" style="border-radius: ${Math.round(this._borderRadius * 1.5)}px">lg</div>
          <div class="radius-sample" style="border-radius: ${Math.round(this._borderRadius * 2)}px">xl</div>
          <div class="radius-sample" style="border-radius: 9999px">full</div>
        </div>
      </div>

      <div class="control-group">
        <div class="control-label">Density</div>
        <div class="segment-control">
          ${(['compact', 'normal', 'spacious'] as const).map(d => html`
            <button class="segment-btn ${this._density === d ? 'active' : ''}"
              @click=${() => { this._density = d; }}>${d[0]!.toUpperCase() + d.slice(1)}</button>
          `)}
        </div>
      </div>

      <div class="control-group">
        <div class="control-label">Font Family</div>
        <select class="header-theme-select" style="width:100%;padding:6px 8px;font-size:12px"
          .value=${this._fontFamily}
          @change=${(e: Event) => { this._fontFamily = (e.target as HTMLSelectElement).value; }}>
          <option value="system">System (Inter, system-ui)</option>
          <option value="humanist">Humanist (Atkinson Hyperlegible)</option>
          <option value="geometric">Geometric (DM Sans)</option>
          <option value="rounded">Rounded (Nunito)</option>
          <option value="serif">Serif (Merriweather)</option>
          <option value="mono">Monospace (JetBrains Mono)</option>
        </select>
      </div>

      <div class="control-group">
        <div class="control-label">Base Font Size</div>
        <div class="control-row">
          <input type="range" min="12" max="20" step="1" .value=${String(this._baseFontSize)}
            @input=${(e: Event) => { this._baseFontSize = Number((e.target as HTMLInputElement).value); }} />
          <span class="control-value">${this._baseFontSize}px</span>
        </div>
      </div>

      <div class="control-group">
        <div class="control-label">Shadow Depth</div>
        <div class="control-row">
          <input type="range" min="0" max="1" step="0.05" .value=${String(this._shadowDepth)}
            @input=${(e: Event) => { this._shadowDepth = Number((e.target as HTMLInputElement).value); }} />
          <span class="control-value">${this._shadowDepth.toFixed(2)}</span>
        </div>
        <div class="preview-row" style="gap:12px;margin-top:4px">
          <div style="width:50px;height:36px;background:var(--pages-neutral-3);border-radius:var(--pages-radius-sm, 4px);box-shadow:var(--pages-shadow-sm);display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--pages-neutral-10)">sm</div>
          <div style="width:50px;height:36px;background:var(--pages-neutral-3);border-radius:var(--pages-radius-sm, 4px);box-shadow:var(--pages-shadow);display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--pages-neutral-10)">md</div>
          <div style="width:50px;height:36px;background:var(--pages-neutral-3);border-radius:var(--pages-radius-sm, 4px);box-shadow:var(--pages-shadow-md);display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--pages-neutral-10)">lg</div>
        </div>
      </div>
    `;
  }

  private _renderPipelineEditor() {
    return html`
      <div class="pipeline-editor">
        ${this._renderThemeList()}
        <div class="control-label">Pipeline Stages</div>
        ${this._pipeline.map((stage, i) => {
          const json = stage.params ? JSON.stringify(stage.params, null, 2) : '';
          return html`
            <div class="pipeline-stage">
              <div class="pipeline-stage-header">
                <span class="pipeline-stage-name">${stage.transform}</span>
                <button @click=${() => { this._movePipelineStage(i, -1); }} ?disabled=${i === 0} title="Move up">↑</button>
                <button @click=${() => { this._movePipelineStage(i, 1); }} ?disabled=${i === this._pipeline.length - 1} title="Move down">↓</button>
                <button @click=${() => { this._removePipelineStage(i); }} title="Remove">✕</button>
              </div>
              <div class="pipeline-stage-params">
                <div class="code-editor-wrap">
                  <div class="code-highlight" .innerHTML=${this._highlightJSON(json || '{}') + '\n'}></div>
                  <textarea class="code-textarea" .value=${json || '{}'}
                    @input=${(e: Event) => {
                      const ta = e.target as HTMLTextAreaElement;
                      const highlight = ta.previousElementSibling as HTMLElement;
                      if (highlight) highlight.innerHTML = this._highlightJSON(ta.value) + '\n';
                    }}
                    @change=${(e: Event) => { this._updateStageParams(i, (e.target as HTMLTextAreaElement).value); }}
                    @scroll=${(e: Event) => {
                      const ta = e.target as HTMLTextAreaElement;
                      const highlight = ta.previousElementSibling as HTMLElement;
                      if (highlight) { highlight.scrollTop = ta.scrollTop; highlight.scrollLeft = ta.scrollLeft; }
                    }}></textarea>
                </div>
              </div>
            </div>
          `;
        })}
        <button class="add-stage-btn" @click=${() => { this._addPipelineStage(); }}>+ Add Stage</button>
      </div>
    `;
  }

  private _renderWidgetPreview() {
    return html`
      <div class="preview-widgets">
        <div class="widget-section">
          <div class="widget-section-title">App Preview</div>
          <div class="dashboard-mockup">
            <div class="dash-header">
              <div class="dash-logo"></div>
              <span class="dash-title">Acme App</span>
              <div class="dash-spacer"></div>
              <input class="dash-search" placeholder="Search..." readonly />
              <div class="dash-notif">&#x1f514;<div class="dash-notif-dot"></div></div>
              <div class="dash-avatar">JP</div>
            </div>
            <div class="dash-body">
              <div class="dash-sidebar">
                ${['Dashboard', 'Analytics', 'Projects', 'Settings'].map(item => html`
                  <div class="dash-sidebar-item ${this._dashNav === item ? 'active' : ''}"
                    @click=${() => { this._dashNav = item; }}>${item}</div>
                `)}
              </div>
              <div class="dash-main">
                <div class="dash-breadcrumbs">
                  <a>Home</a><span>›</span>${this._dashNav}
                </div>
                ${this._renderDashContent()}
              </div>
            </div>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Alerts</div>
          <div class="preview-alert alert-success">Operation completed successfully.</div>
          <div class="preview-alert alert-warning">Please review before proceeding.</div>
          <div class="preview-alert alert-danger">Action failed — check the logs.</div>
          <div class="preview-alert alert-info">A new version is available.</div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Typography</div>
          <p class="preview-text-primary" style="font-size:var(--pages-font-size-xl, 28px);margin:0;font-weight:600">Heading 1</p>
          <p class="preview-text-primary" style="font-size:var(--pages-font-size-lg, 21px);margin:0;font-weight:500">Heading 2</p>
          <p class="preview-text-primary" style="font-size:var(--pages-font-size-md, 16px);margin:0;font-weight:500">Heading 3</p>
          <p class="preview-text-primary" style="font-size:var(--pages-font-size, 14px);margin:0">Body text — the main content colour</p>
          <p class="preview-text-secondary" style="font-size:var(--pages-font-size-sm, 12px);margin:0">Secondary text — supporting information</p>
          <p class="preview-text-muted" style="font-size:var(--pages-font-size-xs, 10px);margin:0">Small text — captions and fine print</p>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Buttons</div>
          <div class="preview-row">
            <button class="preview-btn preview-btn-primary">Primary</button>
            <button class="preview-btn preview-btn-secondary">Secondary</button>
            <button class="preview-btn preview-btn-danger">Danger</button>
            <button class="preview-btn preview-btn-success">Success</button>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Button States</div>
          <div class="preview-row">
            <div style="text-align:center">
              <button class="preview-btn preview-btn-primary">Default</button>
              <div class="state-label">step 9</div>
            </div>
            <div style="text-align:center">
              <button class="preview-btn preview-btn-hover">Hover</button>
              <div class="state-label">step 10</div>
            </div>
            <div style="text-align:center">
              <button class="preview-btn preview-btn-active">Active</button>
              <div class="state-label">step 8</div>
            </div>
            <div style="text-align:center">
              <button class="preview-btn preview-btn-disabled" disabled>Disabled</button>
              <div class="state-label">step 5</div>
            </div>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Navigation</div>
          <div class="preview-nav">
            ${['Dashboard', 'Analytics', 'Settings', 'Help'].map(item => html`
              <div class="preview-nav-item ${this._dashNav === item ? 'active' : ''}"
                @click=${() => { this._dashNav = item; }}>${item}</div>
            `)}
          </div>
          <div class="state-label" style="text-align:left">active = accent-3/11 &nbsp; hover = neutral-3 &nbsp; default = transparent</div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Form Validation</div>
          <div class="preview-row" style="align-items:start">
            <div>
              <input class="preview-input-focused" type="text" value="Focused" readonly />
              <div class="field-hint" style="color:var(--pages-neutral-9)">accent-8 border, accent-5 ring</div>
            </div>
            <div>
              <input class="preview-input-error" type="text" value="Invalid email" readonly />
              <div class="field-hint hint-error">danger-6 border, danger-9 text</div>
            </div>
            <div>
              <input class="preview-input-success" type="text" value="Confirmed" readonly />
              <div class="field-hint hint-success">success-6 border, success-9 text</div>
            </div>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Links & Text</div>
          <p style="margin:0;font-size:13px;color:var(--pages-neutral-12)">Body text with an <span class="preview-link">inline link</span> and <span style="color:var(--pages-accent-11)">accent-coloured emphasis</span> alongside <span style="color:var(--pages-neutral-10)">secondary text</span>.</p>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Inputs & Controls</div>
          <div class="preview-row">
            <input class="preview-input" type="text" placeholder="Text input..." />
            <select class="preview-select">
              <option>Select...</option>
              <option>Option A</option>
              <option>Option B</option>
            </select>
          </div>
          <div class="preview-row" style="margin-top:4px">
            <label class="preview-checkbox-row"><input type="checkbox" checked /> Checkbox</label>
            <label class="preview-checkbox-row"><input type="radio" name="prev-radio" checked /> Option A</label>
            <label class="preview-checkbox-row"><input type="radio" name="prev-radio" /> Option B</label>
            <div class="preview-switch ${this._switchOn ? 'on' : ''}" @click=${() => { this._switchOn = !this._switchOn; }}><div class="preview-switch-knob"></div></div>
            <span class="preview-text-secondary" style="font-size:12px">${this._switchOn ? 'On' : 'Off'}</span>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Chips & Tags</div>
          <div class="preview-row">
            <span class="preview-chip chip-accent">Accent</span>
            <span class="preview-chip chip-success">Success</span>
            <span class="preview-chip chip-warning">Warning</span>
            <span class="preview-chip chip-danger">Error</span>
            <span class="preview-chip chip-info">Info</span>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Badges</div>
          <div class="preview-row">
            <span class="preview-badge badge-success">Active</span>
            <span class="preview-badge badge-warning">Pending</span>
            <span class="preview-badge badge-danger">Failed</span>
            <span class="preview-badge badge-info">Review</span>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Cards</div>
          <div class="preview-card">
            <p style="margin:0 0 8px;font-weight:500;color:var(--pages-neutral-12)">Card Title</p>
            <p style="margin:0 0 12px;font-size:13px;color:var(--pages-neutral-11)">Card content with secondary text showing how surfaces, borders, and shadows look together.</p>
            <div class="preview-row">
              <button class="preview-btn preview-btn-primary" style="font-size:12px;padding:4px 10px">Action</button>
              <button class="preview-btn preview-btn-secondary" style="font-size:12px;padding:4px 10px">Cancel</button>
            </div>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Tabs</div>
          <div class="preview-tabs">
            ${['Overview', 'Details', 'Settings'].map(tab => html`
              <button class="preview-tab ${this._previewTab === tab ? 'active' : ''}"
                @click=${() => { this._previewTab = tab; }}>${tab}</button>
            `)}
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Progress</div>
          <div class="preview-progress">
            <div class="preview-progress-fill" style="width:65%;background:var(--pages-accent-9)"></div>
          </div>
          <div class="preview-row" style="margin-top:4px">
            <div class="preview-progress" style="flex:1">
              <div class="preview-progress-fill" style="width:100%;background:var(--pages-success-9)"></div>
            </div>
            <div class="preview-progress" style="flex:1">
              <div class="preview-progress-fill" style="width:40%;background:var(--pages-warning-9)"></div>
            </div>
            <div class="preview-progress" style="flex:1">
              <div class="preview-progress-fill" style="width:20%;background:var(--pages-danger-9)"></div>
            </div>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Table</div>
          <table class="preview-table">
            <thead><tr><th>Name</th><th>Status</th><th>Score</th></tr></thead>
            <tbody>
              <tr><td>Alpha</td><td><span class="preview-badge badge-success">Active</span></td><td>92</td></tr>
              <tr><td>Beta</td><td><span class="preview-badge badge-warning">Pending</span></td><td>67</td></tr>
              <tr><td>Gamma</td><td><span class="preview-badge badge-danger">Failed</span></td><td>23</td></tr>
              <tr><td>Delta</td><td><span class="preview-badge badge-info">Review</span></td><td>85</td></tr>
            </tbody>
          </table>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Surfaces & Borders</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
            <div style="background:var(--pages-neutral-1);border:1px solid var(--pages-neutral-4);border-radius:var(--pages-radius, 6px);padding:12px;text-align:center;font-size:11px;color:var(--pages-neutral-11);box-shadow:var(--pages-shadow-sm)">Surface 1</div>
            <div style="background:var(--pages-neutral-2);border:1px solid var(--pages-neutral-5);border-radius:var(--pages-radius, 6px);padding:12px;text-align:center;font-size:11px;color:var(--pages-neutral-11);box-shadow:var(--pages-shadow)">Surface 2</div>
            <div style="background:var(--pages-neutral-3);border:1px solid var(--pages-neutral-6);border-radius:var(--pages-radius, 6px);padding:12px;text-align:center;font-size:11px;color:var(--pages-neutral-11);box-shadow:var(--pages-shadow-md)">Surface 3</div>
            <div style="background:var(--pages-neutral-4);border:1px solid var(--pages-neutral-7);border-radius:var(--pages-radius, 6px);padding:12px;text-align:center;font-size:11px;color:var(--pages-neutral-11);box-shadow:var(--pages-shadow-lg)">Surface 4</div>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Accordion</div>
          <div class="preview-accordion">
            <details>
              <summary>What is the OKLCH pipeline?</summary>
              <div class="accordion-body">A perceptually uniform colour space that generates harmonious scales from seed values — hue, chroma, and contrast.</div>
            </details>
            <details open>
              <summary>How do semantic colours work?</summary>
              <div class="accordion-body">Semantic hues rotate with the accent hue, keeping all colours harmonious. Each semantic group generates a 12-step scale through the same pipeline.</div>
            </details>
            <details>
              <summary>Can I export my theme?</summary>
              <div class="accordion-body">Click Export in the toolbar to download your theme as a JSON file. Import it later or share it with others.</div>
            </details>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Avatars</div>
          <div class="preview-row">
            <div class="avatar-group">
              <div class="avatar-sm" style="background:var(--pages-accent-4);color:var(--pages-accent-11)">JP</div>
              <div class="avatar-sm" style="background:var(--pages-success-4);color:var(--pages-success-11)">AK</div>
              <div class="avatar-sm" style="background:var(--pages-warning-4);color:var(--pages-warning-11)">BL</div>
              <div class="avatar-sm" style="background:var(--pages-danger-4);color:var(--pages-danger-11)">CM</div>
              <div class="avatar-sm" style="background:var(--pages-neutral-5);color:var(--pages-neutral-11)">+3</div>
            </div>
          </div>
        </div>

        <div class="widget-section">
          <div class="widget-section-title">Toast / Notification</div>
          ${this._toasts[0] ? html`
            <div class="preview-toast">
              <span class="toast-icon" style="color:var(--pages-success-9)">●</span>
              <span>Changes saved successfully.</span>
              <span class="toast-dismiss" @click=${() => { this._toasts = [false, this._toasts[1]!]; }}>✕</span>
            </div>
          ` : nothing}
          ${this._toasts[1] ? html`
            <div class="preview-toast" style="margin-top:6px;border-left:3px solid var(--pages-warning-9)">
              <span class="toast-icon" style="color:var(--pages-warning-9)">●</span>
              <span>Your session expires in 5 minutes.</span>
              <span class="toast-dismiss" @click=${() => { this._toasts = [this._toasts[0]!, false]; }}>✕</span>
            </div>
          ` : nothing}
          ${!this._toasts[0] && !this._toasts[1] ? html`
            <button style="font-size:11px" @click=${() => { this._toasts = [true, true]; }}>Reset toasts</button>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _renderDashContent() {
    const activities = [
      ['Alice deployed v2.3 to production', '2m ago', 'success'],
      ['Bob fixed issue #421', '15m ago', 'accent'],
      ['Carol reviewed PR #89', '1h ago', 'info'],
      ['Build queue at 85% capacity', '2h ago', 'warning'],
      ['Dan merged feature/auth', '3h ago', 'success'],
      ['Eve opened issue #435', '4h ago', 'danger'],
      ['Frank updated docs', '5h ago', 'accent'],
      ['Grace ran benchmark suite', '6h ago', 'info'],
    ] as const;
    const pageSize = 4;
    const pageItems = activities.slice((this._dashPage - 1) * pageSize, this._dashPage * pageSize);

    if (this._dashNav === 'Analytics') {
      return html`
        <div style="font-size:12px;font-weight:600;color:var(--pages-neutral-11);text-transform:uppercase;letter-spacing:0.3px">Metrics</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${[['Conversion', 68, 'accent'], ['Performance', 92, 'success'], ['Error rate', 12, 'danger'], ['Satisfaction', 81, 'info']].map(([label, val, color]) => html`
            <div style="display:flex;align-items:center;gap:8px;font-size:11px">
              <span style="width:70px;color:var(--pages-neutral-10)">${label}</span>
              <div style="flex:1;height:6px;background:var(--pages-neutral-4);border-radius:var(--pages-radius-sm, 3px);overflow:hidden">
                <div style="width:${val}%;height:100%;background:var(--pages-${color}-9);border-radius:var(--pages-radius-sm, 3px)"></div>
              </div>
              <span style="width:30px;text-align:right;color:var(--pages-neutral-11);font-weight:500">${val}%</span>
            </div>
          `)}
        </div>
      `;
    }

    if (this._dashNav === 'Projects') {
      return html`
        <div style="display:flex;flex-direction:column;gap:4px">
          ${[['Design System', 'Active', 'success'], ['Mobile App', 'In Review', 'info'], ['API Gateway', 'Blocked', 'danger'], ['Docs Site', 'Planning', 'warning']].map(([name, status, color]) => html`
            <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:var(--pages-radius-sm, 4px);border:1px solid var(--pages-neutral-4);background:var(--pages-neutral-2)">
              <span style="flex:1;font-size:12px;font-weight:500;color:var(--pages-neutral-12)">${name}</span>
              <span class="preview-badge badge-${color}" style="font-size:10px">${status}</span>
            </div>
          `)}
        </div>
      `;
    }

    if (this._dashNav === 'Settings') {
      return html`
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
            <span style="color:var(--pages-neutral-12)">Email notifications</span>
            <div class="preview-switch ${this._switchOn ? 'on' : ''}" @click=${() => { this._switchOn = !this._switchOn; }}><div class="preview-switch-knob"></div></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
            <span style="color:var(--pages-neutral-12)">Language</span>
            <select class="preview-select" style="width:100px;font-size:11px;padding:3px 6px"><option>English</option><option>French</option></select>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
            <span style="color:var(--pages-neutral-12)">Theme</span>
            <div class="segment-control" style="width:120px">
              <button class="segment-btn active" style="font-size:10px;padding:3px">Light</button>
              <button class="segment-btn" style="font-size:10px;padding:3px">Dark</button>
            </div>
          </div>
          <div style="padding-top:6px;border-top:1px solid var(--pages-neutral-4)">
            <button class="preview-btn preview-btn-danger" style="font-size:11px;padding:4px 10px">Delete Account</button>
          </div>
        </div>
      `;
    }

    return html`
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-value">$12.4k</div><div class="stat-label">Revenue</div><div class="stat-trend trend-up">↑ 12%</div></div>
        <div class="stat-tile"><div class="stat-value">847</div><div class="stat-label">Users</div><div class="stat-trend trend-up">↑ 5%</div></div>
        <div class="stat-tile"><div class="stat-value">94.2%</div><div class="stat-label">Uptime</div><div class="stat-trend trend-down">↓ 0.3%</div></div>
      </div>
      <div class="dash-activity">
        <div class="dash-activity-title">Recent Activity — Page ${this._dashPage}</div>
        ${pageItems.map(([text, time, color]) => html`
          <div class="activity-item">
            <div class="activity-dot" style="background:var(--pages-${color}-9)"></div>
            <span class="activity-text">${text}</span>
            <span class="activity-time">${time}</span>
          </div>
        `)}
      </div>
      <div class="dash-pagination">
        <button class="page-btn" @click=${() => { if (this._dashPage > 1) this._dashPage--; }}>‹</button>
        ${[1, 2].map(n => html`
          <button class="page-btn ${this._dashPage === n ? 'active' : ''}" @click=${() => { this._dashPage = n; }}>${n}</button>
        `)}
        <button class="page-btn" @click=${() => { if (this._dashPage < 2) this._dashPage++; }}>›</button>
      </div>
    `;
  }

  private _renderThemeList() {
    const builtinFamilies = this._deduplicateFamilies(listBuiltinPresets());
    const customFamilies = this._deduplicateFamilies(this._savedThemes);
    const allFamilies = [...new Set([...builtinFamilies, ...customFamilies])].sort();
    if (allFamilies.length === 0) return nothing;

    return html`
      <div class="control-group">
        <div class="collapsible-header control-label" @click=${() => { this._existingOpen = !this._existingOpen; }}>
          <span class="toggle-arrow ${this._existingOpen ? 'open' : ''}">▶</span>
          Existing Themes
        </div>
        ${this._existingOpen ? html`<div class="theme-list-wrap ${allFamilies.length > 5 ? 'filterable' : ''}">
          ${allFamilies.length > 5 ? html`
            <input class="theme-list-filter ${this._themeFilter ? 'has-value' : ''}" type="text" placeholder="Filter themes..."
              .value=${this._themeFilter}
              @input=${(e: Event) => { this._themeFilter = (e.target as HTMLInputElement).value; }} />
          ` : nothing}
          <div class="theme-list">
          ${allFamilies.filter(n => !this._themeFilter || n.toLowerCase().includes(this._themeFilter.toLowerCase())).map(name => {
            const isBuiltin = builtinFamilies.includes(name);
            const isCustom = customFamilies.includes(name);
            return html`
              <div class="theme-list-item ${this._previewThemeName === name ? 'previewing' : ''}"
                @click=${() => { this._previewThemeName = this._previewThemeName === name ? null : name; }}>
                <span class="theme-name">${name}</span>
                ${isBuiltin ? html`<span class="theme-tag">builtin</span>` : nothing}
                <div class="theme-list-actions">
                  <button title="Edit" @click=${(e: Event) => { e.stopPropagation(); this._previewThemeName = null; void this._onEditTheme(name, isBuiltin); }}>✎</button>
                  <button title="Duplicate as new" @click=${(e: Event) => { e.stopPropagation(); this._previewThemeName = null; void this._onDuplicateTheme(name, isBuiltin); }}>⧉</button>
                  ${isCustom ? html`<button class="delete-btn" title="Delete" @click=${(e: Event) => { e.stopPropagation(); void this._onDelete(name); }}>✕</button>` : nothing}
                </div>
              </div>
            `;
          })}
        </div>
        </div>` : nothing}
      </div>
    `;
  }

  private async _onEditTheme(name: string, isBuiltin: boolean): Promise<void> {
    if (isBuiltin) {
      const config = getBuiltinPreset(`${name}-dark`) ?? getBuiltinPreset(`${name}-light`) ?? getBuiltinPreset(name);
      if (!config) return;
      this._loadFromPresetConfig(config, name);
    } else {
      await this._onLoad(name);
    }
  }

  private async _onDuplicateTheme(name: string, isBuiltin: boolean): Promise<void> {
    if (isBuiltin) {
      const config = getBuiltinPreset(`${name}-dark`) ?? getBuiltinPreset(`${name}-light`) ?? getBuiltinPreset(name);
      if (!config) return;
      this._loadFromPresetConfig(config, `${name}-copy`);
    } else {
      await this._onLoad(name);
      this._themeName = `${name}-copy`;
    }
  }

  private _loadFromPresetConfig(config: PresetConfig, themeName: string): void {
    this._themeName = themeName;
    const modeTransforms = config.pipeline.filter(t => t.transform !== 'dark-mode' && t.transform !== 'light-mode');
    this._pipeline = [...modeTransforms];
    this._extractDesignerParams(config);
  }

  private _deduplicateFamilies(names: string[]): string[] {
    const families = new Set<string>();
    for (const name of names) {
      families.add(name.replace(/-(?:light|dark)$/, ''));
    }
    return [...families].sort();
  }

  private _movePipelineStage(index: number, direction: number): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this._pipeline.length) return;
    const pipeline = [...this._pipeline];
    [pipeline[index], pipeline[newIndex]] = [pipeline[newIndex]!, pipeline[index]!];
    this._pipeline = pipeline;
  }

  private _removePipelineStage(index: number): void {
    this._pipeline = this._pipeline.filter((_, i) => i !== index);
  }

  private _addPipelineStage(): void {
    this._pipeline = [...this._pipeline, { transform: 'oklch-scale', params: { hues: { accent: this._accentHue }, chroma: 0.12 } }];
  }

  private _updateStageParams(index: number, json: string): void {
    try {
      const params = JSON.parse(json);
      const pipeline = [...this._pipeline];
      pipeline[index] = { ...pipeline[index]!, params };
      this._pipeline = pipeline;
    } catch { /* invalid JSON, ignore */ }
  }

  private _escapeHTML(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private _highlightJSON(json: string): string {
    return this._escapeHTML(json).replace(
      /("(?:[^"\\]|\\.)*")\s*(:)|("(?:[^"\\]|\\.)*")|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\]])|([,])|(:)/g,
      (_match, key, colonAfterKey, str, num, bool, nul, bracket, comma, colon) => {
        if (key) return `<span class="json-key">${key}</span><span class="json-colon">${colonAfterKey}</span>`;
        if (str) return `<span class="json-string">${str}</span>`;
        if (num) return `<span class="json-number">${num}</span>`;
        if (bool) return `<span class="json-bool">${bool}</span>`;
        if (nul) return `<span class="json-null">${nul}</span>`;
        if (bracket) return `<span class="json-bracket">${bracket}</span>`;
        if (comma) return `<span class="json-comma">${comma}</span>`;
        if (colon) return `<span class="json-colon">${colon}</span>`;
        return _match;
      }
    );
  }
}

customElements.define('pages-theme-designer', PagesThemeDesignerElement);
