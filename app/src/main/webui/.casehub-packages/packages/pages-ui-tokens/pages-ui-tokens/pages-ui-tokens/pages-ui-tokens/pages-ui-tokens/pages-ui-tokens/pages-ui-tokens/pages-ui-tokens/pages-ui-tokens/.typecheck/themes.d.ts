export interface ThemeConfig {
    readonly baseHue: number;
    readonly accentHue: number;
    readonly chroma: number;
    readonly contrast: number;
}
export declare const DEFAULT_THEME: ThemeConfig;
export declare function generateThemeCSS(config: ThemeConfig): string;
export declare function injectTheme(config: ThemeConfig, target?: HTMLElement): void;
export declare function applyThemeMode(element: HTMLElement, mode: 'light' | 'dark'): void;
//# sourceMappingURL=themes.d.ts.map