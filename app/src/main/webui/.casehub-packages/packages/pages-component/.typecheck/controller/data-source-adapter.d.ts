import type { ReactiveController, ReactiveControllerHost } from "lit";
import { DataSourceController, type DataSourceControllerOptions } from "./data-source-controller.js";
import type { TypedDataSet } from "@casehubio/pages-data";
export declare class DataSourceAdapter implements ReactiveController {
    private readonly host;
    readonly controller: DataSourceController;
    constructor(host: ReactiveControllerHost, options?: DataSourceControllerOptions);
    get endpoint(): string | undefined;
    set endpoint(v: string | undefined);
    get loading(): boolean;
    set loading(v: boolean);
    get error(): string;
    set error(v: string);
    get dataSet(): TypedDataSet | undefined;
    set dataSet(v: TypedDataSet | undefined);
    hostConnected(): void;
    hostDisconnected(): void;
    refresh(): void;
    dispose(): void;
}
//# sourceMappingURL=data-source-adapter.d.ts.map