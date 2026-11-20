import type { ReactiveController, ReactiveControllerHost } from "lit";
import {
  DataSourceController,
  type DataSourceControllerOptions,
} from "./data-source-controller.js";
import { createStandaloneConnector } from "./standalone-connector.js";
import type { TypedDataSet } from "@casehubio/pages-data";

export class DataSourceAdapter implements ReactiveController {
  readonly controller: DataSourceController;

  constructor(
    private readonly host: ReactiveControllerHost,
    options?: DataSourceControllerOptions,
  ) {
    this.controller = new DataSourceController({
      ...options,
      onChange: () => {
        options?.onChange?.();
        host.requestUpdate();
      },
    });
    host.addController(this);
  }

  get endpoint(): string | undefined { return this.controller.endpoint; }
  set endpoint(v: string | undefined) { this.controller.endpoint = v; }

  get loading(): boolean { return this.controller.loading; }
  set loading(v: boolean) { this.controller.loading = v; }
  get error(): string { return this.controller.error; }
  set error(v: string) { this.controller.error = v; }
  get dataSet(): TypedDataSet | undefined { return this.controller.dataSet; }
  set dataSet(v: TypedDataSet | undefined) { this.controller.dataSet = v; }

  hostConnected(): void {
    this.controller.connector = createStandaloneConnector(this.controller);
  }

  hostDisconnected(): void {
    this.controller.connector = undefined;
  }

  refresh(): void { this.controller.refresh(); }
  dispose(): void { this.controller.dispose(); }
}
