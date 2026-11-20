import { type TemplateResult, type PropertyValues } from "lit";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { EventTimelineProps, EventTimelineLayout } from "@casehubio/pages-component";
import { PagesElement } from "../base/PagesElement.js";
import type { EventTimelineNode, EventTimelineStrategy } from "./event-timeline-types.js";
export declare class PagesEventTimeline extends PagesElement<EventTimelineProps> {
    private static _strategyRegistry;
    static registerStrategy(key: string, strategy: EventTimelineStrategy): void;
    strategy?: EventTimelineStrategy;
    data?: unknown;
    activeFilters?: Set<string> | string[];
    renderNode?: (node: EventTimelineNode) => unknown;
    renderDetail?: (node: EventTimelineNode) => unknown;
    layout?: EventTimelineLayout;
    endpoint?: string;
    headers?: Record<string, string> | (() => Record<string, string>);
    pageSize: number;
    private _nodes;
    private _expandedKeys;
    private _internalFilters;
    private _selfFetchLoading;
    private _selfFetchError;
    private _paginationMeta;
    private _loadingMore;
    private _lastData;
    private _paginatedEndpoint;
    private _paginatedPageSize;
    connectedCallback(): void;
    static styles: import("lit").CSSResult;
    private _resolveStrategy;
    private get _activeLayout();
    private get _resolvedFilters();
    private get _filteredNodes();
    private _resolveRenderNode;
    private _resolveRenderDetail;
    private get _isSelfFetch();
    private get _isPaginated();
    configure(props: Record<string, unknown>): void;
    private _resolveHeaders;
    private _buildPagedUrl;
    private _fetchPage;
    private _loadMore;
    private _fetchEndpoint;
    updated(changed: PropertyValues): void;
    render(): TemplateResult;
    private _renderStandaloneContent;
    protected renderContent(props: EventTimelineProps, dataset: TypedDataSet): TemplateResult;
    private _renderTimeline;
    private _renderPaginationFooter;
    private _dataSetToNodes;
    private _handleFilterToggle;
    private _handleToggleExpand;
    private _handleNodeClick;
    private _handleVerticalKeyDown;
    private _handleHorizontalKeyDown;
}
declare global {
    interface HTMLElementTagNameMap {
        "pages-event-timeline": PagesEventTimeline;
    }
}
//# sourceMappingURL=PagesEventTimeline.d.ts.map