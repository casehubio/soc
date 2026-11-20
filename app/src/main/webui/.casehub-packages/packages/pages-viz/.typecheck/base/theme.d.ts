export interface PagesTheme {
    readonly font: string;
    readonly fontSize: string;
    readonly text: string;
    readonly textMuted: string;
    readonly bg: string;
    readonly bgAlt: string;
    readonly bgHover: string;
    readonly bgDisabled: string;
    readonly border: string;
    readonly radius: string;
    readonly accent: string;
    readonly accentHover: string;
    readonly accentSubtle: string;
}
export declare const LIGHT_THEME: PagesTheme;
export declare const DARK_THEME: PagesTheme;
export declare function applyTheme(element: HTMLElement, theme: PagesTheme | "light" | "dark"): void;
export declare function clearTheme(element: HTMLElement): void;
//# sourceMappingURL=theme.d.ts.map