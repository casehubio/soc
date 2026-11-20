export interface CasehubEChartsExtension {
  readonly toolbox?: {
    readonly show?: boolean;
    readonly feature?: {
      readonly saveAsImage?: { readonly show?: boolean; readonly title?: string };
      readonly dataZoom?: { readonly show?: boolean };
      readonly restore?: { readonly show?: boolean };
      readonly dataView?: { readonly show?: boolean; readonly readOnly?: boolean };
    };
    readonly orient?: "horizontal" | "vertical";
  };
  readonly dataZoom?: readonly {
    readonly type?: "slider" | "inside";
    readonly filterMode?: "filter" | "weakFilter" | "empty" | "none";
    readonly xAxisIndex?: number | readonly number[];
    readonly yAxisIndex?: number | readonly number[];
  }[];
  readonly animationDuration?: number;
  readonly animationEasing?: string;
  readonly animationDurationUpdate?: number;
  readonly animationThreshold?: number;
  readonly darkMode?: boolean;
  readonly series?: Readonly<Record<string, unknown>>;
}
