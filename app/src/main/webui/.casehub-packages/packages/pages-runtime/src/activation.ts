import type {Component, PermissionContext, DockWorkbenchConfig, DockPanelConfig, DockSideConfig, DockItem, DockZone, LayoutStore, LayoutState} from "@casehubio/pages-component";
import {ALLOW_ALL} from "@casehubio/pages-component";
import "@casehubio/pages-primitives/dock";
import type {PagesDockWorkbench} from "@casehubio/pages-primitives/dock";
import {createZoneLayoutEngine} from "./zone-layout-engine.js";
import type {DataSetLookup} from "@casehubio/pages-data";
import type {ColumnId, DataSetId, TypedRow} from "@casehubio/pages-data";
import {ColumnType} from "@casehubio/pages-data";
import type {DataSetEntry, DataSetScope} from "./dataset-scope.js";
import {extendDataSetScope} from "./dataset-scope.js";
import {toTypedDataSet} from "@casehubio/pages-data";
import type {PagesElement} from "@casehubio/pages-viz/dist/base/PagesElement.js";
import type {VizComponentProps} from "@casehubio/pages-viz/dist/base/types.js";
import type {PageProps} from "@casehubio/pages-ui/dist/model/page-types.js";
import {renderComponent} from "@casehubio/pages-component";
import {parsePage} from "@casehubio/pages-ui/dist/parser/page-parser.js";
import {load as yamlLoad} from "js-yaml";
import type {ComponentRegistry} from "./registry.js";
import type {PagePathMap} from "./page-paths.js";
import {extendPagePathMap} from "./page-paths.js";
import type {PageIndex} from "./navigation.js";
import {extendPageIndex} from "./navigation.js";
import type {DataScopeRegistry} from "./data-scope-registry.js";
import type {SaveConfigRegistry} from "./save-config-registry.js";
import {renderHtml, renderMarkdown, renderTitle} from "./content.js";
import type {ContextManager, ContextConsumer} from "./context-wiring.js";
import type {EscapeMode} from "@casehubio/pages-component";
import {evaluateExpression, hasTemplateVars, resolveTemplate, allTemplateVarsResolved} from "@casehubio/pages-component";
import type {RuntimeContext} from "@casehubio/pages-component";
import type {PagesContentElement} from "@casehubio/pages-viz/dist/base/PagesContentElement.js";
import {lookupPanel} from "./panel-registry.js";
import type {ConfigurablePanel, DataReceiver} from "@casehubio/pages-component";
import {createFormFieldProxy, createHostPanelProxy} from "./form-field-proxy.js";

function validateFormField(
  schema: { minLength?: number; maxLength?: number; minimum?: number; maximum?: number; pattern?: string },
  value: unknown,
  required: boolean,
): string | null {
  if (required && (value === null || value === undefined || value === "")) return "Required";
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    if (schema.pattern != null && !new RegExp(schema.pattern).test(value)) return "Invalid format";
    if (schema.minLength != null && value.length < schema.minLength) return `Must be at least ${schema.minLength} characters`;
    if (schema.maxLength != null && value.length > schema.maxLength) return `Must be at most ${schema.maxLength} characters`;
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) return `Must be at least ${schema.minimum}`;
    if (schema.maximum != null && value > schema.maximum) return `Must be at most ${schema.maximum}`;
  }
  return null;
}
import type {HostPanelProps} from "@casehubio/pages-component";
import type {ZoneLayoutEngine} from "./zone-layout-engine.js";
import type {FloatingWorkspaceProps, ContentFactory, ContainerState} from "@casehubio/pages-component";
import {wireFloatingWorkspace} from "./wire-floating-workspace.js";
import {createContainer} from "./frame-sandbox/index.js";
import type {Container} from "./frame-sandbox/types.js";
import {createFrameKeyboardHandler} from "./frame-keyboard.js";
import {configToContainerState} from "./layout-migration.js";
import {attachDockDrag} from "./dock-drag.js";
import "@casehubio/pages-ui-components/input";
import "@casehubio/pages-ui-components/select";
import "@casehubio/pages-ui-components/textarea";
import "@casehubio/pages-ui-components/checkbox";

const STANDALONE_FORM_TYPES = new Set(["input", "select", "textarea", "checkbox"]);

const TAG_NAME_OVERRIDES: ReadonlyMap<string, string> = new Map([
  ["badge", "pages-data-badge"],
]);
const LEGACY_FORM_TYPES = new Set(["number-input", "date-picker"]);
const FORM_INPUT_TYPES = new Set([...STANDALONE_FORM_TYPES, ...LEGACY_FORM_TYPES]);

const DATA_COMPONENT_TYPES = new Set([
  "bar-chart",
  "line-chart",
  "area-chart",
  "pie-chart",
  "scatter-chart",
  "bubble-chart",
  "heatmap-chart",
  "treemap-chart",
  "density-heatmap",
  "timeseries",
  "data-table",
  "grid-table",
  "metric",
  "meter",
  "selector",
  "map",
  "iframe-plugin",
  "badge",
  "countdown",
  "timeline",
  "graph",
  "graph-canvas",
  "event-timeline",
  "grouped-view",
  "schema-form",
  ...FORM_INPUT_TYPES,
]);

export interface LazyPageOptions {
  readonly fetchFn: typeof globalThis.fetch;
  readonly baseUrl: string | undefined;
  readonly abortSignal: AbortSignal;
  readonly permissions: PermissionContext;
  readonly pageIndex: PageIndex;
  readonly dataSetScope: DataSetScope;
  readonly dataScopeRegistry: DataScopeRegistry;
  readonly saveConfigRegistry: SaveConfigRegistry;
  readonly lazyPageResolutions: Map<Component, Component>;
  readonly zoneEngine?: ZoneLayoutEngine | undefined;
  readonly siteTarget?: HTMLElement | undefined;
  readonly floatingWorkspaceRef?: {
    rootContainer: Container | undefined;
    stash: ContainerState | undefined;
  };
  readonly zoneEngineRef?: { current: ZoneLayoutEngine | undefined };
  readonly nestingDepth?: number;
  readonly layoutStore?: LayoutStore | undefined;
  readonly layoutKey?: string | undefined;
  readonly seedLayout?: LayoutState | null | undefined;
}





export function createActivationCallback(
  registry: ComponentRegistry,
  pagePathMap: PagePathMap,
  options?: LazyPageOptions,
  contextManager?: ContextManager,
): (el: HTMLElement, component: Component) => void {
  const yamlCache = new Map<string, string>();

  const callback = (el: HTMLElement, component: Component): void => {
    const componentId = el.dataset.componentId;
    if (!componentId) return;

    const pagePath = pagePathMap.get(component) ?? "";

    // Handle static visible: false (unless visibleWhen overrides it)
    const staticVisible = (component.props as Record<string, unknown> | undefined)?.visible;
    if (!component.visibleWhen && staticVisible === false) {
      el.hidden = true;
    }

    if (component.type === "panel" || component.type === "host-panel") {
      const titleBar = el.querySelector("[data-panel-title]") as HTMLElement | null;
      if (titleBar) {
        titleBar.style.position = "relative";
        const detachBtn = document.createElement("button");
        detachBtn.dataset.detach = "";
        detachBtn.textContent = "↗";
        detachBtn.title = "Detach panel";
        detachBtn.style.cssText = "position:absolute;right:4px;top:50%;transform:translateY(-50%);border:none;background:transparent;cursor:pointer;font-size:14px;opacity:0.5;padding:2px 4px;border-radius:var(--pages-radius-sm,4px);";
        detachBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          el.dispatchEvent(new CustomEvent("pages-panel-detach", {
            bubbles: true, composed: true,
            detail: { componentId },
          }));
        });
        detachBtn.addEventListener("mouseenter", () => { detachBtn.style.opacity = "1"; });
        detachBtn.addEventListener("mouseleave", () => { detachBtn.style.opacity = "0.5"; });
        titleBar.appendChild(detachBtn);
      }
    }

    // Register DataScope and SaveConfig for page components
    if (component.type === "page" && options) {
      const pageProps = component.props as PageProps | undefined;
      if (pageProps?.dataScope) {
        options.dataScopeRegistry.set(pagePath, pageProps.dataScope);
      }
      if (pageProps?.save) {
        options.saveConfigRegistry.set(pagePath, pageProps.save);
      }
    }

    if (STANDALONE_FORM_TYPES.has(component.type)) {
      const tagName = `pages-${component.type}`;
      const formEl = document.createElement(tagName);
      const field = (component.props as Record<string, unknown> | undefined)?.field as string | undefined;

      if (component.props) {
        const p = component.props as Record<string, unknown>;
        if (p.label) (formEl as any).label = p.label;
        if (p.placeholder) (formEl as any).placeholder = p.placeholder;
        if (p.maxLength) (formEl as any).maxlength = p.maxLength;
        if (p.required) (formEl as any).required = p.required;
        if (p.readonly) (formEl as any).readonly = p.readonly;
        if (p.rows) (formEl as any).rows = p.rows;
        if (component.type === "select" && p.options) {
          const opts = p.options as { values?: string[] };
          if (opts.values) {
            (formEl as any).options = opts.values.map((v: string) => ({ value: v, label: v }));
          }
        }
      }

      const proxy = field ? createFormFieldProxy(formEl, field) : undefined;
      let lookup = (component.props as Record<string, unknown> | undefined)?.lookup as DataSetLookup | undefined;

      if (options) {
        const pageDataScope = options.dataScopeRegistry.get(pagePath);
        if (pageDataScope) {
          lookup = { dataSetId: pageDataScope.dataset, operations: [] };
        } else if (field) {
          (formEl as any).error = "Form input requires page dataScope";
        }
      }

      const entry = {
        element: el,
        ...(proxy && { vizElement: proxy }),
        component,
        pagePath,
        hasExplicitId: component.id !== undefined,
        ...(lookup !== undefined && { originalLookup: lookup }),
      };
      registry.set(componentId, entry);
      el.appendChild(formEl);

      if (field) {
        formEl.addEventListener("input", () => {
          formEl.dispatchEvent(new CustomEvent("pages-field-change", {
            bubbles: true, composed: true,
            detail: { field, value: (formEl as any).value, committed: false },
          }));
        });
        formEl.addEventListener("change", () => {
          const val = component.type === "checkbox" ? (formEl as any).checked : (formEl as any).value;
          formEl.dispatchEvent(new CustomEvent("pages-field-change", {
            bubbles: true, composed: true,
            detail: { field, value: val, committed: true },
          }));
        });

        formEl.addEventListener("blur", () => {
          const scope = el.closest('[data-component-type="form-scope"]') as HTMLElement | null;
          if (!scope || !(scope as any).__formScopeValidateOnBlur) return;
          const schema = (scope as any).__formScopeSchema as { properties?: Record<string, unknown>; required?: string[] } | undefined;
          if (!schema?.properties?.[field]) return;
          const fieldSchema = schema.properties[field] as { minLength?: number; maxLength?: number; minimum?: number; maximum?: number; pattern?: string };
          const isRequired = schema.required?.includes(field) ?? false;
          const val = component.type === "checkbox" ? (formEl as any).checked : (formEl as any).value;
          const error = validateFormField(fieldSchema, val, isRequired);
          (formEl as any).error = error ?? "";
        }, true);
      }

      if (proxy && lookup) {
        formEl.dispatchEvent(new CustomEvent("pages-data-request", {
          bubbles: true, composed: true,
          detail: { element: proxy, lookup },
        }));
      }

      if (component.visibleWhen && contextManager) {
        registerVisibleWhenConsumer(el, null, component.visibleWhen, contextManager);
      }

      return;
    }

    if (DATA_COMPONENT_TYPES.has(component.type)) {
      const tagName = TAG_NAME_OVERRIDES.get(component.type) ?? `pages-${component.type}`;
      const vizEl = document.createElement(tagName) as PagesElement<VizComponentProps>;

      const isFormInput = FORM_INPUT_TYPES.has(component.type);

      let lookup = (component.props as Record<string, unknown> | undefined)?.lookup as
        | DataSetLookup
        | undefined;

      // Form input implicit lookup injection
      if (isFormInput && options) {
        const pageDataScope = options.dataScopeRegistry.get(pagePath);
        if (pageDataScope) {
          lookup = { dataSetId: pageDataScope.dataset, operations: [] };
          const hasSave = options.saveConfigRegistry.has(pagePath);
          (vizEl as unknown as { editable: boolean }).editable = hasSave;
        } else {
          vizEl.error = "Form input requires page dataScope";
        }
      }

      // Schema form — implicit lookup from dataScope (only if no explicit lookup)
      if (component.type === "schema-form" && options) {
        const pageDataScope = options.dataScopeRegistry.get(pagePath);
        if (pageDataScope && !lookup) {
          lookup = { dataSetId: pageDataScope.dataset, operations: [] };
        }
        const hasSave = pageDataScope
          ? options.saveConfigRegistry.has(pagePath)
          : false;
        (vizEl as unknown as { editable: boolean }).editable = hasSave;
      }

      const hasExplicitId = component.id !== undefined;

      const entry = {
        element: el,
        vizElement: vizEl,
        component,
        pagePath,
        hasExplicitId,
        ...(lookup !== undefined && { originalLookup: lookup }),
      };
      registry.set(componentId, entry);

      if ((isFormInput || component.type === "schema-form") && lookup) {
        vizEl.props = { ...component.props, lookup };
      } else if (component.props) {
        vizEl.props = component.props;
      }
      el.appendChild(vizEl);

      if (component.type === "data-table") {
        const selection = (component.props as Record<string, unknown> | undefined)?.selection as string | undefined;
        if (selection) {
          (vizEl as unknown as Record<string, unknown>).selection = selection;
        }
        const selectionKey = (component.props as Record<string, unknown> | undefined)?.selectionKey as string | undefined;
        if (selectionKey) {
          (vizEl as unknown as Record<string, unknown>).getRowKey = (row: TypedRow) => row.text(selectionKey as ColumnId);
        }
        const hiddenColumns = (component.props as Record<string, unknown> | undefined)?.hiddenColumns as readonly string[] | undefined;
        if (hiddenColumns) {
          (vizEl as unknown as Record<string, unknown>).hiddenColumns = hiddenColumns;
        }
      }

      // Handle inline dataSet on displayer (legacy DashBuilder shorthand)
      const inlineData = (component.props as Record<string, unknown> | undefined)?.inlineDataSet;
      if (inlineData !== undefined && lookup === undefined) {
        resolveInlineDataSet(vizEl, inlineData);
      }

      // Register visibleWhen consumer
      if (component.visibleWhen && contextManager) {
        registerVisibleWhenConsumer(el, vizEl, component.visibleWhen, contextManager);
      }

      return;
    }

    if (component.type === "title" && component.props) {
      const textProp = typeof component.props.text === "string" ? component.props.text : "";
      if (contextManager && hasTemplateVars(textProp)) {
        const resolvedText = resolveTemplate(textProp, contextManager.getContext(), "none");
        renderTitle(el, { ...component.props, text: resolvedText });
        registerContentConsumer(el, textProp, "none", contextManager, (resolved) => {
          el.innerHTML = "";
          renderTitle(el, { ...component.props, text: resolved });
        }, component.visibleWhen);
      } else {
        renderTitle(el, component.props);
        if (component.visibleWhen && contextManager) {
          registerVisibleWhenConsumer(el, null, component.visibleWhen, contextManager);
        }
      }
      return;
    }

    if (component.type === "html" && component.props) {
      const contentProp = typeof component.props.content === "string" ? component.props.content : "";
      if (contextManager && hasTemplateVars(contentProp)) {
        const resolvedContent = resolveTemplate(contentProp, contextManager.getContext(), "html");
        renderHtml(el, { ...component.props, content: resolvedContent });
        registerContentConsumer(el, contentProp, "html", contextManager, (resolved) => {
          el.innerHTML = "";
          renderHtml(el, { ...component.props, content: resolved });
        }, component.visibleWhen);
      } else {
        renderHtml(el, component.props);
        if (component.visibleWhen && contextManager) {
          registerVisibleWhenConsumer(el, null, component.visibleWhen, contextManager);
        }
      }
      return;
    }

    if (component.type === "markdown" && component.props) {
      const contentProp = typeof component.props.content === "string" ? component.props.content : "";
      if (contextManager && hasTemplateVars(contentProp)) {
        const resolvedContent = resolveTemplate(contentProp, contextManager.getContext(), "markdown");
        renderMarkdown(el, { ...component.props, content: resolvedContent });
        registerContentConsumer(el, contentProp, "markdown", contextManager, (resolved) => {
          el.innerHTML = "";
          renderMarkdown(el, { ...component.props, content: resolved });
        }, component.visibleWhen);
      } else {
        renderMarkdown(el, component.props);
        if (component.visibleWhen && contextManager) {
          registerVisibleWhenConsumer(el, null, component.visibleWhen, contextManager);
        }
      }
      return;
    }

    if (component.type === "action-button" && component.props) {
      const actionButton = document.createElement("pages-action-button");
      (actionButton as unknown as PagesContentElement<Record<string, unknown>>).props = component.props;
      el.appendChild(actionButton);

      if (component.visibleWhen && contextManager) {
        registerVisibleWhenConsumer(el, null, component.visibleWhen, contextManager);
      }
      return;
    }

    if (component.type === "form-scope" && component.props) {
      const scopeProps = component.props as Record<string, unknown>;
      (el as any).__formScopeSchema = scopeProps.schema;
      (el as any).__formScopeValidateOnBlur = scopeProps.validateOnBlur ?? false;
      (el as any).__formScopeMode = scopeProps.mode ?? "edit";
      (el as any).__formScopeForceCreate = scopeProps.forceCreate ?? false;

      if (options) {
        const pageDataScope = options.dataScopeRegistry.get(pagePath);
        if (pageDataScope) {
          const hasSave = options.saveConfigRegistry.has(pagePath);
          el.addEventListener("pages-field-change", ((e: CustomEvent) => {
            if (!hasSave) return;
            const { field, value, committed } = e.detail as { field: string; value: unknown; committed: boolean };
            if (committed) {
              el.dispatchEvent(new CustomEvent("pages-form-commit", {
                bubbles: true, composed: true,
                detail: { field, value },
              }));
            }
          }) as EventListener);
        }
      }
      return;
    }

    if (component.type === "alert" && component.props) {
      const contentProp = typeof component.props.content === "string" ? component.props.content : "";
      if (contextManager && hasTemplateVars(contentProp)) {
        const resolvedContent = resolveTemplate(contentProp, contextManager.getContext(), "none");
        const alert = document.createElement("pages-alert");
        (alert as unknown as PagesContentElement<Record<string, unknown>>).props = { ...component.props, content: resolvedContent };
        el.appendChild(alert);
        registerContentConsumer(el, contentProp, "none", contextManager, (resolved) => {
          el.innerHTML = "";
          const updatedAlert = document.createElement("pages-alert");
          (updatedAlert as unknown as PagesContentElement<Record<string, unknown>>).props = { ...component.props, content: resolved };
          el.appendChild(updatedAlert);
        }, component.visibleWhen);
      } else {
        const alert = document.createElement("pages-alert");
        (alert as unknown as PagesContentElement<Record<string, unknown>>).props = component.props;
        el.appendChild(alert);
        if (component.visibleWhen && contextManager) {
          registerVisibleWhenConsumer(el, null, component.visibleWhen, contextManager);
        }
      }
      return;
    }

    if (component.type === "legend" && component.props) {
      const legendEl = document.createElement("pages-legend");
      (legendEl as unknown as PagesContentElement<Record<string, unknown>>).props = component.props;
      el.appendChild(legendEl);
      if (component.visibleWhen && contextManager) {
        registerVisibleWhenConsumer(el, null, component.visibleWhen, contextManager);
      }
      return;
    }

    if (component.type === "host-panel" && component.props) {
      const { typeName, panelProps, lookup } = component.props as unknown as HostPanelProps;
      if (!typeName) return;

      const tagName = lookupPanel(typeName);
      if (!tagName) {
        el.textContent = `Unknown panel type: ${typeName}`;
        console.warn(`hostPanel: unregistered type "${typeName}"`);
        return;
      }

      const panel = document.createElement(tagName);
      const configurable = panel as unknown as ConfigurablePanel;
      const hasTemplates = panelProps && contextManager && propsHaveTemplateVars(panelProps);

      if (hasTemplates) {
        const templateEntries = extractTemplateStrings(panelProps, "");
        let dataRequestDispatched = false;

        const templates = new Map(
          templateEntries.map(({ key, template }) => [
            key,
            {
              template,
              escapeMode: "none" as EscapeMode,
              lastResolved: "",
              apply: (_resolved: string) => { /* change detection only */ },
            },
          ]),
        );

        const consumer: ContextConsumer = {
          element: el,
          templates,
          suspended: false,
          postEvaluate: (changed: boolean) => {
            if (!changed) return;

            const allResolved = templateEntries.every(({ template }) =>
              allTemplateVarsResolved(template, contextManager.getContext()),
            );
            if (!allResolved) return;

            const resolvedProps = resolvePropsTemplates(panelProps, contextManager.getContext());
            if (typeof configurable.configure === "function") {
              configurable.configure(resolvedProps);
            }

            if (lookup && !dataRequestDispatched) {
              dataRequestDispatched = true;
              dispatchHostPanelDataRequest(panel, el, lookup, registry, componentId, component, pagePath);
            }
          },
        };

        contextManager.registerConsumer(consumer);

        if (!lookup) {
          registry.set(componentId, {
            element: el,
            component,
            pagePath,
            hasExplicitId: component.id !== undefined,
          });
        }
      } else {
        if (typeof configurable.configure === "function") {
          configurable.configure(panelProps ?? {});
        }

        if (lookup) {
          el.appendChild(panel);
          dispatchHostPanelDataRequest(panel, el, lookup, registry, componentId, component, pagePath);
          return;
        } else {
          registry.set(componentId, {
            element: el,
            component,
            pagePath,
            hasExplicitId: component.id !== undefined,
          });
        }
      }

      el.appendChild(panel);
      return;
    }

    if (component.type === "dock-workbench" && component.props) {
      const config = (component.props as Record<string, unknown>).__dockConfig as DockWorkbenchConfig;
      const dwZoneEngine = createZoneLayoutEngine(config, options?.seedLayout?.zones);
      if (options?.zoneEngineRef) {
        options.zoneEngineRef.current = dwZoneEngine;
      }

      const panelMap = new Map<string, DockPanelConfig>();
      function extractPanels(side: readonly DockPanelConfig[] | DockSideConfig | undefined): DockItem[] | undefined {
        if (!side) return undefined;
        const panels: readonly DockPanelConfig[] = Array.isArray(side) ? side : (side as DockSideConfig).panels;
        return panels.map(p => {
          panelMap.set(p.key, p);
          const base: { icon: string; label: string; panelId: string; defaultOpen?: boolean; zone?: "top" | "bottom" | "left" | "right"; allowedZones?: readonly DockZone[]; fixed?: boolean } = { icon: p.icon, label: p.label, panelId: p.key };
          if (p.defaultOpen !== undefined) base.defaultOpen = p.defaultOpen;
          if (p.zone !== undefined) base.zone = p.zone;
          if (p.allowedZones !== undefined) base.allowedZones = p.allowedZones;
          if (p.fixed !== undefined) base.fixed = p.fixed;
          return base as DockItem;
        });
      }

      const dockEl = document.createElement("pages-dock-workbench") as PagesDockWorkbench;
      const leftItems = extractPanels(config.left);
      const rightItems = extractPanels(config.right);
      const bottomItems = extractPanels(config.bottom);
      if (leftItems) dockEl.leftPanels = leftItems;
      if (rightItems) dockEl.rightPanels = rightItems;
      if (bottomItems) dockEl.bottomPanels = bottomItems;
      if (options?.layoutStore) dockEl.layoutStore = options.layoutStore;
      if (options?.layoutKey) dockEl.persistKey = options.layoutKey;
      dockEl.zoneMap = dwZoneEngine.zoneMap;
      dockEl.renderContent = (container: HTMLElement, panelId: string) => {
        const panel = panelMap.get(panelId);
        if (panel) {
          renderComponent(container, panel.content, {
            permissions: options?.permissions ?? ALLOW_ALL,
            onNode: callback,
          });
        }
      };
      dockEl.renderCentre = (container: HTMLElement) => {
        const centreComponents = Array.isArray(config.centre) ? config.centre : [config.centre];
        const centreRoot = centreComponents.length === 1
          ? centreComponents[0]!
          : { type: "rows" as const, slots: { default: [...centreComponents] } };
        renderComponent(container, centreRoot, {
          permissions: options?.permissions ?? ALLOW_ALL,
          onNode: callback,
        });
      };

      if (options?.siteTarget) {
        options.siteTarget.style.overflow = "hidden";
        options.siteTarget.style.padding = "0";
        options.siteTarget.style.background = "var(--pages-neutral-3)";
        options.siteTarget.style.color = "var(--pages-neutral-12)";
      }

      el.style.flex = "1";
      el.style.minHeight = "0";
      el.style.height = "100%";
      el.style.display = "flex";
      el.style.flexDirection = "column";

      let dwAncestor: HTMLElement | null = el.parentElement;
      while (dwAncestor) {
        if (dwAncestor.dataset?.componentType === "page") {
          dwAncestor.style.padding = "0";
        }
        dwAncestor = dwAncestor.parentElement;
      }

      el.appendChild(dockEl);

      const dockSiteTarget = options?.siteTarget ?? el;

      function rebuildPanelLists(): { left: DockItem[]; right: DockItem[]; bottom: DockItem[] } {
        const left: DockItem[] = [];
        const right: DockItem[] = [];
        const bottom: DockItem[] = [];
        for (const [key, zone] of dwZoneEngine.zoneMap) {
          const p = panelMap.get(key);
          if (!p) continue;
          const rec: Record<string, unknown> = { icon: p.icon, label: p.label, panelId: p.key };
          if (p.defaultOpen !== undefined) rec.defaultOpen = p.defaultOpen;
          if (p.fixed !== undefined) rec.fixed = p.fixed;
          if (zone.endsWith("-bottom") && !zone.startsWith("bottom")) rec.zone = "bottom";
          else if (zone.endsWith("-top") && !zone.startsWith("top")) rec.zone = "top";
          const base = rec as unknown as DockItem;
          if (zone.startsWith("left")) left.push(base);
          else if (zone.startsWith("right")) right.push(base);
          else if (zone.startsWith("bottom")) bottom.push(base);
        }
        return { left, right, bottom };
      }

      let dragAbort: AbortController | undefined;
      function wireDragHandlers(): void {
        if (dragAbort) dragAbort.abort();
        dragAbort = new AbortController();
        const signal = dragAbort.signal;
        void dockEl.updateComplete.then(() => {
          if (signal.aborted) return;
          const buttons = dockEl.querySelectorAll<HTMLElement>("button[data-dock-panel-id]");
          for (const btn of buttons) {
            attachDockDrag(btn, dwZoneEngine, dockSiteTarget, signal);
          }
        });
      }

      dockSiteTarget.addEventListener("pages-dock-rearrange", ((e: Event) => {
        e.stopImmediatePropagation();
        const { panelKey, toZone, insertIndex } = (e as CustomEvent<{ panelKey: string; toZone: string; insertIndex?: number }>).detail;
        dwZoneEngine.movePanel(panelKey, toZone as DockZone, insertIndex);
        for (const key of panelMap.keys()) {
          dockEl.resetPanelContent(key);
        }
        const lists = rebuildPanelLists();
        dockEl.leftPanels = lists.left;
        dockEl.rightPanels = lists.right;
        dockEl.bottomPanels = lists.bottom;
        dockEl.zoneMap = dwZoneEngine.zoneMap;
        void dockEl.updateComplete.then(() => {
          dockEl.showPanel(panelKey);
          for (const [key] of panelMap) {
            if (dockEl.dockState[key]) {
              const container = dockEl.querySelector<HTMLElement>(`[data-component-id="${key}"]`);
              if (container && container.children.length === 0 && dockEl.renderContent) {
                dockEl.renderContent(container, key);
              }
            }
          }
          wireDragHandlers();
        });
      }) as EventListener, true);

      wireDragHandlers();

      return;
    }

    if (component.type === "deferred") {
      const children = component.slots?.default ?? [];
      el.dataset.deferred = "pending";
      if (component.style?.flex) {
        el.dataset.pagesDisplay = "flex";
        el.style.flexDirection = "column";
      }
      const isDockPanel = !!component.style?.flex;
      el.addEventListener("pages-deferred-render", () => {
        for (const child of children) {
          renderComponent(el, child, {
            permissions: options?.permissions ?? ALLOW_ALL,
            onNode: callback,
          });
        }
        delete el.dataset.deferred;
        if (isDockPanel) {
          for (const ch of el.querySelectorAll<HTMLElement>(":scope > *")) {
            ch.style.flex = "1";
            ch.style.minHeight = "0";
          }
        }
      }, { once: true });
      return;
    }

    if (component.type === "lazy-page" && component.props && options) {
      const props = component.props as { name?: string; href?: string };
      if (!props.href) return;

      const { fetchFn, baseUrl, abortSignal, permissions, pageIndex, dataSetScope, lazyPageResolutions } = options;

      // Path A: re-activation — resolved root available, re-render synchronously
      const resolved = lazyPageResolutions.get(component);
      if (resolved) {
        renderComponent(el, resolved, { permissions, onNode: callback });
        return;
      }

      const url = baseUrl ? new URL(props.href, baseUrl).href : props.href;
      const cached = yamlCache.get(url);

      if (cached) {
        // Path B: YAML cache hit — synchronous
        const parsed = parsePage(yamlLoad(cached));
        integrateAndRender(el, component, parsed, pagePath, pagePathMap, pageIndex, dataSetScope, lazyPageResolutions, permissions, callback);
      } else {
        // Path C: cache miss — async
        fetchFn(url, { signal: abortSignal })
          .then((response) => response.text())
          .then((text) => {
            yamlCache.set(url, text);
            const parsed = parsePage(yamlLoad(text));
            integrateAndRender(el, component, parsed, pagePath, pagePathMap, pageIndex, dataSetScope, lazyPageResolutions, permissions, callback);
          })
          .catch((err: unknown) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            el.textContent = `Failed to load lazy page: ${err instanceof Error ? err.message : String(err)}`;
          });
      }
      return;
    }

    if (component.type === "floating-workspace") {
      const props = component.props as unknown as FloatingWorkspaceProps;
      const centreComponents = Array.isArray(props.centre) ? props.centre : [props.centre];

      el.style.position = "relative";
      el.style.flex = "1";
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.minHeight = "0";
      const wsParent = el.parentElement;
      if (wsParent && getComputedStyle(wsParent).display === "grid") {
        wsParent.style.display = "flex";
        wsParent.style.flexDirection = "column";
      }
      let wsAncestor: HTMLElement | null = el.parentElement;
      while (wsAncestor) {
        if ((wsAncestor).dataset?.componentType === "page") {
          wsAncestor.style.padding = "0";
        }
        wsAncestor = wsAncestor.parentElement;
      }

      const wsRef = options?.floatingWorkspaceRef;
      const depth = options?.nestingDepth ?? 0;
      if (depth > 1) {
        throw new Error("Floating workspace nesting is limited to one level");
      }

      const centreRoot: Component = centreComponents.length === 1
        ? centreComponents[0]!
        : { type: "rows", slots: { default: [...centreComponents] } };

      function renderCentreInto(parent: HTMLElement): void {
        const centreContainer = document.createElement("div");
        centreContainer.style.cssText = "position:relative;width:100%;flex:1;min-height:0;overflow:auto;background:var(--pages-neutral-1);border-radius:var(--pages-radius-sm, 4px);";
        centreContainer.dataset.floatingWorkspaceCentre = "";
        parent.appendChild(centreContainer);
        renderComponent(centreContainer, centreRoot, {
          permissions: options?.permissions ?? ALLOW_ALL,
          onNode: callback,
        });
      }

      renderCentreInto(el);

      {
        const tabCallbacks = new Map<string, (el: HTMLElement, component: Component) => void>();

        function renderTabContent(tab: import("@casehubio/pages-component").FrameTabConfig): { element: HTMLElement } {
          const container = document.createElement("div");
          container.style.cssText = "position:relative;width:100%;height:100%;";

          let tabCallback = tabCallbacks.get(tab.key);
          if (!tabCallback && depth < 1) {
            tabCallback = createActivationCallback(registry, pagePathMap, {
              ...(options ?? {}),
              nestingDepth: depth + 1,
            } as LazyPageOptions, contextManager);
            tabCallbacks.set(tab.key, tabCallback);
          }

          if (tab.content) {
            renderComponent(container, tab.content, {
              permissions: options?.permissions ?? ALLOW_ALL,
              onNode: tabCallback ?? callback,
            });
          }

          return { element: container };
        }

        const contentFactory: ContentFactory = (tab) => renderTabContent(tab);

        const overlayContainer = document.createElement("div");
        overlayContainer.style.cssText = "position:absolute;inset:0;pointer-events:none;";
        overlayContainer.dataset.floatingWorkspaceOverlay = "";
        el.appendChild(overlayContainer);

        const savedLayout = wsRef?.stash ?? (props.frames ? configToContainerState(props.frames) : undefined);
        const handle = wireFloatingWorkspace(overlayContainer, savedLayout, {
          detachEnabled: true,
          contentFactory,
          signal: options?.abortSignal,
          existingContainer: wsRef?.rootContainer,
        });

        const showOrganisers = depth > 0 ? props.organisers === true : props.organisers !== false;
        if (showOrganisers && handle.containerToolbar) {
          el.insertBefore(handle.containerToolbar.element, overlayContainer);
        }

        if (options?.abortSignal) {
          createFrameKeyboardHandler(handle.rootContainer, overlayContainer, options.abortSignal);
        }

        if (wsRef) {
          (wsRef as { rootContainer: Container | undefined }).rootContainer = handle.rootContainer;
        }
      }
      return;
    }

    if (component.type === "frame-sandbox") {
      const sandboxProps = component.props as Record<string, unknown> | undefined;
      const sandboxEntries = (sandboxProps?.entries as Array<{
        key: string; label: string; content?: Component;
        position?: { x: number; y: number }; size?: { width: number; height: number };
      }>) ?? [];
      const ORGANISER_ALIASES: Record<string, string> = { "free-layout": "free", "tab": "tabbed" };
      const resolveOrganiser = (name: string): string => ORGANISER_ALIASES[name] ?? name;
      const organiserType = resolveOrganiser((sandboxProps?.organiser as string) ?? "tabbed");
      const policyProp = sandboxProps?.policy as {
        allowedOrganisers?: string[]; maxDepth?: number;
      } | undefined;

      const entries = sandboxEntries.map((e) => ({ key: e.key, label: e.label }));

      const contentFactoryForSandbox = (entry: { key: string; label: string }) => {
        const spec = sandboxEntries.find((s) => s.key === entry.key);
        if (!spec?.content) {
          const placeholder = document.createElement("div");
          placeholder.textContent = `No content for ${entry.key}`;
          return { element: placeholder };
        }
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "width:100%;height:100%;";
        renderComponent(wrapper, spec.content, {
          permissions: options?.permissions ?? ALLOW_ALL,
          onNode: callback,
        });
        return {
          element: wrapper,
          dispose: () => { wrapper.innerHTML = ""; },
        };
      };

      const freeLayoutEntries: Record<string, { position: { x: number; y: number }; size: { width: number; height: number } }> = {};
      for (const se of sandboxEntries) {
        if (se.position || se.size) {
          freeLayoutEntries[se.key] = {
            position: se.position ?? { x: 50, y: 50 },
            size: se.size ?? { width: 300, height: 200 },
          };
        }
      }
      const hasFreeState = Object.keys(freeLayoutEntries).length > 0;

      const groupConfig: Parameters<typeof createContainer>[0] = {
        entries,
        layout: organiserType as "tabbed" | "accordion" | "free",
        contentFactory: contentFactoryForSandbox,
        ...(hasFreeState ? { freeLayoutState: { entries: freeLayoutEntries, zOrder: sandboxEntries.map((e) => e.key) } } : {}),
      };
      if (policyProp) {
        groupConfig.policy = {
          allowedLayouts: (policyProp.allowedOrganisers ?? ["tabbed", "accordion", "free"]).map(resolveOrganiser) as Array<"tabbed" | "accordion" | "free">,
          maxDepth: policyProp.maxDepth ?? 3,
        };
      }
      const group = createContainer(groupConfig);

      el.style.cssText = "position:relative;width:100%;flex:1;min-height:400px;";
      const parentEl = el.parentElement;
      if (parentEl && getComputedStyle(parentEl).display === "grid") {
        parentEl.style.display = "flex";
        parentEl.style.flexDirection = "column";
      }
      let ancestor: HTMLElement | null = el.parentElement;
      while (ancestor) {
        if ((ancestor).dataset?.componentType === "page") {
          ancestor.style.padding = "0";
        }
        ancestor = ancestor.parentElement;
      }
      group.mount(el);
      el.dataset.frameSandbox = "mounted";
      return;
    }

    // Layout, page, unknown: no activation needed
  };

  return callback;
}

function integrateAndRender(
  el: HTMLElement,
  lazyPageComponent: Component,
  dashboardRoot: Component,
  basePath: string,
  pagePathMap: PagePathMap,
  pageIndex: PageIndex,
  dataSetScope: DataSetScope,
  lazyPageResolutions: Map<Component, Component>,
  permissions: PermissionContext,
  onNode: (el: HTMLElement, component: Component) => void,
): void {
  // Extract the first page from the dashboard's content slot
  const pages = dashboardRoot.slots?.["content"];
  if (!pages || pages.length === 0) {
    el.textContent = "Lazy page YAML must contain at least one page";
    return;
  }
  const pageComponent = pages[0];
  if (!pageComponent) {
    el.textContent = "Lazy page YAML must contain at least one page";
    return;
  }

  extendPagePathMap(pageComponent, basePath, pagePathMap);
  const inheritedScope = dataSetScope.get(basePath) ?? new Map<DataSetId, DataSetEntry>();
  extendDataSetScope(pageComponent, inheritedScope, pagePathMap, dataSetScope);
  extendPageIndex(pageComponent, pagePathMap, pageIndex);
  lazyPageResolutions.set(lazyPageComponent, pageComponent);
  renderComponent(el, pageComponent, { permissions, onNode });
}

function resolveInlineDataSet(
  vizEl: PagesElement<VizComponentProps>,
  inlineData: unknown,
): void {
  try {
    let raw: unknown;
    if (typeof inlineData === "string") {
      let cleaned = inlineData.replace(/,\s*([\]}])/g, "$1");
      cleaned = cleaned.replace(/'/g, '"');
      raw = JSON.parse(cleaned);
    } else {
      raw = inlineData;
    }

    if (!Array.isArray(raw)) return;

    // Flat array → single row (Shape D)
    const isFlat = raw.every((v: unknown) => typeof v !== "object" || v === null);
    const rows: unknown[][] = isFlat ? [raw] : (raw as unknown[][]);

    const maxCols = rows.reduce((max: number, row: unknown[]) => Math.max(max, row.length), 0);
    const columns = Array.from({ length: maxCols }, (_: unknown, i: number) => ({
      id: `Column ${String(i)}` as ColumnId,
      name: `Column ${String(i)}`,
      type: typeof rows[0]?.[i] === "number" ? ColumnType.NUMBER : ColumnType.LABEL,
    }));

    const data = rows.map((row: unknown[]) =>
      Array.from({ length: maxCols }, (_: unknown, i: number) => {
        const cell = row[i];
        if (cell === undefined || cell === null) return null;
        if (typeof cell === "string") return cell;
        if (typeof cell === "number" || typeof cell === "boolean") return String(cell);
        return JSON.stringify(cell);
      }),
    );

    const dataset = toTypedDataSet({ columns, data });
    vizEl.dataSet = dataset;
  } catch {
    vizEl.error = "Failed to parse inline dataSet";
  }
}

function registerContentConsumer(
  el: HTMLElement,
  template: string,
  escapeMode: EscapeMode,
  contextManager: ContextManager,
  applyFn: (resolved: string) => void,
  visibleWhenExpr?: string,
): void {
  const initialResolved = resolveTemplate(template, contextManager.getContext(), escapeMode);

  const consumer: import("./context-wiring.js").ContextConsumer = {
    element: el,
    templates: new Map([
      [
        "content",
        {
          template,
          escapeMode,
          lastResolved: initialResolved,
          apply: applyFn,
        },
      ],
    ]),
    suspended: false,
  };

  if (visibleWhenExpr) {
    const initialResult = evaluateExpression(visibleWhenExpr, contextManager.getContext());
    consumer.suspended = !initialResult;
    consumer.visibleWhen = {
      expression: visibleWhenExpr,
      lastResult: initialResult,
      onSuspend: () => { el.hidden = true; },
      onResume: () => { el.hidden = false; },
    };
    el.hidden = !initialResult;
  }

  contextManager.registerConsumer(consumer);
}

function registerVisibleWhenConsumer(
  el: HTMLElement,
  vizEl: PagesElement<VizComponentProps> | null,
  expression: string,
  contextManager: ContextManager,
): void {
  // Evaluate initial state
  const initialResult = evaluateExpression(expression, contextManager.getContext());

  const consumer = {
    element: el,
    templates: new Map(),
    suspended: !initialResult,
    visibleWhen: {
      expression,
      lastResult: initialResult,
      onSuspend: () => {
        el.hidden = true;
        // Note: refresh timer lifecycle is managed internally by PagesElement
        // based on the hidden state and isConnected status
      },
      onResume: () => {
        el.hidden = false;
        // Note: refresh timer lifecycle is managed internally by PagesElement
        // based on the hidden state and isConnected status
      },
    },
  };

  contextManager.registerConsumer(consumer);

  // Set initial hidden state
  el.hidden = !initialResult;
}

function propsHaveTemplateVars(props: Record<string, unknown>): boolean {
  for (const value of Object.values(props)) {
    if (typeof value === "string" && hasTemplateVars(value)) return true;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && hasTemplateVars(item)) return true;
        if (item !== null && typeof item === "object" &&
            propsHaveTemplateVars(item as Record<string, unknown>)) return true;
      }
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value) &&
        propsHaveTemplateVars(value as Record<string, unknown>)) return true;
  }
  return false;
}

function extractTemplateStrings(
  props: Record<string, unknown>,
  prefix: string,
): Array<{ key: string; template: string }> {
  const result: Array<{ key: string; template: string }> = [];
  for (const [k, value] of Object.entries(props)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof value === "string" && hasTemplateVars(value)) {
      result.push({ key: path, template: value });
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item === "string" && hasTemplateVars(item)) {
          result.push({ key: `${path}[${i}]`, template: item });
        } else if (item !== null && typeof item === "object") {
          result.push(
            ...extractTemplateStrings(item as Record<string, unknown>, `${path}[${i}]`),
          );
        }
      }
    } else if (value !== null && typeof value === "object") {
      result.push(
        ...extractTemplateStrings(value as Record<string, unknown>, path),
      );
    }
  }
  return result;
}

function resolvePropsTemplates(
  props: Record<string, unknown>,
  context: RuntimeContext,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string") {
      resolved[key] = resolveTemplate(value, context, "none");
    } else if (Array.isArray(value)) {
      resolved[key] = value.map((item): unknown =>
        typeof item === "string"
          ? resolveTemplate(item, context, "none")
          : item !== null && typeof item === "object"
            ? resolvePropsTemplates(item as Record<string, unknown>, context)
            : item
      );
    } else if (value !== null && typeof value === "object") {
      resolved[key] = resolvePropsTemplates(value as Record<string, unknown>, context);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function dispatchHostPanelDataRequest(
  panel: HTMLElement,
  el: HTMLElement,
  lookup: DataSetLookup,
  registry: ComponentRegistry,
  componentId: string,
  component: Component,
  pagePath: string,
): void {
  const panelAsReceiver = panel as unknown as Partial<DataReceiver>;
  if (!("dataSet" in panel)) {
    console.warn(`hostPanel "${panel.tagName.toLowerCase()}": lookup specified but panel lacks DataReceiver properties`);
    registry.set(componentId, {
      element: el,
      component,
      pagePath,
      hasExplicitId: component.id !== undefined,
    });
    return;
  }
  const proxy = createHostPanelProxy(panelAsReceiver as DataReceiver);
  registry.set(componentId, {
    element: el,
    vizElement: proxy,
    component,
    pagePath,
    originalLookup: lookup,
    hasExplicitId: component.id !== undefined,
  });
  panel.dispatchEvent(new CustomEvent("pages-data-request", {
    bubbles: true,
    composed: true,
    detail: { element: proxy, lookup },
  }));
}



