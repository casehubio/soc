import { html, css, type TemplateResult } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { customElement } from "lit/decorators.js";
import type { DensityHeatmapProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import { PagesElement } from "../base/PagesElement.js";
import { cellToRaw } from "../base/cell-extract.js";

type HeatmapModule = typeof import("@drdreo/heatmap");
let heatmapModule: HeatmapModule | undefined;

async function loadHeatmapModule(): Promise<HeatmapModule> {
  if (!heatmapModule) {
    heatmapModule = await import("@drdreo/heatmap");
  }
  return heatmapModule;
}

interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
}

interface HeatmapInstance {
  setData(data: HeatmapPoint[]): void;
  destroy(): void;
}

@customElement("pages-density-heatmap")
export class PagesDensityHeatmap extends PagesElement<DensityHeatmapProps> {
  static override styles = css`
    ${PagesElement.styles}
    :host { display: block; }
  `;

  private _containerRef = createRef<HTMLDivElement>();
  private _heatmap: HeatmapInstance | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-label', this.props?.title ?? 'Density heatmap');
  }

  override render(): TemplateResult {
    if (this.props) this.applySizing(this.props);
    return super.render();
  }

  protected override renderContent(_props: DensityHeatmapProps, _dataset: TypedDataSet): TemplateResult {
    return html`<div ${ref(this._containerRef)} style="width:100%;height:100%;position:relative"></div>`;
  }

  override updated(): void {
    const container = this._containerRef.value;
    if (!container || !this.props || !this.dataSet) return;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return;
    void this._updateHeatmap(container);
  }

  private async _updateHeatmap(container: HTMLDivElement): Promise<void> {
    const mod = await loadHeatmapModule();
    if (!this.props || !this.dataSet) return;
    const points = this.extractAndNormalize(this.dataSet, this.props, container);
    if (this._heatmap) {
      this._heatmap.setData(points);
    } else {
      this._heatmap = this.createInstance(mod, container, points, this.props);
    }
  }

  private applySizing(props: DensityHeatmapProps): void {
    const raw = props as unknown as Readonly<Record<string, unknown>>;
    const h = raw.height;
    if (typeof h === "number") {
      this.style.minHeight = `${String(h)}px`;
      this.style.height = `${String(h)}px`;
    } else if (typeof h === "string") {
      this.style.minHeight = h;
      this.style.height = h;
    } else {
      this.style.minHeight = "300px";
    }
    const w = raw.width;
    if (typeof w === "number") {
      this.style.width = `${String(w)}px`;
    } else if (typeof w === "string") {
      this.style.width = w;
    } else {
      this.style.width = "100%";
    }
  }

  private createInstance(
    mod: HeatmapModule,
    container: HTMLDivElement,
    data: HeatmapPoint[],
    props: DensityHeatmapProps,
  ): HeatmapInstance {
    const config: Record<string, unknown> = { container, data };

    if (props.gradient) config.gradient = props.gradient;
    if (props.radius !== undefined) config.radius = props.radius;
    if (props.aggregation) config.aggregationMode = props.aggregation;
    if (props.blur !== undefined) config.blur = props.blur;
    if (props.maxOpacity !== undefined) config.maxOpacity = props.maxOpacity;
    if (props.minOpacity !== undefined) config.minOpacity = props.minOpacity;
    if (props.intensityExponent !== undefined) config.intensityExponent = props.intensityExponent;
    if (props.valueMin !== undefined) config.valueMin = props.valueMin;
    if (props.valueMax !== undefined) config.valueMax = props.valueMax;

    if (props.heatmapJs) {
      for (const [k, v] of Object.entries(props.heatmapJs)) {
        config[k] = v;
      }
    }
    if (props.extra) {
      for (const [k, v] of Object.entries(props.extra)) {
        config[k] = v;
      }
    }

    const features: unknown[] = [];
    if (props.showTooltip) {
      features.push(mod.withTooltip());
    }
    if (props.showLegend) {
      features.push(mod.withLegend());
    }

    return mod.createHeatmap(config as never, ...features as never[]);
  }

  private extractAndNormalize(
    dataset: TypedDataSet,
    props: DensityHeatmapProps,
    container: HTMLDivElement,
  ): HeatmapPoint[] {
    const xIdx = props.xColumn
      ? dataset.columns.findIndex(c => c.id === props.xColumn)
      : 0;
    const yIdx = props.yColumn
      ? dataset.columns.findIndex(c => c.id === props.yColumn)
      : 1;
    const vIdx = props.valueColumn
      ? dataset.columns.findIndex(c => c.id === props.valueColumn)
      : 2;

    const rawPoints: { rx: number; ry: number; value: number }[] = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const row of dataset.rows) {
      const xCell = row.cells[xIdx];
      const yCell = row.cells[yIdx];
      const vCell = row.cells[vIdx];
      if (!xCell || !yCell || !vCell) continue;
      if (xCell.type === "NULL" || yCell.type === "NULL" || vCell.type === "NULL") continue;

      const rx = cellToRaw(xCell) as number;
      const ry = cellToRaw(yCell) as number;
      rawPoints.push({ rx, ry, value: cellToRaw(vCell) as number });

      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }

    const pad = 30;
    const w = container.offsetWidth - pad * 2;
    const h = container.offsetHeight - pad * 2;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    return rawPoints.map(p => ({
      x: pad + ((p.rx - minX) / rangeX) * w,
      y: pad + ((p.ry - minY) / rangeY) * h,
      value: p.value,
    }));
  }

  override onResize(): void {
    if (!this._heatmap || !this._containerRef.value || !this.props || !this.dataSet) return;
    this._heatmap.destroy();
    this._heatmap = undefined;
    void this._updateHeatmap(this._containerRef.value);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._heatmap) {
      this._heatmap.destroy();
      this._heatmap = undefined;
    }
  }
}
