export const GROUPED_VIEW_CSS = `
:host {
  display: block;
  font-family: var(--pages-font-family, system-ui, sans-serif);
  font-size: var(--pages-font-size-base, 14px);
  color: var(--pages-neutral-12, #333);
}

/* Shared column header bar */
.column-header-bar {
  display: grid;
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--pages-neutral-1, #fff);
  border-bottom: 2px solid var(--pages-neutral-5, #ddd);
}

.col-header {
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
  font-weight: var(--pages-font-weight-semibold, 600);
  font-size: var(--pages-font-size-sm, 12px);
  color: var(--pages-neutral-9, #666);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: var(--pages-space-1, 4px);
}

.col-header:hover {
  color: var(--pages-neutral-12, #333);
}

.col-header.sort-asc::after { content: " ▲"; font-size: 10px; }
.col-header.sort-desc::after { content: " ▼"; font-size: 10px; }

.col-label {
  text-align: left;
  padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
  font-weight: var(--pages-font-weight-semibold, 600);
  font-size: var(--pages-font-size-sm, 12px);
  color: var(--pages-neutral-9, #666);
  white-space: nowrap;
}

/* Sectioned mode — section headings */
.section-toggle {
  font-size: var(--pages-font-size-lg, 18px);
  font-weight: var(--pages-font-weight-semibold, 600);
  color: var(--pages-neutral-12, #333);
  background: none;
  border: none;
  padding: var(--pages-space-3, 12px) 0 var(--pages-space-2, 8px);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--pages-space-2, 8px);
  width: 100%;
}

.section-chevron {
  font-size: var(--pages-font-size-sm, 12px);
  transition: transform var(--pages-duration-fast, 150ms) var(--pages-ease-default, ease);
  display: inline-block;
}

.section-chevron.expanded {
  transform: rotate(90deg);
}

.section-summary {
  font-size: var(--pages-font-size-sm, 12px);
  font-weight: var(--pages-font-weight-normal, 400);
  color: var(--pages-neutral-8, #888);
  margin-left: var(--pages-space-2, 8px);
}

.section-content {
  overflow: hidden;
}

/* Depth-based sub-section styling for multi-level grouping */
.sub-section-toggle {
  font-size: var(--pages-font-size-base, 14px);
  font-weight: var(--pages-font-weight-semibold, 600);
  color: var(--pages-neutral-10, #555);
  background: none;
  border: none;
  padding: var(--pages-space-2, 8px) 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--pages-space-2, 8px);
  width: 100%;
  border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
}

/* Spreadsheet mode — compact group headers */
.group-toggle {
  background: var(--pages-neutral-3, #f5f5f5);
  border: none;
  border-bottom: 1px solid var(--pages-neutral-5, #ddd);
  cursor: pointer;
  font: inherit;
  font-weight: var(--pages-font-weight-semibold, 600);
  font-size: var(--pages-font-size-sm, 12px);
  color: var(--pages-neutral-12, #333);
  padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
  display: flex;
  align-items: center;
  gap: var(--pages-space-2, 8px);
  width: 100%;
}

.group-chevron {
  font-size: var(--pages-font-size-xs, 10px);
}

.spreadsheet .group-section {
  margin: 0;
}

.spreadsheet .section-content {
  margin: 0;
  padding: 0;
}

/* Embedded pages-table overrides */
.section-content pages-table {
  display: block;
}

.aligned-list {
  display: grid;
  row-gap: 0;
  padding: 0 var(--pages-space-3, 12px);
}

.list-item {
  display: contents;
}

.list-item dd {
  margin: 0;
  padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
  color: var(--pages-neutral-11, #444);
}

.list-item + .list-item dd {
  border-top: 1px solid var(--pages-neutral-3, #eee);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Column picker */
.column-picker-wrapper {
  position: relative;
  margin-left: auto;
}

.column-picker-trigger {
  background: none;
  border: 1px solid var(--pages-neutral-6, #9e9e9e);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  line-height: 1;
}

.column-picker-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  background: var(--pages-neutral-1, #fff);
  border: 1px solid var(--pages-neutral-6, #9e9e9e);
  border-radius: 4px;
  padding: 8px;
  z-index: 10;
  min-width: 160px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.picker-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--pages-neutral-9, #616161);
  margin-bottom: 4px;
}

.column-picker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  cursor: pointer;
  font-size: 13px;
}

.column-picker-item input[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .section-content,
  .section-chevron {
    transition: none !important;
  }
}
`;
