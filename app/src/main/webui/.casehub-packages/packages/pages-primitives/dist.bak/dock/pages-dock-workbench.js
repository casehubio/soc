var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
const DOCK_STYLES = `
  pages-dock-workbench { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--pages-neutral-3, #1e293b); }
  pages-dock-workbench .dock-layout { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
  pages-dock-workbench .dock-main { display: flex; flex: 1; overflow: hidden; }
  pages-dock-workbench .dock-zone { overflow: auto; }
  pages-dock-workbench .dock-zone-left, pages-dock-workbench .dock-zone-right { flex-shrink: 0; transition: width 0.15s ease-out; background: var(--pages-neutral-2, #162032); }
  pages-dock-workbench .dock-zone-centre { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  pages-dock-workbench .dock-zone-bottom { flex-shrink: 0; display: flex; transition: height 0.15s ease-out; background: var(--pages-neutral-2, #162032); }
  pages-dock-workbench .resize-handle { flex-shrink: 0; background: transparent; transition: background 0.15s, opacity 0.15s; touch-action: none; }
  pages-dock-workbench .resize-handle:hover, pages-dock-workbench .resize-handle:active { background: var(--pages-primary, #1967d2); }
  pages-dock-workbench .resize-left, pages-dock-workbench .resize-right { width: 4px; cursor: col-resize; }
  pages-dock-workbench .resize-bottom { height: 4px; cursor: row-resize; }
  pages-dock-workbench .dock-bar { display: flex; gap: 0; padding: 4px 2px; flex-shrink: 0; background: var(--pages-neutral-1, #0f172a); }
  pages-dock-workbench .dock-bar-left, pages-dock-workbench .dock-bar-right { flex-direction: column; }
  pages-dock-workbench .dock-bar-bottom { flex-direction: row; }
  pages-dock-workbench .dock-bar [data-dock-zone] { display: flex; flex-direction: inherit; gap: 2px; min-width: 24px; min-height: 24px; }
  pages-dock-workbench .dock-bar [data-dock-spacer] { flex: 1; }
  pages-dock-workbench .dock-bar button { border: none; background: transparent; cursor: pointer; padding: 6px; border-radius: var(--pages-radius-sm, 4px); font-size: 16px; color: var(--pages-neutral-8, #94a3b8); }
  pages-dock-workbench .dock-bar button:hover { background: var(--pages-neutral-3, #1e293b); color: var(--pages-neutral-11, #e2e8f0); }
  pages-dock-workbench .dock-bar button[data-active] { color: var(--pages-primary, #1967d2); background: rgba(25, 103, 210, 0.12); }
`;
export class PagesDockWorkbench extends LitElement {
    constructor() {
        super(...arguments);
        this.minPanelPct = 5;
        this.maxPanelPct = 50;
        this._dockState = {};
        this._splitSizes = { left: 20, right: 20, bottom: 30 };
        this._zoneSplitRatios = {};
        this._resizing = null;
        this._centreRendered = false;
        this._renderedPanels = new Set();
        this._keyHandler = (e) => {
            if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
                return;
            const n = parseInt(e.key, 10);
            if (isNaN(n) || n < 1)
                return;
            const allPanels = this._getAllPanels();
            const idx = n - 1;
            if (idx >= allPanels.length)
                return;
            e.preventDefault();
            this.togglePanel(allPanels[idx].panelId);
        };
    }
    createRenderRoot() { return this; }
    get dockState() {
        return this._dockState;
    }
    resetPanelContent(panelId) {
        this._renderedPanels.delete(panelId);
    }
    connectedCallback() {
        super.connectedCallback();
        const root = this.getRootNode();
        if (!root.querySelector('style[data-pages-dock]')) {
            const style = document.createElement('style');
            style.setAttribute('data-pages-dock', '');
            style.textContent = DOCK_STYLES;
            if (root === document) {
                document.head.appendChild(style);
            }
            else {
                root.prepend(style);
            }
        }
        this.addEventListener('keydown', this._keyHandler);
        this.setAttribute('tabindex', '0');
    }
    disconnectedCallback() {
        this.removeEventListener('keydown', this._keyHandler);
        super.disconnectedCallback();
        clearTimeout(this._saveTimer);
    }
    firstUpdated() {
        this._initComplete = this._doInit();
    }
    async _doInit() {
        await this._loadState();
        this._computeInitialDockState();
        this.requestUpdate();
        await new Promise(r => { setTimeout(r, 0); });
        if (this.renderCentre && !this._centreRendered) {
            const centreEl = this.querySelector('.dock-zone-centre');
            if (centreEl) {
                this.renderCentre(centreEl);
                this._centreRendered = true;
            }
        }
        this._activateInitialPanels();
    }
    async getUpdateComplete() {
        const result = await super.getUpdateComplete();
        if (this._initComplete)
            await this._initComplete;
        return result;
    }
    async _loadState() {
        if (this.layoutStore && this.persistKey) {
            const saved = await this.layoutStore.load(this.persistKey);
            if (saved) {
                if (saved.docks)
                    this._dockState = { ...saved.docks };
                if (saved.splits) {
                    const s = saved.splits;
                    this._splitSizes = { ...this._splitSizes, ...s };
                }
                const zs = saved.zoneSplits;
                if (zs)
                    this._zoneSplitRatios = { ...zs };
            }
        }
        else if (this.persistKey && typeof localStorage !== 'undefined') {
            try {
                const raw = localStorage.getItem(this.persistKey);
                if (raw) {
                    const data = JSON.parse(raw);
                    if (data.docks)
                        this._dockState = { ...data.docks };
                    if (data.splits)
                        this._splitSizes = { ...this._splitSizes, ...data.splits };
                    if (data.zoneSplits)
                        this._zoneSplitRatios = { ...data.zoneSplits };
                }
            }
            catch { /* ignore */ }
        }
    }
    _computeInitialDockState() {
        const allPanels = this._getAllPanels();
        const newState = { ...this._dockState };
        const activatedPerZoneKey = new Set();
        for (const item of allPanels) {
            const side = this._findPanelSide(item.panelId);
            const zone = item.zone ?? (side === 'bottom' ? 'bottom' : 'top');
            const zoneKey = `${side}:${zone}`;
            const panelId = item.panelId;
            if (newState[panelId] === true && !activatedPerZoneKey.has(zoneKey)) {
                activatedPerZoneKey.add(zoneKey);
            }
            else if (newState[panelId] === true && activatedPerZoneKey.has(zoneKey)) {
                newState[panelId] = false;
            }
            else if (newState[panelId] === undefined && item.defaultOpen && !activatedPerZoneKey.has(zoneKey)) {
                newState[panelId] = true;
                activatedPerZoneKey.add(zoneKey);
            }
            else {
                newState[panelId] = newState[panelId] ?? false;
            }
        }
        this._dockState = newState;
    }
    _activateInitialPanels() {
        for (const item of this._getAllPanels()) {
            if (!this._dockState[item.panelId])
                continue;
            const panelEl = this.querySelector(`[data-component-id="${item.panelId}"]`);
            if (!panelEl)
                continue;
            if (panelEl.dataset.deferred === 'pending' || panelEl.hasAttribute('data-deferred')) {
                if (this.renderContent) {
                    this.renderContent(panelEl, item.panelId);
                }
                else {
                    panelEl.dispatchEvent(new Event('pages-deferred-render'));
                }
                panelEl.removeAttribute('data-deferred');
                this._renderedPanels.add(item.panelId);
            }
            panelEl.style.display = '';
            const btn = this.querySelector(`button[data-dock-panel-id="${item.panelId}"]`);
            if (btn) {
                btn.dataset.active = '';
                btn.setAttribute('aria-pressed', 'true');
            }
        }
    }
    togglePanel(panelId) {
        if (this._dockState[panelId]) {
            this.hidePanel(panelId);
        }
        else {
            this.showPanel(panelId);
        }
    }
    showPanel(panelId) {
        const panelEl = this.querySelector(`[data-component-id="${panelId}"]`);
        if (!panelEl)
            return;
        const btn = this.querySelector(`button[data-dock-panel-id="${panelId}"]`);
        const zone = btn?.dataset.dockZone;
        const newState = { ...this._dockState };
        if (zone) {
            const side = this._findPanelSide(panelId);
            const panelActualZone = this.zoneMap?.get(panelId);
            const allPanels = this._getAllPanels();
            for (const item of allPanels) {
                const itemSide = this._findPanelSide(item.panelId);
                const itemZone = item.zone ?? (itemSide === 'bottom' ? 'bottom' : 'top');
                if (itemSide === side && itemZone === zone && item.panelId !== panelId && newState[item.panelId]) {
                    if (panelActualZone && this.zoneMap) {
                        const itemActualZone = this.zoneMap.get(item.panelId);
                        if (itemActualZone && itemActualZone !== panelActualZone)
                            continue;
                    }
                    newState[item.panelId] = false;
                    this._hidePanelDom(item.panelId);
                }
            }
        }
        if ((panelEl.dataset.deferred === 'pending' || panelEl.hasAttribute('data-deferred')) && !this._renderedPanels.has(panelId)) {
            if (this.renderContent) {
                this.renderContent(panelEl, panelId);
            }
            else {
                panelEl.dispatchEvent(new Event('pages-deferred-render'));
            }
            panelEl.removeAttribute('data-deferred');
            this._renderedPanels.add(panelId);
        }
        panelEl.style.display = '';
        if (btn)
            btn.dataset.active = '';
        newState[panelId] = true;
        this._dockState = newState;
        this._scheduleSave();
        this.dispatchEvent(new CustomEvent('pages-dock-toggle', {
            bubbles: true, composed: true,
            detail: { panelId, visible: true },
        }));
    }
    hidePanel(panelId) {
        this._hidePanelDom(panelId);
        this._dockState = { ...this._dockState, [panelId]: false };
        this._scheduleSave();
        this.dispatchEvent(new CustomEvent('pages-dock-toggle', {
            bubbles: true, composed: true,
            detail: { panelId, visible: false },
        }));
    }
    _hidePanelDom(panelId) {
        const panelEl = this.querySelector(`[data-component-id="${panelId}"]`);
        if (panelEl)
            panelEl.style.display = 'none';
        const btn = this.querySelector(`button[data-dock-panel-id="${panelId}"]`);
        if (btn)
            delete btn.dataset.active;
        this._dockState = { ...this._dockState, [panelId]: false };
    }
    _getAllPanels() {
        return [...(this.leftPanels ?? []), ...(this.rightPanels ?? []), ...(this.bottomPanels ?? [])];
    }
    _findPanelSide(panelId) {
        if (this.leftPanels?.some(p => p.panelId === panelId))
            return 'left';
        if (this.rightPanels?.some(p => p.panelId === panelId))
            return 'right';
        if (this.bottomPanels?.some(p => p.panelId === panelId))
            return 'bottom';
        return undefined;
    }
    _scheduleSave() {
        if (!this.persistKey)
            return;
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            const state = {
                docks: this._dockState,
                splits: this._splitSizes,
                ...(Object.keys(this._zoneSplitRatios).length > 0 ? { zoneSplits: this._zoneSplitRatios } : {}),
                ...(this.zoneMap ? { zones: Object.fromEntries(this.zoneMap) } : {}),
            };
            if (this.layoutStore) {
                void this.layoutStore.save(this.persistKey, state);
            }
            else if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.persistKey, JSON.stringify(state));
            }
        }, 300);
    }
    _renderDockBar(items, orientation, side, bottomItems) {
        const groups = new Map();
        for (const item of items) {
            const rawZone = item.zone ?? 'top';
            const zone = rawZone === 'bottom' ? 'top-second' : rawZone;
            const list = groups.get(zone) ?? [];
            list.push(item);
            groups.set(zone, list);
        }
        if (bottomItems && bottomItems.length > 0) {
            groups.set('bottom', [...bottomItems]);
        }
        const zoneEntries = [...groups.entries()];
        const topGroup = zoneEntries.filter(([z]) => z === 'top');
        const midGroup = zoneEntries.filter(([z]) => z === 'top-second');
        const bottomGroup = zoneEntries.filter(([z]) => z === 'bottom');
        const hasNoMid = midGroup.length === 0;
        const renderGroup = ([zone, zoneItems]) => html `
      <div data-dock-zone="${zone}">
        ${zoneItems.map(item => html `
          <button
            data-dock-panel-id="${item.panelId}"
            data-dock-zone="${zone}"
            title="${item.label}"
            aria-label="${item.label}"
            aria-pressed="${this._dockState[item.panelId] ? 'true' : 'false'}"
            ?data-active="${this._dockState[item.panelId]}"
            @click="${() => this.togglePanel(item.panelId)}"
          >${item.icon}</button>
        `)}
      </div>
    `;
        return html `
      <div class="dock-bar dock-bar-${side}"
           data-component-type="dock-bar"
           data-component-props=${JSON.stringify({ side })}
           role="toolbar"
           aria-label="${side.charAt(0).toUpperCase() + side.slice(1)} dock bar"
           aria-orientation="${orientation}">
        ${topGroup.map((g) => renderGroup(g))}
        ${midGroup.length > 0 ? html `<div style="border-top: 1px solid var(--pages-neutral-5, #555); margin: 4px 0; align-self: stretch;"></div>${midGroup.map((g) => renderGroup(g))}` : hasNoMid && orientation === 'vertical' ? html `<div style="border-top: 1px solid var(--pages-neutral-5, #555); margin: 4px 0; align-self: stretch; opacity: 0.4;"></div><div data-dock-zone="top-second" data-dock-empty="" style="flex: 1; min-height: 24px;"></div>` : nothing}
        ${bottomGroup.length > 0 ? html `<div data-dock-spacer style="flex: 1; min-height: 8px;"></div>${bottomGroup.map((g) => renderGroup(g))}` : nothing}
      </div>
    `;
    }
    _renderPanelContainers(items) {
        return html `${items.map(item => html `
      <div data-component-id="${item.panelId}"
           ?data-deferred="${!this._renderedPanels.has(item.panelId)}"
           style="display: ${this._dockState[item.panelId] ? '' : 'none'}; flex: 1; min-height: 0;"></div>
    `)}`;
    }
    _getZoneSplitRatio(side) {
        return this._zoneSplitRatios[side] ?? 50;
    }
    _handleZoneSplitStart(side, e) {
        e.preventDefault();
        this._resizing = `zone:${side}`;
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    _handleZoneSplitMove(side, e) {
        if (this._resizing !== `zone:${side}`)
            return;
        const zone = this.querySelector(`.dock-zone-${side}`);
        if (!zone)
            return;
        const rect = zone.getBoundingClientRect();
        const pct = ((e.clientY - rect.top) / rect.height) * 100;
        this._zoneSplitRatios = { ...this._zoneSplitRatios, [side]: Math.max(10, Math.min(90, pct)) };
    }
    _handleZoneSplitEnd(e) {
        if (!this._resizing?.startsWith('zone:'))
            return;
        this._resizing = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        this._scheduleSave();
    }
    _renderSideZonePanels(items, side) {
        const topItems = items.filter(i => (i.zone ?? 'top') === 'top');
        const secondItems = items.filter(i => (i.zone ?? 'top') !== 'top');
        if (secondItems.length === 0) {
            return this._renderPanelContainers(items);
        }
        const topActive = this._anySideActive(topItems);
        const secondActive = this._anySideActive(secondItems);
        const ratio = this._getZoneSplitRatio(side);
        const bothActive = topActive && secondActive;
        const topFlex = bothActive ? `flex: 0 0 ${ratio}%` : 'flex: 1';
        const botFlex = bothActive ? `flex: 0 0 ${100 - ratio}%` : 'flex: 1';
        return html `
      <div style="${topFlex}; min-height: 0; overflow: auto; display: ${secondActive && !topActive ? 'none' : 'flex'}; flex-direction: column;">
        ${this._renderPanelContainers(topItems)}
      </div>
      <div data-zone-separator style="height: 4px; background: transparent; flex-shrink: 0; cursor: row-resize; touch-action: none; display: ${bothActive ? '' : 'none'};"
           @pointerdown="${(e) => this._handleZoneSplitStart(side, e)}"
           @pointermove="${(e) => this._handleZoneSplitMove(side, e)}"
           @pointerup="${(e) => this._handleZoneSplitEnd(e)}"></div>
      <div style="${botFlex}; min-height: 0; overflow: auto; display: ${topActive && !secondActive ? 'none' : 'flex'}; flex-direction: column;">
        ${this._renderPanelContainers(secondItems)}
      </div>
    `;
    }
    _handleResizeStart(zone, e) {
        e.preventDefault();
        this._resizing = zone;
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    _handleResizeMove(zone, e) {
        if (this._resizing !== zone)
            return;
        const rect = this.getBoundingClientRect();
        let pct;
        if (zone === 'left')
            pct = ((e.clientX - rect.left) / rect.width) * 100;
        else if (zone === 'right')
            pct = ((rect.right - e.clientX) / rect.width) * 100;
        else
            pct = ((rect.bottom - e.clientY) / rect.height) * 100;
        pct = Math.max(5, Math.min(50, pct));
        this._splitSizes = { ...this._splitSizes, [zone]: pct };
    }
    _handleResizeEnd(e) {
        if (!this._resizing)
            return;
        this._resizing = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        this._scheduleSave();
    }
    _anySideActive(panels) {
        if (!panels)
            return false;
        return panels.some(p => this._dockState[p.panelId]);
    }
    _partitionBottomPanels() {
        if (!this.bottomPanels || this.bottomPanels.length === 0)
            return { leftBottom: [], rightBottom: [] };
        const leftBottom = [];
        const rightBottom = [];
        for (const item of this.bottomPanels) {
            const zone = this.zoneMap?.get(item.panelId);
            if (zone && zone.startsWith('bottom-right')) {
                rightBottom.push(item);
            }
            else {
                leftBottom.push(item);
            }
        }
        return { leftBottom, rightBottom };
    }
    render() {
        const hasLeft = this.leftPanels && this.leftPanels.length > 0;
        const hasRight = this.rightPanels && this.rightPanels.length > 0;
        const hasBottom = this.bottomPanels && this.bottomPanels.length > 0;
        const leftActive = this._anySideActive(this.leftPanels);
        const rightActive = this._anySideActive(this.rightPanels);
        const bottomActive = this._anySideActive(this.bottomPanels);
        const { leftBottom, rightBottom } = this._partitionBottomPanels();
        const hasLeftBar = hasLeft || leftBottom.length > 0;
        const hasRightBar = hasRight || rightBottom.length > 0;
        return html `
      <div class="dock-layout">
        <div class="dock-main">
          ${hasLeftBar ? html `
            ${this._renderDockBar(this.leftPanels ?? [], 'vertical', 'left', leftBottom.length > 0 ? leftBottom : undefined)}
            ${hasLeft ? html `
              <div class="resize-handle resize-left"
                   role="separator" aria-orientation="vertical"
                   aria-valuenow="${this._splitSizes.left}"
                   style="display: ${leftActive ? '' : 'none'}"
                   @pointerdown="${(e) => this._handleResizeStart('left', e)}"
                   @pointermove="${(e) => this._handleResizeMove('left', e)}"
                   @pointerup="${(e) => this._handleResizeEnd(e)}"></div>
              <div class="dock-zone dock-zone-left" role="region" aria-label="Left panel"
                   style="width: ${this._splitSizes.left}%; display: ${leftActive ? 'flex' : 'none'}; flex-direction: column;">
                ${this._renderSideZonePanels(this.leftPanels, 'left')}
              </div>
            ` : nothing}
          ` : nothing}

          <div class="dock-zone dock-zone-centre" role="main"></div>

          ${hasRightBar ? html `
            ${hasRight ? html `
              <div class="resize-handle resize-right"
                   role="separator" aria-orientation="vertical"
                   aria-valuenow="${this._splitSizes.right}"
                   style="display: ${rightActive ? '' : 'none'}"
                   @pointerdown="${(e) => this._handleResizeStart('right', e)}"
                   @pointermove="${(e) => this._handleResizeMove('right', e)}"
                   @pointerup="${(e) => this._handleResizeEnd(e)}"></div>
              <div class="dock-zone dock-zone-right" role="region" aria-label="Right panel"
                   style="width: ${this._splitSizes.right}%; display: ${rightActive ? 'flex' : 'none'}; flex-direction: column;">
                ${this._renderSideZonePanels(this.rightPanels, 'right')}
              </div>
            ` : nothing}
            ${this._renderDockBar(this.rightPanels ?? [], 'vertical', 'right', rightBottom.length > 0 ? rightBottom : undefined)}
          ` : nothing}
        </div>

        ${hasBottom ? html `
          <div class="resize-handle resize-bottom"
               role="separator" aria-orientation="horizontal"
               aria-valuenow="${this._splitSizes.bottom}"
               style="display: ${bottomActive ? '' : 'none'}"
               @pointerdown="${(e) => this._handleResizeStart('bottom', e)}"
               @pointermove="${(e) => this._handleResizeMove('bottom', e)}"
               @pointerup="${(e) => this._handleResizeEnd(e)}"></div>
          <div class="dock-zone dock-zone-bottom" role="region" aria-label="Bottom panel"
               style="height: ${this._splitSizes.bottom}%; display: ${bottomActive ? '' : 'none'}; flex-direction: row;">
            ${leftBottom.length > 0 && rightBottom.length > 0 ? html `
              <div style="flex: 1; min-width: 0; display: ${this._anySideActive(rightBottom) && !this._anySideActive(leftBottom) ? 'none' : 'flex'}; flex-direction: column;">
                ${this._renderPanelContainers(leftBottom)}
              </div>
              <div data-bottom-separator style="width: 1px; background: var(--pages-neutral-5, #555); flex-shrink: 0; display: ${this._anySideActive(leftBottom) && this._anySideActive(rightBottom) ? '' : 'none'};"></div>
              <div style="flex: 1; min-width: 0; display: ${this._anySideActive(leftBottom) && !this._anySideActive(rightBottom) ? 'none' : 'flex'}; flex-direction: column;">
                ${this._renderPanelContainers(rightBottom)}
              </div>
            ` : html `${this._renderPanelContainers(this.bottomPanels)}`}
          </div>
        ` : nothing}
      </div>
    `;
    }
}
__decorate([
    property({ attribute: false })
], PagesDockWorkbench.prototype, "leftPanels", void 0);
__decorate([
    property({ attribute: false })
], PagesDockWorkbench.prototype, "rightPanels", void 0);
__decorate([
    property({ attribute: false })
], PagesDockWorkbench.prototype, "bottomPanels", void 0);
__decorate([
    property({ attribute: false })
], PagesDockWorkbench.prototype, "layoutStore", void 0);
__decorate([
    property({ attribute: 'persist-key' })
], PagesDockWorkbench.prototype, "persistKey", void 0);
__decorate([
    property({ attribute: false })
], PagesDockWorkbench.prototype, "renderContent", void 0);
__decorate([
    property({ attribute: false })
], PagesDockWorkbench.prototype, "renderCentre", void 0);
__decorate([
    property({ attribute: false })
], PagesDockWorkbench.prototype, "zoneMap", void 0);
__decorate([
    property({ type: Number, attribute: 'min-panel-pct' })
], PagesDockWorkbench.prototype, "minPanelPct", void 0);
__decorate([
    property({ type: Number, attribute: 'max-panel-pct' })
], PagesDockWorkbench.prototype, "maxPanelPct", void 0);
__decorate([
    state()
], PagesDockWorkbench.prototype, "_dockState", void 0);
__decorate([
    state()
], PagesDockWorkbench.prototype, "_splitSizes", void 0);
__decorate([
    state()
], PagesDockWorkbench.prototype, "_zoneSplitRatios", void 0);
__decorate([
    state()
], PagesDockWorkbench.prototype, "_resizing", void 0);
if (!customElements.get('pages-dock-workbench')) {
    customElements.define('pages-dock-workbench', PagesDockWorkbench);
}
//# sourceMappingURL=pages-dock-workbench.js.map