import { LitElement, nothing } from 'lit';
import type { ThemeStorage } from './theme-storage.js';
import type { PresetConfig, TransformDef } from './types.js';
export declare class PagesThemeDesignerElement extends LitElement {
    static styles: import("lit").CSSResult;
    static properties: {
        open: {
            type: BooleanConstructor;
            reflect: boolean;
        };
        target: {
            attribute: boolean;
        };
        storage: {
            attribute: boolean;
        };
        preset: {
            attribute: boolean;
        };
        _accentHue: {
            state: boolean;
        };
        _neutralHue: {
            state: boolean;
        };
        _chroma: {
            state: boolean;
        };
        _contrast: {
            state: boolean;
        };
        _themeName: {
            state: boolean;
        };
        _advancedMode: {
            state: boolean;
        };
        _pipeline: {
            state: boolean;
        };
        _savedThemes: {
            state: boolean;
        };
        _previewMode: {
            state: boolean;
        };
        _presetsOpen: {
            state: boolean;
        };
        _controlsOpen: {
            state: boolean;
        };
        _swatchesOpen: {
            state: boolean;
        };
        _existingOpen: {
            state: boolean;
        };
    };
    open: boolean;
    target: HTMLElement;
    storage: ThemeStorage | undefined;
    preset: PresetConfig | undefined;
    _accentHue: number;
    _neutralHue: number;
    _chroma: number;
    _contrast: number;
    _themeName: string;
    _advancedMode: boolean;
    _pipeline: TransformDef[];
    _savedThemes: string[];
    _previewMode: 'light' | 'dark';
    _presetsOpen: boolean;
    _controlsOpen: boolean;
    _swatchesOpen: boolean;
    _existingOpen: boolean;
    private _resolvedStorage;
    private _previewStyleEl;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _onKeyDown;
    private _initStorage;
    private _loadSavedList;
    private _buildPresetConfig;
    private _generatePreviewCSS;
    private _applyPreview;
    private _removePreviewStyle;
    updated(changed: Map<string, unknown>): void;
    private _syncPipelineFromSimple;
    private _applyDesignerPreset;
    private _generateSwatches;
    _onSave(): Promise<void>;
    _onLoad(name: string): Promise<void>;
    _onDelete(name: string): Promise<void>;
    _onImport(): void;
    _onImportFile(e: Event): void;
    _onExport(): void;
    _onClose(): void;
    render(): typeof nothing | import("lit-html").TemplateResult<1>;
    private _renderSimpleControls;
    private _renderPipelineEditor;
    private _renderWidgetPreview;
    private _renderThemeList;
    private _onEditTheme;
    private _onDuplicateTheme;
    private _loadFromPresetConfig;
    private _deduplicateFamilies;
    private _movePipelineStage;
    private _removePipelineStage;
    private _addPipelineStage;
    private _updateStageParams;
    private _highlightJSON;
}
//# sourceMappingURL=theme-designer.d.ts.map