import type { TemplateResult } from 'lit';

export interface PaletteItem {
  readonly type: string;
  readonly label: string;
  readonly icon: string;
  readonly group?: string;
}

export interface PaletteSelectDetail {
  readonly item: PaletteItem;
}

export type IconRenderer = (icon: string) => TemplateResult;

export type PaletteMode = 'standard' | 'compact';
