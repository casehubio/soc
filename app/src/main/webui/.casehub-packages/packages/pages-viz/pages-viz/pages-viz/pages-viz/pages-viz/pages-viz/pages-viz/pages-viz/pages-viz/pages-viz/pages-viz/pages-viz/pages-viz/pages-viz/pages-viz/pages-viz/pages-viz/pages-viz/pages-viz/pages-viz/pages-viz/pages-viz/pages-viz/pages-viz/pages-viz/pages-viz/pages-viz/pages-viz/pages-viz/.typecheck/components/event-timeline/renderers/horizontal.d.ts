import type { TemplateResult } from 'lit';
import type { EventTimelineNode } from '../../event-timeline-types.js';
export interface HorizontalTimelineOptions {
    onNodeClick: (node: EventTimelineNode, index: number) => void;
    onKeyDown: (e: KeyboardEvent, index: number) => void;
    renderNode?: ((node: EventTimelineNode) => unknown) | undefined;
}
export declare function renderHorizontalTimeline(nodes: EventTimelineNode[], opts: HorizontalTimelineOptions): TemplateResult;
export declare const horizontalTimelineStyles: import("lit").CSSResult;
//# sourceMappingURL=horizontal.d.ts.map