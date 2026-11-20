import { html, nothing, type TemplateResult } from 'lit';
import type { PaletteItem, IconRenderer, PaletteMode } from '../types.js';
import { filterItems, groupItems } from './search-filter.js';

export interface RenderOptions {
  collapsible: boolean;
  isGroupOpen?: (name: string) => boolean;
  onGroupToggle?: (name: string, open: boolean) => void;
  onSelect: (item: PaletteItem) => void;
  searchQuery: string;
  itemRole: 'button' | 'option';
  iconRenderer?: IconRenderer | undefined;
  mode?: PaletteMode | undefined;
  draggable?: boolean | undefined;
}

function renderIcon(icon: string, renderer?: IconRenderer): TemplateResult {
  if (renderer) return renderer(icon);
  return html`<span class="palette-item-icon">${icon}</span>`;
}

function handleDragStart(item: PaletteItem, e: DragEvent): void {
  if (!e.dataTransfer) return;
  e.dataTransfer.setData('application/x-pages-node-type', item.type);
  e.dataTransfer.setData('application/x-pages-node-label', item.label);
  e.dataTransfer.effectAllowed = 'move';
  const ghost = (e.target as HTMLElement).cloneNode(true) as HTMLElement;
  ghost.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0.5;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.2));transform:scale(0.85);pointer-events:none;';
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 0, 0);
  requestAnimationFrame(() => ghost.remove());
}

function renderItem(
  item: PaletteItem,
  role: 'button' | 'option',
  onSelect: (item: PaletteItem) => void,
  iconRenderer?: IconRenderer,
  compact = false,
  draggable = false,
): TemplateResult {
  const handleClick = () => { onSelect(item); };
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(item);
    }
  };
  const onDragStart = draggable ? (e: DragEvent) => { handleDragStart(item, e); } : undefined;
  return compact
    ? html`
      <div class="palette-item compact"
        role=${role}
        aria-label=${item.label}
        title=${item.label}
        tabindex="-1"
        draggable=${draggable ? 'true' : nothing}
        @click=${handleClick}
        @keydown=${handleKeydown}
        @dragstart=${onDragStart}>
        ${renderIcon(item.icon, iconRenderer)}
      </div>`
    : html`
      <div class="palette-item"
        role=${role}
        aria-label=${item.label}
        tabindex="-1"
        draggable=${draggable ? 'true' : nothing}
        @click=${handleClick}
        @keydown=${handleKeydown}
        @dragstart=${onDragStart}>
        ${renderIcon(item.icon, iconRenderer)}
        <span class="palette-item-label">${item.label}</span>
      </div>`;
}

export function renderStencilList(
  items: readonly PaletteItem[],
  options: RenderOptions,
): TemplateResult {
  const filtered = filterItems(items, options.searchQuery);
  const compact = options.mode === 'compact';

  if (compact) {
    return html`
      <div class="compact-column">
        ${filtered.map(item => renderItem(item, options.itemRole, options.onSelect, options.iconRenderer, true, options.draggable))}
      </div>`;
  }

  const groups = groupItems(filtered);
  const searchActive = options.searchQuery.length > 0;

  const ungrouped = groups.get('');
  groups.delete('');

  const groupEntries = Array.from(groups.entries());

  return html`
    ${ungrouped && ungrouped.length > 0
      ? html`<div class="ungrouped-items">
          ${ungrouped.map(item => renderItem(item, options.itemRole, options.onSelect, options.iconRenderer, false, options.draggable))}
        </div>`
      : nothing}
    ${groupEntries.map(([name, items]) =>
      options.collapsible && !searchActive
        ? html`
            <details class="palette-group"
              ?open=${options.isGroupOpen?.(name) ?? true}
              @toggle=${(e: Event) => options.onGroupToggle?.(name, (e.target as HTMLDetailsElement).open)}>
              <summary>${name}</summary>
              <div class="palette-group-items">
                ${items.map(item => renderItem(item, options.itemRole, options.onSelect, options.iconRenderer, false, options.draggable))}
              </div>
            </details>`
        : html`
            <div class="palette-group" role="group" aria-label=${name}>
              <div class="palette-group-header">${name}</div>
              <div class="palette-group-items">
                ${items.map(item => renderItem(item, options.itemRole, options.onSelect, options.iconRenderer, false, options.draggable))}
              </div>
            </div>`,
    )}`;
}
