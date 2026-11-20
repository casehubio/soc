var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import {} from 'lit';
import { state } from 'lit/decorators.js';
export function RovingTabindexMixin(Base) {
    class RovingTabindexHost extends Base {
        constructor() {
            super(...arguments);
            this.rovingIndex = -1;
            this._handleRovingKeydown = (e) => {
                const dir = this.rovingDirection;
                switch (e.key) {
                    case 'ArrowDown':
                        if (dir === 'vertical' || dir === 'both') {
                            e.preventDefault();
                            this.navigateRoving('next');
                        }
                        break;
                    case 'ArrowUp':
                        if (dir === 'vertical' || dir === 'both') {
                            e.preventDefault();
                            this.navigateRoving('prev');
                        }
                        break;
                    case 'ArrowRight':
                        if (dir === 'horizontal' || dir === 'both') {
                            e.preventDefault();
                            this.navigateRoving('next');
                        }
                        break;
                    case 'ArrowLeft':
                        if (dir === 'horizontal' || dir === 'both') {
                            e.preventDefault();
                            this.navigateRoving('prev');
                        }
                        break;
                    case 'Home':
                        e.preventDefault();
                        this.navigateRoving('first');
                        break;
                    case 'End':
                        e.preventDefault();
                        this.navigateRoving('last');
                        break;
                }
            };
            this._handleRovingFocusin = () => {
                if (this.rovingIndex === -1) {
                    this.rovingIndex = 0;
                    this._updateTabindices();
                }
            };
        }
        get _rovingItems() {
            return Array.from(this.shadowRoot?.querySelectorAll(this.rovingSelector) ?? []);
        }
        connectedCallback() {
            super.connectedCallback();
            this.addEventListener('keydown', this._handleRovingKeydown);
            this.addEventListener('focusin', this._handleRovingFocusin);
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            this.removeEventListener('keydown', this._handleRovingKeydown);
            this.removeEventListener('focusin', this._handleRovingFocusin);
        }
        navigateRoving(direction) {
            const items = this._rovingItems;
            if (items.length === 0)
                return;
            switch (direction) {
                case 'next':
                    this.rovingIndex = (this.rovingIndex + 1) % items.length;
                    break;
                case 'prev':
                    this.rovingIndex = (this.rovingIndex - 1 + items.length) % items.length;
                    break;
                case 'first':
                    this.rovingIndex = 0;
                    break;
                case 'last':
                    this.rovingIndex = items.length - 1;
                    break;
            }
            this._updateTabindices();
            items[this.rovingIndex]?.focus();
        }
        _updateTabindices() {
            for (const [i, item] of this._rovingItems.entries()) {
                item.setAttribute('tabindex', i === this.rovingIndex ? '0' : '-1');
            }
        }
    }
    __decorate([
        state()
    ], RovingTabindexHost.prototype, "rovingIndex", void 0);
    return RovingTabindexHost;
}
//# sourceMappingURL=roving-tabindex.js.map