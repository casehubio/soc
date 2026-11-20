import type { GroupedViewProps, GroupedViewMode, GroupedViewPreset, GroupDisplayMode, ContentDisplayMode } from "@casehubio/pages-component";
interface PresetDef {
    readonly groupDisplay: GroupDisplayMode;
    readonly contentDisplay: ContentDisplayMode;
    readonly defaultExpanded: boolean;
    readonly guidance: string;
}
export declare const PRESETS: Record<GroupedViewPreset, PresetDef>;
export declare function resolvePreset(props: GroupedViewProps): GroupedViewMode;
export {};
//# sourceMappingURL=presets.d.ts.map