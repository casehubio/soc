import type { TypedDataSet, ColumnId, SortColumn } from "@casehubio/pages-data";
import type { VizTarget, DataReceiver } from "@casehubio/pages-component";

export function createHostPanelProxy(panel: DataReceiver): VizTarget {
  return {
    set loading(v: boolean) { panel.loading = v; },
    get loading() { return panel.loading; },
    set dataSet(v: TypedDataSet | undefined) { panel.dataSet = v; },
    get dataSet() { return panel.dataSet; },
    set error(v: string) { panel.error = v; },
    get error() { return panel.error; },
    set totalRows(_: number) {},
    get totalRows() { return 0; },
    set activeSort(_: SortColumn | undefined) {},
    get activeSort() { return undefined; },
    set activePage(_: number | undefined) {},
    get activePage() { return undefined; },
  };
}

export function createFormFieldProxy(
  component: HTMLElement,
  fieldName: string,
): VizTarget {
  let _dataSet: TypedDataSet | undefined;
  return {
    get loading() { return false; },
    set loading(v: boolean) {
      if (v) (component as any).error = undefined;
    },
    get dataSet() { return _dataSet; },
    set dataSet(ds: TypedDataSet | undefined) {
      _dataSet = ds;
      (component as any).error = undefined;
      if (ds) {
        const value = extractFormFieldValue(ds, fieldName);
        setFormComponentValue(component, value);
      }
    },
    get error() { return ((component as any).error ?? "") as string; },
    set error(msg: string) {
      _dataSet = undefined;
      (component as any).error = msg || undefined;
    },
    get totalRows() { return 0; },
    set totalRows(_: number) {},
    get activeSort() { return undefined; },
    set activeSort(_: SortColumn | undefined) {},
    get activePage() { return undefined; },
    set activePage(_: number | undefined) {},
  };
}

function extractFormFieldValue(dataset: TypedDataSet, field: string): unknown {
  if (!dataset.rows.length) return undefined;
  const row = dataset.rows[0];
  if (!row) return undefined;
  try {
    const cell = row.cell(field as ColumnId);
    if (cell.type === "NULL") return undefined;
    return cell.value;
  } catch {
    return undefined;
  }
}

function setFormComponentValue(component: HTMLElement, value: unknown): void {
  const tag = component.tagName.toLowerCase();
  if (tag === "pages-checkbox") {
    let checked = false;
    if (typeof value === "boolean") checked = value;
    else if (typeof value === "string") checked = value.toLowerCase() === "true";
    (component as any).checked = checked;
  } else {
    (component as any).value = value !== undefined && value !== null ? String(value) : "";
  }
}
