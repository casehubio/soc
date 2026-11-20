/**
 * Parses Prometheus text exposition format into structured arrays.
 *
 * Each metric line `metric_name{label="value"} 42.0` becomes
 * `["metric_name", 'label="value"', "42.0"]`.
 *
 * Lines without labels produce an empty string for the labels element.
 * Comment lines (starting with `#`) and empty lines are skipped.
 * `NaN` values are replaced with `"-1"`.
 */
export declare function parseMetrics(input: string): string[][];
//# sourceMappingURL=metrics-parser.d.ts.map