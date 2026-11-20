import type { TypedDataSet, ColumnId, CellValue } from "@casehubio/pages-data";
import type { ColumnRenderer } from "@casehubio/pages-component";
import type { GroupBoundary } from "./group-extraction.js";

function cellToDisplay(cell: CellValue): string {
  if (cell.type === "NULL") return "";
  return String(cell.value);
}

export function renderContentList(
  dataset: TypedDataSet,
  boundary: GroupBoundary,
  contentColumns: readonly ColumnId[],
  colWidthsCss: string,
  renderers?: ReadonlyMap<ColumnId, ColumnRenderer>,
): HTMLElement {
  const dl = document.createElement("dl");
  dl.className = "aligned-list";
  dl.style.gridTemplateColumns = colWidthsCss;

  for (let r = boundary.startRow; r < boundary.startRow + boundary.rowCount; r++) {
    const row = dataset.rows[r]!;
    const item = document.createElement("div");
    item.className = "list-item";

    for (const id of contentColumns) {
      const col = dataset.columns.find((c) => c.id === id);
      const dt = document.createElement("dt");
      dt.className = "visually-hidden";
      dt.textContent = col?.name ?? String(id);
      const dd = document.createElement("dd");

      const renderer = renderers?.get(id);
      if (renderer && col) {
        const cell = row.cell(id);
        const result = renderer(cell, row, col);
        if (result instanceof HTMLElement) {
          dd.appendChild(result);
        } else {
          dd.textContent = String(result);
        }
      } else {
        dd.textContent = cellToDisplay(row.cell(id));
      }

      item.append(dt, dd);
    }
    dl.appendChild(item);
  }

  return dl;
}
