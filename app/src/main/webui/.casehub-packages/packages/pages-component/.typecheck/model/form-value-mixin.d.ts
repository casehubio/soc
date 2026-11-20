import type { LitElement } from "lit";
import type { FormValueProvider } from "./form-value-provider.js";
type Constructor<T = LitElement> = new (...args: any[]) => T;
export declare function FormValueMixin<T extends Constructor>(Base: T): Constructor<FormValueProvider> & T;
export {};
//# sourceMappingURL=form-value-mixin.d.ts.map