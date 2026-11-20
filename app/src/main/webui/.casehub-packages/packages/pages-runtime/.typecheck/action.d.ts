import type { ActionCallbacks, ActionRequest, ActionResult } from "@casehubio/pages-component";
import type { RuntimeContext } from "@casehubio/pages-component";
export interface PagesActionCompleteDetail {
    readonly refresh: readonly string[];
}
export declare class ActionExecutor {
    private readonly fetchFn;
    private readonly baseUrl;
    constructor(fetchFn: typeof fetch, baseUrl: string);
    execute(request: ActionRequest, callbacks: ActionCallbacks, context: RuntimeContext): Promise<ActionResult>;
    private buildUrl;
    private resolveBodyTemplates;
}
//# sourceMappingURL=action.d.ts.map