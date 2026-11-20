import { describe, it, expect } from "vitest";
import type { Component } from "@casehubio/pages-component";
import { dataSetId } from "@casehubio/pages-data";
import type { ExternalDataSetDef } from "@casehubio/pages-data";
import { buildDataSetScope, resolveDataSetDef, extendDataSetScope } from "./dataset-scope.js";
import { buildPagePathMap, extendPagePathMap, type PagePathMap } from "./page-paths.js";

function makeDef(uuid: string): ExternalDataSetDef {
  return { uuid: dataSetId(uuid), content: "[]" };
}

describe("buildDataSetScope", () => {
  it("root page datasets scoped to empty path", () => {
    const ds = makeDef("sales");
    const root: Component = {
      type: "page",
      props: { name: "App", datasets: [ds] },
    };
    const paths = buildPagePathMap(root);
    const scope = buildDataSetScope(root, paths);
    expect(scope.get("")?.get(dataSetId("sales"))).toBe(ds);
  });

  it("child page inherits parent datasets", () => {
    const ds = makeDef("global");
    const child: Component = { type: "page", props: { name: "Sales" } };
    const root: Component = {
      type: "page",
      props: { name: "App", datasets: [ds] },
      slots: { Sales: [child] },
    };
    const paths = buildPagePathMap(root);
    const scope = buildDataSetScope(root, paths);
    expect(scope.get("Sales")?.get(dataSetId("global"))).toBe(ds);
  });

  it("child page overrides parent dataset with same id", () => {
    const parentDs = makeDef("data");
    const childDs = makeDef("data");
    const child: Component = {
      type: "page",
      props: { name: "Sales", datasets: [childDs] },
    };
    const root: Component = {
      type: "page",
      props: { name: "App", datasets: [parentDs] },
      slots: { Sales: [child] },
    };
    const paths = buildPagePathMap(root);
    const scope = buildDataSetScope(root, paths);
    expect(scope.get("Sales")?.get(dataSetId("data"))).toBe(childDs);
  });
});

describe("resolveDataSetDef", () => {
  it("resolves from own page", () => {
    const ds = makeDef("local");
    const root: Component = {
      type: "page",
      props: { name: "App", datasets: [ds] },
    };
    const paths = buildPagePathMap(root);
    const scope = buildDataSetScope(root, paths);
    expect(resolveDataSetDef(dataSetId("local"), "", scope)).toBe(ds);
  });

  it("walks up ancestors to find dataset", () => {
    const ds = makeDef("root-ds");
    const grandchild: Component = { type: "page", props: { name: "Detail" } };
    const child: Component = {
      type: "page",
      props: { name: "Sales" },
      slots: { Detail: [grandchild] },
    };
    const root: Component = {
      type: "page",
      props: { name: "App", datasets: [ds] },
      slots: { Sales: [child] },
    };
    const paths = buildPagePathMap(root);
    const scope = buildDataSetScope(root, paths);
    expect(resolveDataSetDef(dataSetId("root-ds"), "Sales/Detail", scope)).toBe(ds);
  });

  it("returns undefined for unknown dataset", () => {
    const root: Component = { type: "page", props: { name: "App" } };
    const paths = buildPagePathMap(root);
    const scope = buildDataSetScope(root, paths);
    expect(resolveDataSetDef(dataSetId("nonexistent"), "", scope)).toBeUndefined();
  });
});

describe("extendDataSetScope", () => {
  it("extends scope with fetched subtree, inheriting parent datasets", () => {
    const parentDs: ExternalDataSetDef = {
      uuid: dataSetId("parent-ds"),
      url: "http://example.com/data",
      columns: [],
    };
    const parentPage: Component = {
      type: "page",
      props: { name: "Sales", datasets: [parentDs] },
    };
    const root: Component = {
      type: "page",
      slots: { Sales: [parentPage] },
    };
    const paths = buildPagePathMap(root);
    const scope = buildDataSetScope(root, paths);

    const childDs: ExternalDataSetDef = {
      uuid: dataSetId("child-ds"),
      url: "http://example.com/child",
      columns: [],
    };
    const childPage: Component = {
      type: "page",
      props: { name: "Detail", datasets: [childDs] },
    };
    const fetchedRoot: Component = {
      type: "page",
      slots: { Detail: [childPage] },
    };

    const newPaths: PagePathMap = new Map();
    extendPagePathMap(fetchedRoot, "Sales", newPaths);

    const inherited = scope.get("Sales") ?? new Map();
    extendDataSetScope(fetchedRoot, inherited, newPaths, scope);

    // Child page inherits parent dataset AND has its own
    const detailScope = scope.get("Sales/Detail");
    expect(detailScope).toBeTruthy();
    expect(detailScope!.get(dataSetId("parent-ds"))).toBe(parentDs);
    expect(detailScope!.get(dataSetId("child-ds"))).toBe(childDs);
  });
});
