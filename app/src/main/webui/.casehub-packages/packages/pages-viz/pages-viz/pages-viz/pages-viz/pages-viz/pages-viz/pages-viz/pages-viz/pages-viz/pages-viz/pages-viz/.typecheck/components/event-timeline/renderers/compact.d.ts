import type { TemplateResult } from 'lit';
import type { EventTimelineNode } from '../../event-timeline-types.js';
export interface CompactTimelineOptions {
    onExpandRequested: () => void;
    onKeyDown: (e: KeyboardEvent) => void;
}
export declare function renderCompactTimeline(nodes: EventTimelineNode[], opts: CompactTimelineOptions): TemplateResult;
export declare const compactTimelineStyles: import("lit").CSSResult;
//# sourceMappingURL=compact.d.ts.map