import {createActivationCallback} from "./activation.js";
import {clearPanelRegistry, registerPanel} from "./panel-registry.js";
import type {Component} from "@casehubio/pages-component";
import {ContextManager} from "./context-wiring.js";

describe("host-panel activation", () => {
  afterEach(() => { clearPanelRegistry(); });

  function activate(component: Component): HTMLElement {
    const el = document.createElement("div");
    el.dataset.componentId = "test-panel";
    el.dataset.componentType = "host-panel";
    const registry = new Map();
    const pagePathMap = new Map();
    const callback = createActivationCallback(registry, pagePathMap);
    callback(el, component);
    return el;
  }

  it("mounts registered Web Component into container", () => {
    customElements.define("test-wc-1", class extends HTMLElement {});
    registerPanel("test-type", "test-wc-1");
    const el = activate({ type: "host-panel", props: { typeName: "test-type" } });
    expect(el.querySelector("test-wc-1")).toBeTruthy();
  });

  it("calls configure(props) before appendChild", () => {
    const configureOrder: string[] = [];
    customElements.define("test-cfg-2", class extends HTMLElement {
      configure(_props: Record<string, unknown>) {
        configureOrder.push("configure");
      }
      connectedCallback() {
        configureOrder.push("connected");
      }
    });
    registerPanel("cfg-type", "test-cfg-2");
    const el = activate({
      type: "host-panel",
      props: { typeName: "cfg-type", panelProps: { doc: "abc" } },
    });
    document.body.appendChild(el);
    expect(configureOrder).toEqual(["configure", "connected"]);
    document.body.removeChild(el);
  });

  it("renders error placeholder for unregistered type", () => {
    const el = activate({ type: "host-panel", props: { typeName: "missing" } });
    expect(el.textContent).toContain("Unknown panel type");
    expect(el.querySelector("*[data-component-type]")).toBeNull();
  });

  it("uses ConfigurablePanel interface for configure() call", () => {
    const configured: Record<string, unknown>[] = [];
    customElements.define("test-cfg-iface", class extends HTMLElement {
      configure(props: Record<string, unknown>) {
        configured.push(props);
      }
    });
    registerPanel("cfg-iface", "test-cfg-iface");
    activate({
      type: "host-panel",
      props: { typeName: "cfg-iface", panelProps: { endpoint: "/api" } },
    });
    expect(configured).toEqual([{ endpoint: "/api" }]);
  });

  it("dispatches pages-data-request when lookup is present", () => {
    const received: Array<{ element: unknown; lookup: unknown }> = [];
    customElements.define("test-data-panel", class extends HTMLElement {
      private _data: unknown;
      private _error = "";
      get dataSet() { return this._data; }
      set dataSet(v: unknown) { this._data = v; this._error = ""; }
      get error() { return this._error; }
      set error(v: string) { this._error = v; this._data = undefined; }
      configure(props: Record<string, unknown>) { void props; }
    });
    registerPanel("data-panel", "test-data-panel");

    const container = document.createElement("div");
    container.addEventListener("pages-data-request", ((e: Event) => {
      const detail = (e as CustomEvent).detail;
      received.push({ element: detail.element, lookup: detail.lookup });
    }));
    document.body.appendChild(container);

    const el = document.createElement("div");
    el.dataset.componentId = "data-test";
    el.dataset.componentType = "host-panel";
    container.appendChild(el);

    const registry = new Map();
    const pagePathMap = new Map();
    const callback = createActivationCallback(registry, pagePathMap);
    callback(el, {
      type: "host-panel",
      props: {
        typeName: "data-panel",
        lookup: { dataSetId: "items", operations: [] },
        panelProps: { mode: "list" },
      },
    });

    expect(received).toHaveLength(1);
    expect(received[0]!.lookup).toEqual({ dataSetId: "items", operations: [] });
    expect(registry.get("data-test")?.vizElement).toBeDefined();
    expect(registry.get("data-test")?.originalLookup).toEqual({ dataSetId: "items", operations: [] });

    document.body.removeChild(container);
  });

  it("warns and skips data binding when panel lacks DataReceiver properties", () => {
    const warns: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => { warns.push(String(args[0])); };

    customElements.define("test-no-data", class extends HTMLElement {
      configure(props: Record<string, unknown>) { void props; }
    });
    registerPanel("no-data", "test-no-data");
    const el = activate({
      type: "host-panel",
      props: {
        typeName: "no-data",
        lookup: { dataSetId: "items", operations: [] },
        panelProps: {},
      },
    });
    expect(warns.some(w => w.includes("lacks DataReceiver"))).toBe(true);

    // verify panel IS appended to DOM
    expect(el.querySelector("test-no-data")).toBeTruthy();

    // verify registry entry has no data binding
    const registry = new Map();
    const pagePathMap = new Map();
    const callback = createActivationCallback(registry, pagePathMap);
    const testEl = document.createElement("div");
    testEl.dataset.componentId = "verify-test";
    callback(testEl, {
      type: "host-panel",
      props: {
        typeName: "no-data",
        lookup: { dataSetId: "items", operations: [] },
        panelProps: {},
      },
    });
    const entry = registry.get("verify-test");
    expect(entry?.vizElement).toBeUndefined();

    console.warn = origWarn;
  });

  it("proxy forwards dataSet and error to panel", () => {
    customElements.define("test-proxy-fwd", class extends HTMLElement {
      private _data: unknown;
      private _error = "";
      get dataSet() { return this._data; }
      set dataSet(v: unknown) { this._data = v; this._error = ""; }
      get error() { return this._error; }
      set error(v: string) { this._error = v; this._data = undefined; }
      configure(props: Record<string, unknown>) { void props; }
    });
    registerPanel("proxy-fwd", "test-proxy-fwd");

    const el = document.createElement("div");
    el.dataset.componentId = "proxy-test";
    el.dataset.componentType = "host-panel";
    const registry = new Map();
    const pagePathMap = new Map();

    const container = document.createElement("div");
    container.appendChild(el);
    document.body.appendChild(container);

    const callback = createActivationCallback(registry, pagePathMap);
    callback(el, {
      type: "host-panel",
      props: {
        typeName: "proxy-fwd",
        lookup: { dataSetId: "test", operations: [] },
      },
    });

    const entry = registry.get("proxy-test");
    expect(entry?.vizElement).toBeDefined();

    entry!.vizElement!.dataSet = { columns: [], rows: [] };
    const panel = el.querySelector("test-proxy-fwd") as HTMLElement & { dataSet: unknown; error: string } | null;
    expect(panel!.dataSet).toEqual({ columns: [], rows: [] });

    entry!.vizElement!.error = "something broke";
    expect(panel!.error).toBe("something broke");
    expect(panel!.dataSet).toBeUndefined();

    document.body.removeChild(container);
  });

  describe("template resolution in panelProps", () => {
    let tagCounter = 0;

    function defineConfigurablePanel(): { tag: string; configured: Record<string, unknown>[] } {
      tagCounter++;
      const tag = `test-tpl-${tagCounter}`;
      const configured: Record<string, unknown>[] = [];
      customElements.define(tag, class extends HTMLElement {
        configure(props: Record<string, unknown>) {
          configured.push(structuredClone(props));
        }
      });
      return { tag, configured };
    }

    function activateWithContext(
      component: Component,
      contextManager: ContextManager,
    ): { el: HTMLElement; registry: Map<string, unknown> } {
      const el = document.createElement("div");
      el.dataset.componentId = `tpl-test-${tagCounter}`;
      el.dataset.componentType = "host-panel";
      document.body.appendChild(el);
      const registry = new Map();
      const pagePathMap = new Map();
      const callback = createActivationCallback(registry, pagePathMap, undefined, contextManager);
      callback(el, component);
      return { el, registry };
    }

    it("resolves template vars when context is available", () => {
      const { tag, configured } = defineConfigurablePanel();
      registerPanel("tpl-resolve", tag);

      const cm = new ContextManager();
      cm.updateParams({ caseId: "abc-123" });

      const { el } = activateWithContext({
        type: "host-panel",
        props: { typeName: "tpl-resolve", panelProps: { id: "#{params.caseId}" } },
      }, cm);

      expect(configured).toHaveLength(1);
      expect(configured[0]).toEqual({ id: "abc-123" });
      el.remove();
    });

    it("defers configure() when template vars are unresolved", () => {
      const { tag, configured } = defineConfigurablePanel();
      registerPanel("tpl-defer", tag);

      const cm = new ContextManager();

      const { el } = activateWithContext({
        type: "host-panel",
        props: { typeName: "tpl-defer", panelProps: { id: "#{params.caseId}" } },
      }, cm);

      expect(configured).toHaveLength(0);

      cm.updateParams({ caseId: "xyz-789" });

      expect(configured).toHaveLength(1);
      expect(configured[0]).toEqual({ id: "xyz-789" });
      el.remove();
    });

    it("re-calls configure() on context change", () => {
      const { tag, configured } = defineConfigurablePanel();
      registerPanel("tpl-reconfig", tag);

      const cm = new ContextManager();
      cm.updateParams({ caseId: "first" });

      const { el } = activateWithContext({
        type: "host-panel",
        props: { typeName: "tpl-reconfig", panelProps: { id: "#{params.caseId}" } },
      }, cm);

      expect(configured).toHaveLength(1);
      expect(configured[0]).toEqual({ id: "first" });

      cm.updateParams({ caseId: "second" });

      expect(configured).toHaveLength(2);
      expect(configured[1]).toEqual({ id: "second" });
      el.remove();
    });

    it("does not re-call configure() on unrelated context change", () => {
      const { tag, configured } = defineConfigurablePanel();
      registerPanel("tpl-unrelated", tag);

      const cm = new ContextManager();
      cm.updateParams({ caseId: "stable" });

      const { el } = activateWithContext({
        type: "host-panel",
        props: { typeName: "tpl-unrelated", panelProps: { id: "#{params.caseId}" } },
      }, cm);

      expect(configured).toHaveLength(1);

      cm.updateFilter({ ward: ["ICU"] as const });

      expect(configured).toHaveLength(1);
      el.remove();
    });

    it("resolves templates in nested objects", () => {
      const { tag, configured } = defineConfigurablePanel();
      registerPanel("tpl-nested", tag);

      const cm = new ContextManager();
      cm.updateParams({ baseUrl: "https://example.com" });

      const { el } = activateWithContext({
        type: "host-panel",
        props: {
          typeName: "tpl-nested",
          panelProps: { config: { url: "#{params.baseUrl}/api" } },
        },
      }, cm);

      expect(configured).toHaveLength(1);
      expect(configured[0]).toEqual({ config: { url: "https://example.com/api" } });
      el.remove();
    });

    it("resolves templates in array elements", () => {
      const { tag, configured } = defineConfigurablePanel();
      registerPanel("tpl-array", tag);

      const cm = new ContextManager();
      cm.updateParams({ url1: "https://a.com", url2: "https://b.com" });

      const { el } = activateWithContext({
        type: "host-panel",
        props: {
          typeName: "tpl-array",
          panelProps: { endpoints: ["#{params.url1}", "#{params.url2}"] },
        },
      }, cm);

      expect(configured).toHaveLength(1);
      expect(configured[0]).toEqual({ endpoints: ["https://a.com", "https://b.com"] });
      el.remove();
    });

    it("passes panelProps directly when no template vars present", () => {
      const { tag, configured } = defineConfigurablePanel();
      registerPanel("tpl-nontpl", tag);

      const cm = new ContextManager();

      const { el } = activateWithContext({
        type: "host-panel",
        props: { typeName: "tpl-nontpl", panelProps: { endpoint: "/api", mode: "live" } },
      }, cm);

      expect(configured).toHaveLength(1);
      expect(configured[0]).toEqual({ endpoint: "/api", mode: "live" });
      el.remove();
    });

    it("preserves non-string values in mixed props", () => {
      const { tag, configured } = defineConfigurablePanel();
      registerPanel("tpl-mixed", tag);

      const cm = new ContextManager();
      cm.updateParams({ name: "test" });

      const { el } = activateWithContext({
        type: "host-panel",
        props: {
          typeName: "tpl-mixed",
          panelProps: { label: "#{params.name}", count: 42, active: true, nothing: null },
        },
      }, cm);

      expect(configured).toHaveLength(1);
      expect(configured[0]).toEqual({ label: "test", count: 42, active: true, nothing: null });
      el.remove();
    });
  });
});
