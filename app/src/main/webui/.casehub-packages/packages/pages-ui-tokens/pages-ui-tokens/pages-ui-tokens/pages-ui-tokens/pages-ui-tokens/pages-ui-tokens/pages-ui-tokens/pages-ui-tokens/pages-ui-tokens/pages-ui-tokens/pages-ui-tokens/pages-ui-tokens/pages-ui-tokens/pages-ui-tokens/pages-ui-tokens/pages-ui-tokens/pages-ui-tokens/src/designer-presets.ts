export interface DesignerPreset {
  readonly name: string;
  readonly accentHue: number;
  readonly neutralHue: number;
  readonly chroma: number;
  readonly contrast: number;
}

export const DESIGNER_PRESETS: readonly DesignerPreset[] = [
  { name: 'Default',     accentHue: 245, neutralHue: 220, chroma: 0.12, contrast: 0.50 },
  { name: 'Ocean',       accentHue: 210, neutralHue: 215, chroma: 0.14, contrast: 0.50 },
  { name: 'Sapphire',    accentHue: 230, neutralHue: 225, chroma: 0.18, contrast: 0.55 },
  { name: 'Indigo',      accentHue: 260, neutralHue: 250, chroma: 0.16, contrast: 0.50 },
  { name: 'Lavender',    accentHue: 275, neutralHue: 260, chroma: 0.10, contrast: 0.45 },
  { name: 'Plum',        accentHue: 290, neutralHue: 270, chroma: 0.14, contrast: 0.55 },
  { name: 'Berry',       accentHue: 310, neutralHue: 280, chroma: 0.16, contrast: 0.50 },
  { name: 'Rose',        accentHue: 340, neutralHue: 330, chroma: 0.12, contrast: 0.45 },
  { name: 'Coral',       accentHue: 15,  neutralHue: 20,  chroma: 0.14, contrast: 0.50 },
  { name: 'Ruby',        accentHue: 5,   neutralHue: 10,  chroma: 0.18, contrast: 0.55 },
  { name: 'Sunset',      accentHue: 25,  neutralHue: 30,  chroma: 0.16, contrast: 0.50 },
  { name: 'Amber',       accentHue: 45,  neutralHue: 40,  chroma: 0.14, contrast: 0.50 },
  { name: 'Gold',        accentHue: 55,  neutralHue: 45,  chroma: 0.12, contrast: 0.50 },
  { name: 'Copper',      accentHue: 30,  neutralHue: 25,  chroma: 0.10, contrast: 0.55 },
  { name: 'Mint',        accentHue: 160, neutralHue: 170, chroma: 0.10, contrast: 0.45 },
  { name: 'Emerald',     accentHue: 150, neutralHue: 155, chroma: 0.16, contrast: 0.50 },
  { name: 'Forest',      accentHue: 140, neutralHue: 130, chroma: 0.10, contrast: 0.55 },
  { name: 'Teal',        accentHue: 180, neutralHue: 185, chroma: 0.12, contrast: 0.50 },
  { name: 'Arctic',      accentHue: 195, neutralHue: 200, chroma: 0.08, contrast: 0.45 },
  { name: 'Slate',       accentHue: 215, neutralHue: 210, chroma: 0.04, contrast: 0.50 },
  { name: 'Charcoal',    accentHue: 220, neutralHue: 220, chroma: 0.02, contrast: 0.55 },
  { name: 'Monochrome',  accentHue: 0,   neutralHue: 0,   chroma: 0.00, contrast: 0.50 },
  { name: 'High Contrast', accentHue: 245, neutralHue: 220, chroma: 0.16, contrast: 0.85 },
  { name: 'Soft',        accentHue: 245, neutralHue: 220, chroma: 0.06, contrast: 0.30 },
];
