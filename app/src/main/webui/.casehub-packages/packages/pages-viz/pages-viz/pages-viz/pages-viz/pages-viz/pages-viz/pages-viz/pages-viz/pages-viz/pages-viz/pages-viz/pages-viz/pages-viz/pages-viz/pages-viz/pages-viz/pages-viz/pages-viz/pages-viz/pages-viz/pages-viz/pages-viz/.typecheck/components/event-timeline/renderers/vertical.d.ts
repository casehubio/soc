import type { TemplateResult } from 'lit';
import type { EventTimelineNode } from '../../event-timeline-types.js';
export interface VerticalTimelineOptions {
    expandedKeys: Set<string>;
    onNodeClick: (node: EventTimelineNode, index: number) => void;
    onToggleExpand: (key: string) => void;
    onKeyDown: (e: KeyboardEvent, index: number) => void;
    renderNode?: ((node: EventTimelineNode) => unknown) | undefined;
    renderDetail?: ((node: EventTimelineNode) => unknown) | undefined;
}
export declare function renderVerticalTimeline(nodes: EventTimelineNode[], opts: VerticalTimelineOptions): TemplateResult;
export declare const verticalTimelineStyles: import("lit").CSSResult;
//# sourceMappingURL=vertical.d.ts.map