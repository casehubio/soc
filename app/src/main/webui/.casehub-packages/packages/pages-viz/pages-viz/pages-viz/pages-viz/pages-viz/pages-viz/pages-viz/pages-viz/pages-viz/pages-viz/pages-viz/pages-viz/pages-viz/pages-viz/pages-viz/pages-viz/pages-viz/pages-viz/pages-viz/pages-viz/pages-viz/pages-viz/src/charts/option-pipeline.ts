import type { TypedDataSet, ColumnSettings } from "@casehubio/pages-data";
import type { ChartSettingsBase } from "@casehubio/pages-component";
import { deepMerge } from "../base/deep-merge.js";
import { cellToRaw, resolveColumnName, applyCellExpression, resolveColumnExpression } from "../base/cell-extract.js";

/**
 * Stage 1: Convert TypedDataSet to ECharts dataset.source format.
 *
 * Returns an array-of-arrays where:
 * - First row contains display names (resolved via resolveColumnName)
 * - Subsequent rows contain raw values (via cellToRaw)
 */
export async function datasetToSource(
  dataset: TypedDataSet,
  propsColumns?: readonly ColumnSettings[],
): Promise<(string | number | Date | null)[][]> {
  const expressions = dataset.columns.map((c) => resolveColumnExpression(c.id, propsColumns));
  const dataRows = await Promise.all(
    dataset.rows.map(async (row) =>
      Promise.all(
        dataset.columns.map(async (c, i) => {
          const cell = row.cells[i];
          if (!cell) return null;
          const raw = cellToRaw(cell);
          return expressions[i] ? applyCellExpression(raw, expressions[i]) : raw;
        }),
      ),
    ),
  );
  return [
    dataset.columns.map((c) => resolveColumnName(c, propsColumns)),
    ...dataRows,
  ];
}

/**
 * Stage 3: Apply typed ChartSettingsBase fields to ECharts option.
 *
 * Handles both ChartSettingsBase (all charts) and ChartSettings (Cartesian)
 * properties via structural access. Centralises escape hatch merging.
 */
export function applyChartSettings(
  option: Record<string, unknown>,
  props: { title?: string } & ChartSettingsBase,
): Record<string, unknown> {
  // Title
  if (props.title !== undefined) {
    option.title = { text: props.title };
  }

  // Legend
  if (props.legend !== undefined) {
    const legend: Record<string, unknown> = { ...((option.legend as Record<string, unknown> | undefined) ?? {}) };

    if (props.legend.show !== undefined) {
      legend.show = props.legend.show;
    }

    if (props.legend.position !== undefined) {
      switch (props.legend.position) {
        case "top":
          legend.top = 0;
          break;
        case "bottom":
          legend.bottom = 0;
          break;
        case "left":
          legend.left = 0;
          legend.orient = "vertical";
          break;
        case "right":
          legend.right = 0;
          legend.orient = "vertical";
          break;
      }
    }

    if (props.legend.orient !== undefined) {
      legend.orient = props.legend.orient;
    }

    if (props.legend.selectedMode !== undefined) {
      legend.selectedMode = props.legend.selectedMode;
    }

    option.legend = legend;
  }

  // Tooltip
  if (props.tooltip !== undefined) {
    const tooltip: Record<string, unknown> = { ...((option.tooltip as Record<string, unknown> | undefined) ?? {}) };
    if (props.tooltip.show !== undefined) tooltip.show = props.tooltip.show;
    if (props.tooltip.trigger !== undefined) tooltip.trigger = props.tooltip.trigger;
    option.tooltip = tooltip;
  }

  // Animation
  if (props.animation !== undefined) {
    option.animation = props.animation;
  }

  // Color palette
  if (props.color !== undefined) {
    option.color = props.color;
  }

  // Background color
  if (props.backgroundColor !== undefined) {
    option.backgroundColor = props.backgroundColor;
  }

  // Cartesian properties via structural access
  const raw = props as Readonly<Record<string, unknown>>;

  // X-Axis
  if ("xAxis" in props && raw.xAxis !== undefined) {
    const xAxisProps = raw.xAxis as { title?: string; showLabels?: boolean; labelAngle?: number; type?: string; min?: number | string; max?: number | string; inverse?: boolean };
    const xAxis: Record<string, unknown> = { ...((option.xAxis as Record<string, unknown> | undefined) ?? {}) };

    if (xAxisProps.title !== undefined) xAxis.name = xAxisProps.title;
    if (xAxisProps.type !== undefined) xAxis.type = xAxisProps.type;
    if (xAxisProps.min !== undefined) xAxis.min = xAxisProps.min;
    if (xAxisProps.max !== undefined) xAxis.max = xAxisProps.max;
    if (xAxisProps.inverse !== undefined) xAxis.inverse = xAxisProps.inverse;
    if (xAxisProps.showLabels !== undefined) {
      xAxis.axisLabel = { show: xAxisProps.showLabels };
    }
    if (xAxisProps.labelAngle != null) {
      const existing = (xAxis.axisLabel as Record<string, unknown> | undefined) ?? {};
      xAxis.axisLabel = { ...existing, rotate: xAxisProps.labelAngle };
    }

    option.xAxis = xAxis;
  }

  // Y-Axis
  if ("yAxis" in props && raw.yAxis !== undefined) {
    const yAxisProps = raw.yAxis as { title?: string; showLabels?: boolean; labelAngle?: number; type?: string; min?: number | string; max?: number | string; inverse?: boolean };
    const yAxis: Record<string, unknown> = { ...((option.yAxis as Record<string, unknown> | undefined) ?? {}) };

    if (yAxisProps.title !== undefined) yAxis.name = yAxisProps.title;
    if (yAxisProps.type !== undefined) yAxis.type = yAxisProps.type;
    if (yAxisProps.min !== undefined) yAxis.min = yAxisProps.min;
    if (yAxisProps.max !== undefined) yAxis.max = yAxisProps.max;
    if (yAxisProps.inverse !== undefined) yAxis.inverse = yAxisProps.inverse;
    if (yAxisProps.showLabels !== undefined) {
      yAxis.axisLabel = { show: yAxisProps.showLabels };
    }
    if (yAxisProps.labelAngle != null) {
      const existing = (yAxis.axisLabel as Record<string, unknown> | undefined) ?? {};
      yAxis.axisLabel = { ...existing, rotate: yAxisProps.labelAngle };
    }

    option.yAxis = yAxis;
  }

  // Margins (via grid)
  if (props.margin !== undefined) {
    const grid: Record<string, unknown> = { ...((option.grid as Record<string, unknown> | undefined) ?? {}) };
    if (props.margin.top !== undefined) grid.top = props.margin.top;
    if (props.margin.right !== undefined) grid.right = props.margin.right;
    if (props.margin.bottom !== undefined) grid.bottom = props.margin.bottom;
    if (props.margin.left !== undefined) grid.left = props.margin.left;
    option.grid = grid;
  }

  // Grid line visibility
  if ("grid" in props && raw.grid !== undefined) {
    const gridProps = raw.grid as { x?: boolean; y?: boolean };
    if (gridProps.x === false) {
      const xAxis: Record<string, unknown> = { ...((option.xAxis as Record<string, unknown> | undefined) ?? {}) };
      const existing = (xAxis.splitLine as Record<string, unknown> | undefined) ?? {};
      xAxis.splitLine = { ...existing, show: false };
      option.xAxis = xAxis;
    }
    if (gridProps.y === false) {
      const yAxis: Record<string, unknown> = { ...((option.yAxis as Record<string, unknown> | undefined) ?? {}) };
      const existing = (yAxis.splitLine as Record<string, unknown> | undefined) ?? {};
      yAxis.splitLine = { ...existing, show: false };
      option.yAxis = yAxis;
    }
  }

  // Compact grid.top when no internal title and no explicit margin.top
  if (props.title === undefined && props.margin?.top === undefined) {
    const grid: Record<string, unknown> = { ...((option.grid as Record<string, unknown> | undefined) ?? {}) };
    if (grid.top === undefined) {
      grid.top = 10;
      option.grid = grid;
    }
  }

  // Zoom
  if ("zoom" in props && raw.zoom !== undefined) {
    const zoomVal = raw.zoom;
    if (zoomVal === true) {
      option.dataZoom = [{ type: "inside" }, { type: "slider" }];
    } else if (typeof zoomVal === "object" && zoomVal !== null) {
      const z = zoomVal as { enabled?: boolean; start?: number; end?: number };
      if (z.enabled !== false) {
        const inside: Record<string, unknown> = { type: "inside" };
        const slider: Record<string, unknown> = { type: "slider" };
        if (z.start !== undefined) { inside.start = z.start; slider.start = z.start; }
        if (z.end !== undefined) { inside.end = z.end; slider.end = z.end; }
        option.dataZoom = [inside, slider];
      }
    }
  }

  // Escape hatch merging (typed then untyped — later overrides earlier)
  if ("echarts" in props && raw.echarts !== undefined) {
    option = deepMerge(option, raw.echarts as Record<string, unknown>);
  }
  if (props.extra !== undefined) {
    option = deepMerge(option, props.extra as Record<string, unknown>);
  }

  return option;
}
