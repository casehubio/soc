import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type {
  NavigationState,
  BreadcrumbEntry,
  EntityTypeRegistration,
  EntitySelection,
  EntityEvent,
} from './types.js';

export class NavigationController implements ReactiveController {
  private _state: NavigationState;
  private readonly _typeMap: Map<string, EntityTypeRegistration>;

  constructor(
    private readonly host: ReactiveControllerHost,
    entityTypes: readonly EntityTypeRegistration[],
  ) {
    this._typeMap = new Map(entityTypes.map(t => [t.type, t]));
    this._state = {
      currentEntityType: entityTypes[0]?.type ?? '',
      selectedEntityId: null,
      viewMode: 'list',
      breadcrumbs: [],
      availableEntityTypes: entityTypes,
    };
    host.addController(this);
  }

  get state(): Readonly<NavigationState> {
    return this._state;
  }

  hostConnected(): void {}
  hostDisconnected(): void {}

  selectEntityType(type: string): void {
    this._state = {
      ...this._state,
      currentEntityType: type,
      selectedEntityId: null,
      viewMode: 'list',
      breadcrumbs: [],
    };
    this.host.requestUpdate();
  }

  selectEntity(selection: EntitySelection): void {
    this._state = {
      ...this._state,
      selectedEntityId: selection.id,
    };
    this.host.requestUpdate();
  }

  drillDown(entityType: string, entityId: string, label: string): void {
    const currentReg = this._typeMap.get(this._state.currentEntityType);
    const breadcrumb: BreadcrumbEntry = {
      entityType: this._state.currentEntityType,
      entityId: this._state.selectedEntityId ?? '',
      label: currentReg?.label ?? this._state.currentEntityType,
      listEndpoint: currentReg?.listEndpoint ?? '',
    };

    this._state = {
      ...this._state,
      currentEntityType: entityType,
      selectedEntityId: entityId,
      breadcrumbs: [...this._state.breadcrumbs, breadcrumb],
    };
    this.host.requestUpdate();
  }

  navigateBack(breadcrumbIndex: number): void {
    const target = this._state.breadcrumbs[breadcrumbIndex];
    if (!target) return;

    this._state = {
      ...this._state,
      currentEntityType: target.entityType,
      selectedEntityId: target.entityId,
      breadcrumbs: this._state.breadcrumbs.slice(0, breadcrumbIndex),
    };
    this.host.requestUpdate();
  }

  setViewMode(mode: 'list' | 'tree'): void {
    this._state = {
      ...this._state,
      viewMode: mode,
    };
    this.host.requestUpdate();
  }

  handleEntityEvent(event: EntityEvent): boolean {
    if (event.entityId === this._state.selectedEntityId) {
      this.host.requestUpdate();
      return true;
    }
    return false;
  }

  getRegistration(type: string): EntityTypeRegistration | undefined {
    return this._typeMap.get(type);
  }
}
