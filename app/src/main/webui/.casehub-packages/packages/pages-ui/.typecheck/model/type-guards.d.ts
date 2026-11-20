import type { Component } from "./types.js";
import type { TypedComponent } from "@casehubio/pages-component";
export type { ComponentTypeRegistry, ComponentType, TypedComponent, } from "@casehubio/pages-component";
export { getProps, isComponentType, isGrid, isColumns, isRows, isStack, isTabs, isPills, isSidebar, isTree, isMenu, isAccordion, isCarousel, isPanel, isHtml, isMarkdown, isTitle, isLazyPage, isBarChart, isLineChart, isAreaChart, isPieChart, isScatterChart, isBubbleChart, isTimeseries, isDataTable, isGridTable, isMetric, isMeter, isSelector, isMap, isIframePlugin, isInput, isNumberInput, isSelect, isCheckbox, isDatePicker, isTextarea, isSplit, isDockBar, isHostPanel, } from "@casehubio/pages-component";
export declare function isPage(c: Component): c is TypedComponent<"page">;
export declare function isFormInput(c: Component): boolean;
//# sourceMappingURL=type-guards.d.ts.map