import type { LitElement } from "lit";
import type { FormValueProvider } from "./form-value-provider.js";

type Constructor<T = LitElement> = new (...args: any[]) => T;

export function FormValueMixin<T extends Constructor>(Base: T) {
  abstract class FormValueHost extends Base implements FormValueProvider {
    private _error: string | undefined;
    private _value: unknown;

    get currentValue(): unknown {
      return this.collectValue();
    }

    set value(v: unknown) {
      this._value = v;
      this.propagateValue(v);
    }

    get value(): unknown {
      return this._value;
    }

    get error(): string | undefined {
      return this._error;
    }

    set error(e: string | undefined) {
      this._error = e;
    }

    validate(): boolean {
      const childrenValid = this.validateChildren();
      const selfValid = this.validateSelf();
      return childrenValid && selfValid;
    }

    protected abstract collectValue(): unknown;
    protected abstract propagateValue(v: unknown): void;
    protected abstract validateSelf(): boolean;
    protected abstract validateChildren(): boolean;
  }

  return FormValueHost as unknown as Constructor<FormValueProvider> & T;
}
