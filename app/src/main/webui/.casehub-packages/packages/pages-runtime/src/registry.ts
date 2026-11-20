import type { Component } from "@casehubio/pages-component";
import type { DataSetLookup } from "@casehubio/pages-data";
import type { VizTarget } from "./data-pipeline.js";

export interface ComponentEntry {
  readonly element: HTMLElement;
  readonly vizElement?: VizTarget;
  readonly component: Component;
  readonly pagePath: string;
  readonly originalLookup?: DataSetLookup;
  readonly hasExplicitId: boolean;
}

export type ComponentRegistry = Map<string, ComponentEntry>;
